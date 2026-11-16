import {
  mkdir,
  readFile,
  writeFile,
  rename,
  rm,
  lstat,
  open,
  unlink,
} from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { resolve, dirname, basename } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import {
  DatasetManifestSchema,
  TrialSchema,
} from "../packages/shared/src/index.js";
import { hash } from "./prepare-trials.js";

const ReviewSchema = z
  .object({
    trialId: z.string().min(1),
    status: z.enum([
      "draft",
      "needs_manual_split",
      "pending_review",
      "approved",
      "rejected",
    ]),
    reviewer: z.string().min(1).optional(),
    reviewedAt: z.string().datetime({ offset: true }).optional(),
    sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
    rulesHash: z.string().regex(/^[a-f0-9]{64}$/),
    rulesVersion: z.string().min(1),
    notes: z.string().optional(),
  })
  .strict();
const DraftSchema = z
  .object({ trialId: z.string().min(1), criteria: z.array(z.unknown()) })
  .strict();
const args = (argv: string[]) => {
  const out = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (!key?.startsWith("--") || !argv[i + 1] || argv[i + 1]!.startsWith("--"))
      throw new Error("Očekivani su --input, --draft, --reviews i --output.");
    out.set(key, argv[++i]!);
  }
  return out;
};
export async function compileRules(
  inputPath: string,
  draftPath: string,
  reviewPath: string,
  outputPath: string,
): Promise<void> {
  const imported: unknown = JSON.parse(await readFile(inputPath, "utf8"));
  const rawDraft: unknown = JSON.parse(await readFile(draftPath, "utf8"));
  const rawReviews: unknown = JSON.parse(await readFile(reviewPath, "utf8"));
  const importedSchema = z
    .object({
      manifest: DatasetManifestSchema,
      trials: TrialSchema.array(),
      sources: z.array(
        z.object({
          trialId: z.string(),
          sourceId: z.string(),
          text: z.string(),
          sourceHash: z.string(),
          location: z.string(),
          kind: z.string(),
        }),
      ),
    })
    .passthrough();
  const data = importedSchema.parse(imported);
  const drafts = DraftSchema.array().parse(rawDraft);
  const reviews = ReviewSchema.array().parse(rawReviews);
  if (new Set(reviews.map((r) => r.trialId)).size !== reviews.length)
    throw new Error("Pregledi sadrže duplikat studije.");
  const reviewed: unknown[] = [];
  const approvals: Array<{
    trialId: string;
    reviewer: string;
    reviewedAt: string;
    sourceHash: string;
    rulesHash: string;
    rulesVersion: string;
  }> = [];
  const excluded: Array<{ trialId: string; status: string; reason: string }> =
    [];
  for (const draft of drafts) {
    const trial = data.trials.find((t) => t.trialId === draft.trialId);
    const review = reviews.find((r) => r.trialId === draft.trialId);
    if (!trial || !review) {
      excluded.push({
        trialId: draft.trialId,
        status: "pending_review",
        reason: "Nedostaje studija ili pregled.",
      });
      continue;
    }
    const criteria = z
      .array(TrialSchema.shape.criteria.element)
      .parse(draft.criteria);
    if (criteria.length === 0) {
      excluded.push({
        trialId: draft.trialId,
        status: review.status,
        reason:
          "Studija nema nijedan izdvojen kriterijum; ne može biti kandidat.",
      });
      continue;
    }
    if (
      criteria.some(
        (c) =>
          c.trialId !== draft.trialId ||
          !data.sources.some(
            (s) =>
              s.trialId === c.trialId &&
              s.sourceId === c.sourceId &&
              s.text.includes(c.sourceQuote) &&
              s.sourceHash === hash(s.text),
          ),
      )
    )
      throw new Error(`Izvor ili citat nije validan za ${draft.trialId}.`);
    const rulesHash = hash(JSON.stringify(criteria));
    const sourceHash = hash(
      JSON.stringify(
        data.sources
          .filter((s) => s.trialId === draft.trialId)
          .map((s) => s.sourceHash),
      ),
    );
    const approved =
      review.status === "approved" &&
      Boolean(review.reviewer?.trim()) &&
      Boolean(review.reviewedAt) &&
      review.rulesHash === rulesHash &&
      review.sourceHash === sourceHash;
    if (!approved) {
      excluded.push({
        trialId: draft.trialId,
        status: review.status,
        reason:
          "Pravilo nije odobreno ili hash pregledanih pravila/izvora ne odgovara.",
      });
      continue;
    }
    reviewed.push(
      TrialSchema.parse({ ...trial, criteria, dataVersion: rulesHash }),
    );
    approvals.push({
      trialId: draft.trialId,
      reviewer: review.reviewer!,
      reviewedAt: review.reviewedAt!,
      sourceHash,
      rulesHash,
      rulesVersion: review.rulesVersion,
    });
  }
  if (reviewed.length === 0)
    throw new Error("Nema odobrenih studija za objavljeni paket.");
  const packageHash = hash(
    JSON.stringify({ sourceHash: data.manifest.sourceHash, approvals }),
  );
  const manifest = DatasetManifestSchema.parse({
    ...data.manifest,
    name: "lokalni-pregledani-korpus",
    version: `rules-${packageHash.slice(0, 12)}`,
    synthetic: false,
    transformations: `${data.manifest.transformations}; lokalni compile:rules; bez generisanja modelom`,
    limitations: [
      ...data.manifest.limitations,
      "Nepregledana pravila ne ulaze u matcher.",
    ],
    includedCount: reviewed.length,
    rulesVersion: "1",
  });
  const output = resolve(outputPath);
  const parent = dirname(output);
  await mkdir(parent, { recursive: true });
  const lockPath = resolve(parent, `.${basename(output)}.compile-lock`);
  const lock = await open(lockPath, "wx");
  await lock.close();
  try {
    try {
      await lstat(output);
      throw new Error("Izlaz već postoji; ne prepisujem paket.");
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        // The atomic rename below may claim this destination.
      } else throw error;
    }
    const temp = resolve(parent, `.${randomUUID()}.rules-package`);
    await mkdir(temp);
    try {
      await writeFile(
        resolve(temp, "manifest.json"),
        JSON.stringify(manifest, null, 2) + "\n",
        { flag: "wx" },
      );
      await writeFile(
        resolve(temp, "trials.json"),
        JSON.stringify(reviewed, null, 2) + "\n",
        { flag: "wx" },
      );
      await writeFile(
        resolve(temp, "review-report.json"),
        JSON.stringify({ included: approvals, excluded }, null, 2) + "\n",
        { flag: "wx" },
      );
      await rename(temp, output);
    } catch (error) {
      await rm(temp, { recursive: true, force: true });
      throw error;
    }
  } finally {
    await unlink(lockPath);
  }
}
if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  const values = args(process.argv.slice(2));
  for (const key of ["--input", "--draft", "--reviews", "--output"])
    if (!values.has(key)) throw new Error(`Nedostaje ${key}.`);
  await compileRules(
    resolve(values.get("--input")!),
    resolve(values.get("--draft")!),
    resolve(values.get("--reviews")!),
    resolve(values.get("--output")!),
  );
}
