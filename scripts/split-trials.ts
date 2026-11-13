import { readFile, lstat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { TrialSchema } from "../packages/shared/src/index.js";
import {
  ImportSchema,
  hash,
  prepareRaw,
  writeNewJson,
} from "./prepare-trials.js";

export const ReviewDraftCriterionSchema = z
  .object({
    id: z.string().regex(/^NCT\d{8}#(?:inc|exc)-\d+$/),
    trialId: z.string().regex(/^NCT\d{8}$/),
    kind: z.enum(["inclusion", "exclusion"]),
    checkability: z.literal("manual_review"),
    origin: z.literal("raw_extracted"),
    text: z.string().min(1),
    sourceId: z.string().min(1),
    sourceQuote: z.string().min(1),
    reason: z.string().min(1),
  })
  .strict();

const DraftTrialSchema = TrialSchema.omit({ criteria: true })
  .extend({
    criteria: ReviewDraftCriterionSchema.array(),
    reviewStatus: z.literal("pending_review"),
    splitStatus: z.enum(["complete", "needs_manual_split"]),
    splitReason: z.string().min(1).optional(),
  })
  .strict();

const DraftSourceSchema = z
  .object({
    trialId: z.string().regex(/^NCT\d{8}$/),
    sourceId: z.string().min(1),
    text: z.string(),
    sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
    location: z.string().min(1),
    kind: z.literal("unsplit"),
  })
  .strict();

const ProblemSchema = z
  .object({ index: z.number().int(), reason: z.string().min(1) })
  .strict();

export const ReviewDraftSchema = z
  .object({
    format: z.literal("trialmatch-review-draft-v1"),
    inputFormat: z.enum(["raw_ctg_v2", "trialmatch-import-v2"]),
    inputHash: z.string().regex(/^[a-f0-9]{64}$/),
    selection: z
      .object({
        method: z.enum(["first", "random"]),
        limit: z.number().int().positive().nullable(),
        seed: z.string().optional(),
        selectedIds: z.array(z.string().regex(/^NCT\d{8}$/)),
      })
      .strict(),
    trials: DraftTrialSchema.array(),
    sources: DraftSourceSchema.array(),
    report: z
      .object({
        totalStudyCount: z.number().int().nonnegative(),
        availableStudyCount: z.number().int().nonnegative(),
        selectedCount: z.number().int().nonnegative(),
        processedTrialIds: z.array(z.string().regex(/^NCT\d{8}$/)),
        problems: ProblemSchema.array(),
        needsManualSplit: z.array(
          z
            .object({
              trialId: z.string().regex(/^NCT\d{8}$/),
              reason: z.string().min(1),
            })
            .strict(),
        ),
        unknownMetadata: z.array(z.string()),
        hasNextPage: z.boolean(),
      })
      .strict(),
  })
  .strict();

export type SelectionMethod = "first" | "random";

export interface SplitOptions {
  input: string;
  output: string;
  limit?: number;
  selection: SelectionMethod;
  seed?: string;
}

export type SplitArgs = SplitOptions;

interface LineRange {
  start: number;
  end: number;
  breakEnd: number;
  text: string;
}

interface SectionBlock {
  kind: "inclusion" | "exclusion";
  start: number;
  end: number;
  headingLine: number;
}

interface SplitResult {
  criteria: z.infer<typeof ReviewDraftCriterionSchema>[];
  source: z.infer<typeof DraftSourceSchema>;
  splitStatus: "complete" | "needs_manual_split";
  splitReason?: string;
}

interface ImportedInput {
  data: z.infer<typeof ImportSchema>;
  inputFormat: "raw_ctg_v2" | "trialmatch-import-v2";
  inputHash: string;
  totalStudyCount: number;
}

export class SplitInputError extends Error {
  constructor(
    message: string,
    readonly report: {
      totalStudyCount: number;
      problems: z.infer<typeof ProblemSchema>[];
    },
  ) {
    super(message);
  }
}

function usageError(): Error {
  return new Error(
    "Upotreba: pnpm data:split --input <putanja> --output <nova-putanja> [--limit <N>] [--selection first|random] [--seed <vrednost>].",
  );
}

export function parseSplitArgs(argv: string[]): SplitArgs {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index++) {
    const key = argv[index];
    const value = argv[index + 1];
    if (
      !key?.startsWith("--") ||
      !["--input", "--output", "--limit", "--selection", "--seed"].includes(
        key,
      ) ||
      !value ||
      value.startsWith("--") ||
      values.has(key)
    )
      throw usageError();
    values.set(key, value);
    index++;
  }

  const input = values.get("--input");
  const output = values.get("--output");
  const selectionValue = values.get("--selection") ?? "first";
  if (
    !input ||
    !output ||
    (selectionValue !== "first" && selectionValue !== "random")
  )
    throw usageError();

  const limitValue = values.get("--limit");
  let limit: number | undefined;
  if (limitValue !== undefined) {
    if (!/^\d+$/.test(limitValue))
      throw new Error("--limit mora biti pozitivan ceo broj.");
    limit = Number(limitValue);
    if (!Number.isSafeInteger(limit) || limit <= 0)
      throw new Error("--limit mora biti pozitivan bezbedan ceo broj.");
  }

  const seed = values.get("--seed");
  if (selectionValue === "random" && (!seed || !seed.trim()))
    throw new Error("--seed je obavezan uz --selection random.");
  if (selectionValue !== "random" && seed !== undefined)
    throw new Error("--seed se koristi samo uz --selection random.");

  return {
    input,
    output,
    selection: selectionValue,
    ...(limit === undefined ? {} : { limit }),
    ...(seed === undefined ? {} : { seed }),
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNodeError(error: unknown, code: string): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === code
  );
}

function ensureUniqueImport(data: z.infer<typeof ImportSchema>): void {
  const ids = new Set<string>();
  for (const trial of data.trials) {
    if (!/^NCT\d{8}$/i.test(trial.trialId))
      throw new Error(`Nevažeći NCT ID u uvozu: ${trial.trialId}.`);
    const normalized = trial.trialId.toUpperCase();
    if (ids.has(normalized))
      throw new Error(
        `Uvoz sadrži duplikat ${normalized}; izlaz bi bio nejasan.`,
      );
    ids.add(normalized);
  }
}

function importInput(raw: unknown): ImportedInput {
  if (isObject(raw) && raw.format === "trialmatch-import-v2") {
    const data = ImportSchema.parse(raw);
    ensureUniqueImport(data);
    return {
      data,
      inputFormat: "trialmatch-import-v2",
      inputHash: hash(JSON.stringify(raw)),
      totalStudyCount: data.report.total,
    };
  }

  const data = prepareRaw(raw);
  const duplicate = data.report.problems.find((problem) =>
    /Duplikat NCT\d{8}/i.test(problem.reason),
  );
  if (duplicate)
    throw new SplitInputError(
      `Ulaz sadrži duplikat koji čini izlaz nejasnim (red ${duplicate.index + 1}: ${duplicate.reason}).`,
      {
        totalStudyCount: data.report.total,
        problems: data.report.problems,
      },
    );
  ensureUniqueImport(data);
  return {
    data,
    inputFormat: "raw_ctg_v2",
    inputHash: data.sourceHash,
    totalStudyCount: data.report.total,
  };
}

function linesOf(text: string): LineRange[] {
  const lines: LineRange[] = [];
  let start = 0;
  for (let index = 0; index < text.length; index++) {
    if (text[index] !== "\n" && text[index] !== "\r") continue;
    const end = index;
    if (text[index] === "\r" && text[index + 1] === "\n") index++;
    lines.push({
      start,
      end,
      breakEnd: index + 1,
      text: text.slice(start, end),
    });
    start = index + 1;
  }
  if (start < text.length || lines.length === 0)
    lines.push({
      start,
      end: text.length,
      breakEnd: text.length,
      text: text.slice(start),
    });
  return lines;
}

function headingKind(line: string): "inclusion" | "exclusion" | null {
  const match =
    /^\s*(?:[A-Za-z0-9][A-Za-z0-9 /,&()'’\-]*?\s+)?(inclusion|exclusion)\s+criteria(?:\s*\([^)]*\))?(?:\s*:\s*(.*))?\s*$/i.exec(
      line,
    );
  if (!match) return null;
  return match[1]?.toLowerCase() === "inclusion" ? "inclusion" : "exclusion";
}

function headingTail(line: string): string {
  const match =
    /^\s*(?:[A-Za-z0-9][A-Za-z0-9 /,&()'’\-]*?\s+)?(?:inclusion|exclusion)\s+criteria(?:\s*\([^)]*\))?(?:\s*:\s*(.*))?\s*$/i.exec(
      line,
    );
  return match?.[1] ?? "";
}

function looksLikeUnclassifiedHeading(line: string): boolean {
  const trimmed = line.trim();
  const isListItem =
    /^\s*(?:[-*•▪◦‣]|\(?\d{1,3}[.)]|\([A-Za-z]\)|[A-Za-z][.)])\s+/.test(line);
  if (!trimmed || isListItem) return false;
  if (/^\s*[A-Za-z0-9][A-Za-z0-9 /,&()'’\-]{0,80}:\s*$/.test(line)) return true;
  if (/\b(?:inclusion|exclusion)\s+criteria\b/i.test(trimmed)) return true;
  if (
    /^\s*[A-Za-z0-9][A-Za-z0-9 /,&()'’\-]{0,80}\b(?:eligibility|criteria)\s*:?\s*$/i.test(
      line,
    )
  )
    return true;

  const words = trimmed.split(/\s+/);
  const smallWords = new Set([
    "and",
    "or",
    "of",
    "for",
    "to",
    "in",
    "the",
    "with",
    "as",
  ]);
  return (
    words.length <= 6 &&
    !/[.!?;,]/.test(trimmed) &&
    /^[A-Z0-9]/.test(words[0] ?? "") &&
    words
      .slice(1)
      .every((word) => smallWords.has(word) || /^[A-Z0-9]/.test(word))
  );
}

function trimWhitespaceEnd(text: string, start: number, end: number): number {
  while (end > start && /\s/.test(text[end - 1] ?? "")) end--;
  return end;
}

function itemStarts(blockText: string): number[] {
  const markers: number[] = [];
  for (const line of linesOf(blockText)) {
    let lineItemNumber: number | undefined;
    const lineMarker =
      /^[\t ]*(?:[-*•▪◦‣]|\(?\d{1,3}[.)]|\([A-Za-z]\)|[A-Za-z][.)])\s+/.exec(
        line.text,
      );
    if (lineMarker) {
      const indent = lineMarker[0].search(/\S/);
      markers.push(line.start + Math.max(indent, 0));
      const label = lineMarker[0].trim().split(/\s+/, 1)[0] ?? "";
      const numbered = /^\(?([0-9]{1,3})[.)]$/.exec(label);
      if (numbered?.[1]) lineItemNumber = Number(numbered[1]);
    }

    const inlineMarker = /[.;:]\s+(\(\d{1,3}\)|\d{1,3}[.)])\s+/g;
    for (const match of line.text.matchAll(inlineMarker)) {
      if (match.index === undefined) continue;
      const token = match[1];
      if (!token) continue;
      const numbered = /^\(?([0-9]{1,3})[.)]$/.exec(token);
      const nextNumber = numbered?.[1] ? Number(numbered[1]) : undefined;
      if (lineItemNumber === undefined || nextNumber !== lineItemNumber + 1)
        continue;
      markers.push(line.start + match.index + match[0].lastIndexOf(token));
      lineItemNumber = nextNumber;
    }
  }
  return [...new Set(markers)].sort((a, b) => a - b);
}

function splitEligibility(trial: z.infer<typeof TrialSchema>): SplitResult {
  const text = trial.eligibilityText;
  const lines = linesOf(text);
  const blocks: SectionBlock[] = [];
  const reasons: string[] = [];
  let active: SectionBlock | undefined;
  let sawHeading = false;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!;
    const kind = headingKind(line.text);
    if (kind) {
      sawHeading = true;
      if (active) {
        active.end = line.start;
        blocks.push(active);
      }
      const tail = headingTail(line.text);
      if (tail.trim())
        reasons.push(
          `Tekst u istom redu kao naslov odeljka (${index + 1}. red) nije razdvojen kao stavka.`,
        );
      active = {
        kind,
        start: line.breakEnd,
        end: text.length,
        headingLine: index + 1,
      };
      continue;
    }

    if (active && looksLikeUnclassifiedHeading(line.text)) {
      active.end = line.start;
      blocks.push(active);
      active = undefined;
      reasons.push(
        `Neprepoznat podnaslov u ${index + 1}. redu; vrsta odeljka nije pouzdana.`,
      );
      continue;
    }

    if (!active && line.text.trim()) {
      reasons.push(
        sawHeading
          ? `Tekst u ${index + 1}. redu nije pod jasnim Inclusion/Exclusion naslovom.`
          : `Tekst u ${index + 1}. redu prethodi jasnom Inclusion/Exclusion naslovu.`,
      );
    }
  }
  if (active) blocks.push(active);
  if (!sawHeading)
    reasons.push(
      "Nema jasnih Inclusion Criteria ili Exclusion Criteria naslova.",
    );
  if (blocks.length === 0 && sawHeading)
    reasons.push("Nije pronađen prepoznatljiv blok kriterijuma ispod naslova.");

  const counts = { inclusion: 0, exclusion: 0 };
  const criteria: SplitResult["criteria"] = [];
  for (const block of blocks) {
    const blockText = text.slice(block.start, block.end);
    const markers = itemStarts(blockText).map((offset) => block.start + offset);
    if (markers.length === 0) {
      if (blockText.trim())
        reasons.push(
          `${block.kind === "inclusion" ? "Inclusion" : "Exclusion"} odeljak od ${block.headingLine}. reda nema jasne numerisane ili označene stavke.`,
        );
      continue;
    }

    const preamble = text.slice(block.start, markers[0]);
    if (preamble.trim())
      reasons.push(
        `${block.kind === "inclusion" ? "Inclusion" : "Exclusion"} odeljak od ${block.headingLine}. reda sadrži tekst pre prve jasno označene stavke.`,
      );

    for (let index = 0; index < markers.length; index++) {
      const start = markers[index]!;
      const next = markers[index + 1] ?? block.end;
      const end = trimWhitespaceEnd(text, start, next);
      const quote = text.slice(start, end);
      if (!quote.trim()) continue;
      counts[block.kind]++;
      const id = `${trial.trialId}#${block.kind === "inclusion" ? "inc" : "exc"}-${counts[block.kind]}`;
      criteria.push({
        id,
        trialId: trial.trialId,
        kind: block.kind,
        checkability: "manual_review",
        origin: "raw_extracted",
        text: quote,
        sourceId: `${trial.trialId}#unsplit-1`,
        sourceQuote: quote,
        reason:
          "Automatski izdvojeno iz originalnog teksta; obavezna je ljudska provera.",
      });
    }
  }

  if (criteria.length === 0)
    reasons.push("Nijedna stavka nije mogla pouzdano da se izdvoji.");
  const uniqueReasons = [...new Set(reasons)];
  const source: SplitResult["source"] = {
    trialId: trial.trialId,
    sourceId: `${trial.trialId}#unsplit-1`,
    text,
    sourceHash: hash(text),
    location: "protocolSection.eligibilityModule.eligibilityCriteria",
    kind: "unsplit",
  };
  return {
    criteria,
    source,
    splitStatus: uniqueReasons.length === 0 ? "complete" : "needs_manual_split",
    ...(uniqueReasons.length ? { splitReason: uniqueReasons.join(" ") } : {}),
  };
}

function seededRandom(seed: string): () => number {
  let state = createHash("sha256")
    .update(seed, "utf8")
    .digest()
    .readUInt32BE(0);
  if (state === 0) state = 0x6d2b79f5;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}

function selectTrials(
  trials: z.infer<typeof TrialSchema>[],
  options: Pick<SplitOptions, "limit" | "selection" | "seed">,
): z.infer<typeof TrialSchema>[] {
  const ordered = [...trials];
  if (options.selection === "random") {
    const random = seededRandom(options.seed!);
    for (let index = ordered.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(random() * (index + 1));
      [ordered[index], ordered[swapIndex]] = [
        ordered[swapIndex]!,
        ordered[index]!,
      ];
    }
  }
  return options.limit === undefined
    ? ordered
    : ordered.slice(0, options.limit);
}

export function createReviewDraft(
  imported: ImportedInput,
  options: Pick<SplitOptions, "limit" | "selection" | "seed">,
) {
  const selected = selectTrials(imported.data.trials, options);
  const trials: z.infer<typeof DraftTrialSchema>[] = [];
  const sources: z.infer<typeof DraftSourceSchema>[] = [];
  const needsManualSplit: Array<{ trialId: string; reason: string }> = [];

  for (const trial of selected) {
    const split = splitEligibility(trial);
    const draftTrial: z.infer<typeof DraftTrialSchema> = {
      trialId: trial.trialId.toUpperCase(),
      title: trial.title,
      conditions: trial.conditions,
      overallStatus: trial.overallStatus,
      phase: trial.phase,
      ...(trial.phases === undefined ? {} : { phases: trial.phases }),
      locations: trial.locations,
      eligibilityText: trial.eligibilityText,
      criteria: split.criteria,
      dataVersion: trial.dataVersion,
      reviewStatus: "pending_review",
      splitStatus: split.splitStatus,
      ...(split.splitReason ? { splitReason: split.splitReason } : {}),
    };
    trials.push(DraftTrialSchema.parse(draftTrial));
    sources.push(DraftSourceSchema.parse(split.source));
    if (split.splitStatus === "needs_manual_split")
      needsManualSplit.push({
        trialId: trial.trialId.toUpperCase(),
        reason: split.splitReason!,
      });
  }

  return ReviewDraftSchema.parse({
    format: "trialmatch-review-draft-v1",
    inputFormat: imported.inputFormat,
    inputHash: imported.inputHash,
    selection: {
      method: options.selection,
      limit: options.limit ?? null,
      ...(options.seed === undefined ? {} : { seed: options.seed }),
      selectedIds: trials.map((trial) => trial.trialId),
    },
    trials,
    sources,
    report: {
      totalStudyCount: imported.totalStudyCount,
      availableStudyCount: imported.data.trials.length,
      selectedCount: trials.length,
      processedTrialIds: trials.map((trial) => trial.trialId),
      problems: imported.data.report.problems,
      needsManualSplit,
      unknownMetadata: imported.data.report.unknownMetadata,
      hasNextPage: imported.data.report.hasNextPage,
    },
  });
}

function insidePath(parent: string, child: string): boolean {
  const path = relative(parent, child);
  return path === "" || (!path.startsWith(`..${sep}`) && path !== "..");
}

async function protectOutputPath(
  inputPath: string,
  outputPath: string,
): Promise<void> {
  if (inputPath === outputPath)
    throw new Error(
      "Ulaz i izlaz ne mogu biti ista putanja; ulaz ostaje neizmenjen.",
    );
  const root = resolve(".");
  const rawDir = resolve(root, "data/raw");
  const fixturesDir = resolve(root, "data/fixtures");
  if (insidePath(rawDir, outputPath))
    throw new Error("Izlaz ne sme biti upisan u data/raw/.");
  if (insidePath(fixturesDir, outputPath))
    throw new Error("Pregledni nacrt ne sme biti upisan u data/fixtures/.");
  try {
    await lstat(outputPath);
    throw new Error(
      "Izlazna putanja već postoji; ne prepisujem postojeći fajl.",
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("već postoji"))
      throw error;
    if (!isNodeError(error, "ENOENT")) throw error;
  }
}

export async function splitTrials(
  options: SplitOptions,
): Promise<z.infer<typeof ReviewDraftSchema>> {
  const inputPath = resolve(options.input);
  const outputPath = resolve(options.output);
  await protectOutputPath(inputPath, outputPath);

  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(inputPath, "utf8")) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError)
      throw new Error(`Ulaz nije ispravan JSON: ${error.message}`);
    throw error;
  }

  const imported = importInput(raw);
  const draft = createReviewDraft(imported, options);
  try {
    await writeNewJson(outputPath, draft);
  } catch (error) {
    if (isNodeError(error, "EEXIST"))
      throw new Error(
        "Izlazna putanja već postoji; ne prepisujem postojeći fajl.",
      );
    throw error;
  }
  return draft;
}

async function main(): Promise<void> {
  const options = parseSplitArgs(process.argv.slice(2));
  const draft = await splitTrials(options);
  console.log(
    JSON.stringify(
      {
        output: resolve(options.output),
        totalStudyCount: draft.report.totalStudyCount,
        availableStudyCount: draft.report.availableStudyCount,
        selectedCount: draft.report.selectedCount,
        processedTrialIds: draft.report.processedTrialIds,
        problems: draft.report.problems,
        needsManualSplit: draft.report.needsManualSplit,
        hasNextPage: draft.report.hasNextPage,
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
    if (error instanceof SplitInputError) {
      console.error(
        JSON.stringify({ error: error.message, report: error.report }, null, 2),
      );
    } else {
      console.error(error instanceof Error ? error.message : String(error));
    }
    process.exitCode = 1;
  }
}
