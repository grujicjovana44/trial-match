import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { ImportSchema, writeNewJson } from "./prepare-trials.js";
import { ReviewDraftSchema } from "./split-trials.js";

const InputFormatSchema = z.object({ format: z.string().min(1) }).passthrough();
const RuleDraftRecordSchema = z
  .object({ trialId: z.string().min(1), criteria: z.array(z.unknown()) })
  .strict();

const usage =
  "Upotreba: pnpm rules:draft --input <data-prepare-ili-data-split.json> --output <novi-rules-draft.json>.";

export interface RuleDraftArgs {
  input: string;
  output: string;
}

export interface RuleDraftResult {
  drafts: z.infer<typeof RuleDraftRecordSchema>[];
  omittedTrialIds: string[];
}

export function parseRuleDraftArgs(argv: string[]): RuleDraftArgs {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index++) {
    const key = argv[index];
    const value = argv[index + 1];
    if (
      !key?.startsWith("--") ||
      !["--input", "--output"].includes(key) ||
      !value ||
      value.startsWith("--") ||
      values.has(key)
    )
      throw new Error(usage);
    values.set(key, value);
    index++;
  }

  const input = values.get("--input");
  const output = values.get("--output");
  if (!input || !output || values.size !== 2) throw new Error(usage);
  return { input, output };
}

function zodMessage(error: z.ZodError): string {
  const shown = error.issues.slice(0, 8);
  const details = shown
    .map((issue) => {
      const path = issue.path.length ? issue.path.join(".") : "(koren)";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
  const remaining = error.issues.length - shown.length;
  return remaining > 0 ? `${details}; ... i još ${remaining} grešaka` : details;
}

function isNodeError(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

const matcherFields = ["field", "operator", "value", "unit"] as const;

function addBlankMatcherFields(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("Kriterijum mora biti JSON objekat.");

  const criterion: Record<string, unknown> = { ...value };
  for (const field of matcherFields) {
    if (Object.prototype.hasOwnProperty.call(criterion, field)) continue;
    criterion[field] = field === "value" ? null : "";
  }
  return criterion;
}

function addMatcherPlaceholders(
  drafts: RuleDraftResult["drafts"],
): RuleDraftResult["drafts"] {
  return drafts.map((draft) => ({
    trialId: draft.trialId,
    criteria: draft.criteria.map(addBlankMatcherFields),
  }));
}

interface SourceReference {
  trialId: string;
  sourceId: string;
  text: string;
}

interface SourceCriterion {
  trialId: string;
  sourceId: string;
  sourceQuote: string;
}

interface InputStudy {
  trialId: string;
  criteria: SourceCriterion[];
}

function validateOwnershipAndCitations(
  studies: InputStudy[],
  sources: SourceReference[],
): void {
  if (new Set(studies.map((study) => study.trialId)).size !== studies.length)
    throw new Error("Ulaz sadrži duplikat trialId studije.");

  for (const study of studies) {
    for (const criterion of study.criteria) {
      if (criterion.trialId !== study.trialId)
        throw new Error(
          `Kriterijum ${criterion.sourceId} nema isti trialId kao studija ${study.trialId}.`,
        );
      const matchingSources = sources.filter(
        (source) => source.sourceId === criterion.sourceId,
      );
      const source = matchingSources.find(
        (candidate) => candidate.trialId === study.trialId,
      );
      if (!source) {
        throw new Error(
          `sourceId ${criterion.sourceId} ne pripada studiji ${study.trialId}.`,
        );
      }
      if (!source.text.includes(criterion.sourceQuote))
        throw new Error(
          `sourceQuote kriterijuma ${criterion.sourceId} nije doslovni podniz izvora za ${study.trialId}.`,
        );
    }
  }
}

function toRuleDraft(raw: unknown): RuleDraftResult {
  const tagged = InputFormatSchema.safeParse(raw);
  if (!tagged.success)
    throw new Error("Ulaz mora biti JSON objekat sa podržanim poljem format.");

  let studies: InputStudy[];
  let sources: SourceReference[];
  switch (tagged.data.format) {
    case "trialmatch-import-v2": {
      const parsed = ImportSchema.safeParse(raw);
      if (!parsed.success)
        throw new Error(
          `Nevažeći trialmatch-import-v2 ulaz: ${zodMessage(parsed.error)}`,
        );
      studies = parsed.data.trials;
      sources = parsed.data.sources;
      break;
    }
    case "trialmatch-review-draft-v1": {
      const parsed = ReviewDraftSchema.safeParse(raw);
      if (!parsed.success)
        throw new Error(
          `Nevažeći trialmatch-review-draft-v1 ulaz: ${zodMessage(parsed.error)}`,
        );
      studies = parsed.data.trials;
      sources = parsed.data.sources;
      break;
    }
    default:
      throw new Error(`Nepodržan ulazni format: ${tagged.data.format}.`);
  }

  validateOwnershipAndCitations(studies, sources);

  const drafts: RuleDraftResult["drafts"] = [];
  const omittedTrialIds: string[] = [];
  for (const study of studies) {
    if (study.criteria.length === 0) {
      omittedTrialIds.push(study.trialId);
      continue;
    }
    drafts.push(
      RuleDraftRecordSchema.parse({
        trialId: study.trialId,
        criteria: study.criteria,
      }),
    );
  }

  if (drafts.length === 0) {
    const omitted = omittedTrialIds.length
      ? ` Izostavljeno ${omittedTrialIds.length}: ${omittedTrialIds.join(", ")}.`
      : "";
    throw new Error(
      `Nijedna studija nema kriterijume; rules:draft nije napravio izlaz.${omitted}`,
    );
  }

  return { drafts, omittedTrialIds };
}

export async function createRuleDraft(
  inputPath: string,
  outputPath: string,
): Promise<RuleDraftResult> {
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(inputPath, "utf8")) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError)
      throw new Error(`Ulaz nije ispravan JSON: ${error.message}`);
    throw error;
  }

  const result = toRuleDraft(raw);
  const outputDrafts = addMatcherPlaceholders(result.drafts);
  try {
    await writeNewJson(resolve(outputPath), outputDrafts);
  } catch (error) {
    if (isNodeError(error, "EEXIST"))
      throw new Error("Izlazna putanja već postoji; ne prepisujem fajl.");
    throw error;
  }
  return { ...result, drafts: outputDrafts };
}

async function main(): Promise<void> {
  const args = parseRuleDraftArgs(process.argv.slice(2));
  const result = await createRuleDraft(args.input, args.output);
  console.log(
    JSON.stringify(
      {
        output: resolve(args.output),
        createdStudyCount: result.drafts.length,
        omittedStudyCount: result.omittedTrialIds.length,
        omittedTrialIds: result.omittedTrialIds,
      },
      null,
      2,
    ),
  );
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
