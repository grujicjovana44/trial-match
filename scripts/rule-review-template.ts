import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import {
  CriterionFieldSchema,
  TrialSchema,
} from "../packages/shared/src/index.js";
import { ImportSchema, hash } from "./prepare-trials.js";
import { ReviewDraftCriterionSchema } from "./split-trials.js";

const DraftSchema = z
  .object({ trialId: z.string().min(1), criteria: z.array(z.unknown()) })
  .strict();

interface ReviewTemplateRecord {
  trialId: string;
  status: "pending_review";
  reviewer: "";
  reviewedAt: string;
  sourceHash: string;
  rulesHash: string;
  rulesVersion: string;
}

const ReviewDraftOperatorSchema = z.enum([
  "gte",
  "lte",
  "between",
  "eq",
  "in",
  "not_in",
  "is_true",
  "is_false",
]);
const ReviewDraftValueSchema = z.union([
  z.number(),
  z.boolean(),
  z.string(),
  z.array(z.union([z.number(), z.string()])),
]);
const StructuredReviewDraftCriterionSchema = ReviewDraftCriterionSchema.extend({
  field: CriterionFieldSchema,
  operator: ReviewDraftOperatorSchema,
  value: ReviewDraftValueSchema,
  unit: z.string().min(1).optional(),
}).strict();

export async function writeReviewTemplate(
  inputPath: string,
  draftPath: string,
  outputPath: string,
): Promise<void> {
  const imported = ImportSchema.parse(
    JSON.parse(await readFile(inputPath, "utf8")),
  );
  const drafts = DraftSchema.array().parse(
    JSON.parse(await readFile(draftPath, "utf8")),
  );
  if (new Set(drafts.map((draft) => draft.trialId)).size !== drafts.length)
    throw new Error("Draft sadrži duplikat trialId.");
  const createdAt = new Date().toISOString();
  const template: ReviewTemplateRecord[] = drafts.map((draft) => {
    if (!imported.trials.some((trial) => trial.trialId === draft.trialId))
      throw new Error(`Studija ${draft.trialId} nije u uvozu.`);
    const criteria = z
      .array(
        z.union([
          TrialSchema.shape.criteria.element,
          ReviewDraftCriterionSchema,
          StructuredReviewDraftCriterionSchema,
        ]),
      )
      .parse(draft.criteria);
    if (criteria.length === 0)
      throw new Error(`Studija ${draft.trialId} nema izdvojena pravila.`);
    const sources = imported.sources.filter(
      (source) => source.trialId === draft.trialId,
    );
    if (
      criteria.some(
        (criterion) =>
          criterion.trialId !== draft.trialId ||
          !sources.some(
            (source) =>
              source.sourceId === criterion.sourceId &&
              source.sourceHash === hash(source.text) &&
              source.text.includes(criterion.sourceQuote),
          ),
      )
    )
      throw new Error(`Izvor ili citat nije validan za ${draft.trialId}.`);
    const sourceHashes = sources.map((source) => source.sourceHash);
    return {
      trialId: draft.trialId,
      status: "pending_review" as const,
      reviewer: "",
      reviewedAt: createdAt,
      sourceHash: hash(JSON.stringify(sourceHashes)),
      rulesHash: hash(JSON.stringify(criteria)),
      rulesVersion: "1",
    };
  });
  const output = resolve(outputPath);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(template, null, 2)}\n`, {
    flag: "wx",
  });
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  const args = process.argv.slice(2);
  const values = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    const value = args[i + 1];
    if (
      !key?.startsWith("--") ||
      !value ||
      value.startsWith("--") ||
      values.has(key)
    )
      throw new Error(
        "Upotreba: rules:review-template --input <uvoz.json> --draft <draft.json> --output <novi-reviews.json>.",
      );
    values.set(key, value);
    i++;
  }
  const input = values.get("--input");
  const draft = values.get("--draft");
  const output = values.get("--output");
  if (!input || !draft || !output || values.size !== 3)
    throw new Error(
      "Upotreba: rules:review-template --input <uvoz.json> --draft <draft.json> --output <novi-reviews.json>.",
    );
  await writeReviewTemplate(resolve(input), resolve(draft), resolve(output));
}
