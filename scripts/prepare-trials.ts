import { mkdir, readFile, writeFile, link, unlink } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import {
  DatasetManifestSchema,
  TrialSchema,
} from "../packages/shared/src/index.js";

export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const SourceSchema = z
  .object({
    trialId: z.string().regex(/^NCT\d{8}$/),
    sourceId: z.string().min(1),
    text: z.string().min(1),
    sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
    location: z.string().min(1),
    kind: z.enum(["inclusion", "exclusion", "unsplit"]),
  })
  .strict();
export const ImportSchema = z
  .object({
    format: z.literal("trialmatch-import-v2"),
    sourceHash: z.string(),
    manifest: DatasetManifestSchema,
    trials: TrialSchema.array(),
    sources: SourceSchema.array(),
    report: z
      .object({
        total: z.number().int(),
        accepted: z.array(z.string()),
        problems: z.array(
          z.object({ index: z.number().int(), reason: z.string() }).strict(),
        ),
        needsManualSplit: z.array(z.string()),
        unknownMetadata: z.array(z.string()),
        hasNextPage: z.boolean(),
      })
      .strict(),
  })
  .strict();
const RawStudySchema = z.object({
  protocolSection: z.object({
    identificationModule: z.object({
      nctId: z.string().regex(/^NCT\d{8}$/i),
      briefTitle: z.string().min(1),
    }),
    statusModule: z.object({ overallStatus: z.string().min(1) }).optional(),
    conditionsModule: z.object({ conditions: z.array(z.string()) }).optional(),
    designModule: z
      .object({ phases: z.array(z.string()).optional() })
      .optional(),
    eligibilityModule: z.object({
      eligibilityCriteria: z.string().min(1),
      minimumAge: z.string().optional(),
      maximumAge: z.string().optional(),
      sex: z.string().optional(),
    }),
    contactsLocationsModule: z
      .object({
        locations: z
          .array(
            z.object({
              country: z.string().optional(),
              city: z.string().optional(),
              facility: z.string().optional(),
            }),
          )
          .optional(),
      })
      .optional(),
  }),
});
const knownRawKeys: Record<string, ReadonlySet<string>> = {
  "": new Set(["protocolSection"]),
  protocolSection: new Set([
    "identificationModule",
    "statusModule",
    "conditionsModule",
    "designModule",
    "eligibilityModule",
    "contactsLocationsModule",
  ]),
  "protocolSection.identificationModule": new Set(["nctId", "briefTitle"]),
  "protocolSection.statusModule": new Set(["overallStatus"]),
  "protocolSection.conditionsModule": new Set(["conditions"]),
  "protocolSection.designModule": new Set(["phases"]),
  "protocolSection.eligibilityModule": new Set([
    "eligibilityCriteria",
    "minimumAge",
    "maximumAge",
    "sex",
  ]),
  "protocolSection.contactsLocationsModule": new Set(["locations"]),
  "protocolSection.contactsLocationsModule.locations[]": new Set([
    "country",
    "city",
    "facility",
  ]),
};
function collectUnknownMetadata(
  value: unknown,
  path: string,
  output: string[],
): void {
  if (Array.isArray(value)) {
    for (const item of value) collectUnknownMetadata(item, `${path}[]`, output);
    return;
  }
  if (typeof value !== "object" || value === null) return;
  const allowed = knownRawKeys[path] ?? new Set<string>();
  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    if (!allowed.has(key)) {
      output.push(childPath);
      continue;
    }
    collectUnknownMetadata(child, childPath, output);
  }
}
export function validateTrials(raw: unknown) {
  const trials = TrialSchema.array().parse(raw);
  if (new Set(trials.map((t) => t.trialId)).size !== trials.length)
    throw new Error("Ulaz sadrži ponovljene identifikatore studija.");
  for (const trial of trials)
    if (trial.criteria.some((c) => c.trialId !== trial.trialId))
      throw new Error(
        `Kriterijum studije ${trial.trialId} ima neusaglašen trialId.`,
      );
  return trials;
}
export function prepareRaw(raw: unknown) {
  const envelope = z
    .object({
      studies: z.array(z.unknown()),
      nextPageToken: z.string().optional(),
    })
    .parse(raw);
  const result: z.infer<typeof ImportSchema> = {
    format: "trialmatch-import-v2",
    sourceHash: hash(JSON.stringify(raw)),
    manifest: DatasetManifestSchema.parse({
      name: "Dostavljeni CTG v2 snapshot",
      version: `raw-${hash(JSON.stringify(raw)).slice(0, 12)}`,
      date: "2026-11-12",
      origin:
        "Lokalni snapshot koji je dostavio korisnik; endpoint i query nisu potvrđeni.",
      synthetic: false,
      license: "NEPOTVRĐENO — čeka ljudsku proveru uslova korišćenja.",
      transformations:
        "Lokalni CTG v2 normalizer; izvorni criteria tekst je sačuvan.",
      limitations: [
        "nextPageToken je prisutan; potpunost paginacije nije potvrđena.",
        "Sirovi kriterijumi čekaju ručno razdvajanje i pregled.",
      ],
      downloadedCount: envelope.studies.length,
      sourceHash: hash(JSON.stringify(raw)),
    }),
    trials: [],
    sources: [],
    report: {
      total: envelope.studies.length,
      accepted: [],
      problems: [],
      needsManualSplit: [],
      unknownMetadata: [],
      hasNextPage: Boolean(envelope.nextPageToken),
    },
  };
  const ids = new Set<string>();
  for (const [index, row] of envelope.studies.entries()) {
    const parsed = RawStudySchema.safeParse(row);
    if (!parsed.success) {
      result.report.problems.push({
        index,
        reason: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.code}`)
          .join("; "),
      });
      continue;
    }
    const p = parsed.data.protocolSection;
    const id = p.identificationModule.nctId.toUpperCase();
    if (ids.has(id)) {
      result.report.problems.push({ index, reason: `Duplikat ${id}` });
      continue;
    }
    ids.add(id);
    const text = p.eligibilityModule.eligibilityCriteria;
    // Preserve the complete original passage. Splitting and medical interpretation require review.
    const sourceId = `${id}#unsplit-1`;
    result.sources.push({
      trialId: id,
      sourceId,
      text,
      sourceHash: hash(text),
      location: "protocolSection.eligibilityModule.eligibilityCriteria",
      kind: "unsplit",
    });
    result.report.needsManualSplit.push(id);
    const phases = p.designModule?.phases ?? [];
    result.trials.push(
      TrialSchema.parse({
        trialId: id,
        title: p.identificationModule.briefTitle,
        conditions: p.conditionsModule?.conditions ?? [],
        overallStatus: p.statusModule?.overallStatus ?? null,
        phase: phases.join(", ") || null,
        phases,
        locations:
          p.contactsLocationsModule?.locations?.map((l) =>
            [l.facility, l.city, l.country].filter(Boolean).join(", "),
          ) ?? [],
        eligibilityText: text,
        criteria: [],
        dataVersion: result.sourceHash,
      }),
    );
    for (const field of ["minimumAge", "maximumAge", "sex"] as const) {
      const value = p.eligibilityModule[field];
      if (!value || value === "N/A" || value === "ALL") continue;
      const sid = `${id}#structured-${field}`;
      result.sources.push({
        trialId: id,
        sourceId: sid,
        text: value,
        sourceHash: hash(value),
        location: `protocolSection.eligibilityModule.${field}`,
        kind: "inclusion",
      });
      const age = /^(\d+) Years?$/i.exec(value);
      const criteria = result.trials.at(-1)!.criteria;
      const base = {
        id: sid,
        trialId: id,
        kind: "inclusion" as const,
        origin: "structured_field" as const,
        text: `${field}: ${value}`,
        sourceId: sid,
        sourceQuote: value,
      };
      if (field === "sex" && ["MALE", "FEMALE"].includes(value))
        criteria.push({
          ...base,
          checkability: "auto",
          field: "sex",
          operator: "eq",
          value: value.toLowerCase(),
        });
      else if (age)
        criteria.push({
          ...base,
          checkability: "auto",
          field: "age",
          operator: field === "minimumAge" ? "gte" : "lte",
          value: Number(age[1]),
          unit: "years",
        });
      else
        criteria.push({
          ...base,
          checkability: "manual_review",
          reason: "Nepodržana strukturisana vrednost ili jedinica.",
        });
    }
    collectUnknownMetadata(row, "", result.report.unknownMetadata);
    result.report.accepted.push(id);
  }
  result.report.unknownMetadata = [
    ...new Set(result.report.unknownMetadata),
  ].sort();
  return ImportSchema.parse(result);
}
export async function writeNewJson(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(data, null, 2) + "\n", { flag: "wx" });
  try {
    await link(temp, path);
  } finally {
    await unlink(temp);
  }
}
if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) throw new Error("Navedite lokalni ulaz i novi izlaz.");
  const raw: unknown = JSON.parse(await readFile(input, "utf8"));
  const prepared = Array.isArray(raw) ? validateTrials(raw) : prepareRaw(raw);
  if (!Array.isArray(prepared) && prepared.report.problems.length) {
    console.error(JSON.stringify(prepared.report, null, 2));
    process.exitCode = 1;
  } else {
    await writeNewJson(resolve(output), prepared);
    console.log(
      JSON.stringify(
        Array.isArray(prepared)
          ? { count: prepared.length }
          : {
              total: prepared.report.total,
              accepted: prepared.report.accepted.length,
              problems: prepared.report.problems,
              needsManualSplit: prepared.report.needsManualSplit.length,
              unknownMetadata: prepared.report.unknownMetadata,
              hasNextPage: prepared.report.hasNextPage,
            },
      ),
    );
  }
}
