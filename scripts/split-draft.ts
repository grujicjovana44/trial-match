import { lstat } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRuleDraft } from "./create-rule-draft.js";
import {
  parseSplitArgs,
  SplitInputError,
  splitTrials,
  type SelectionMethod,
} from "./split-trials.js";

const usage =
  "Upotreba: pnpm data:split-draft --input <putanja> --split-output <novi-split.json> --output <novi-rules-draft.json> [--limit <N>] [--selection first|random] [--seed <vrednost>].";

export interface SplitDraftOptions {
  input: string;
  splitOutput: string;
  output: string;
  selection: SelectionMethod;
  limit?: number;
  seed?: string;
}

export function parseSplitDraftArgs(argv: string[]): SplitDraftOptions {
  const values = new Map<string, string>();
  const allowed = [
    "--input",
    "--split-output",
    "--output",
    "--limit",
    "--selection",
    "--seed",
  ];
  for (let index = 0; index < argv.length; index++) {
    const key = argv[index];
    const value = argv[index + 1];
    if (
      !key?.startsWith("--") ||
      !allowed.includes(key) ||
      !value ||
      value.startsWith("--") ||
      values.has(key)
    )
      throw new Error(usage);
    values.set(key, value);
    index++;
  }

  const input = values.get("--input");
  const splitOutput = values.get("--split-output");
  const output = values.get("--output");
  if (!input || !splitOutput || !output) throw new Error(usage);

  const splitArgs = ["--input", input, "--output", splitOutput];
  for (const key of ["--limit", "--selection", "--seed"] as const) {
    const value = values.get(key);
    if (value !== undefined) splitArgs.push(key, value);
  }
  const splitOptions = parseSplitArgs(splitArgs);
  if (resolve(splitOutput) === resolve(output))
    throw new Error(
      "Split i rules-draft moraju imati različite izlazne putanje.",
    );

  return {
    input: splitOptions.input,
    splitOutput: splitOptions.output,
    output,
    selection: splitOptions.selection,
    ...(splitOptions.limit === undefined ? {} : { limit: splitOptions.limit }),
    ...(splitOptions.seed === undefined ? {} : { seed: splitOptions.seed }),
  };
}

async function assertOutputDoesNotExist(outputPath: string): Promise<void> {
  try {
    await lstat(outputPath);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      return;
    throw error;
  }
  throw new Error("Izlazna putanja već postoji; ne prepisujem fajl.");
}

export async function splitAndCreateRuleDraft(
  options: SplitDraftOptions,
): Promise<{
  split: Awaited<ReturnType<typeof splitTrials>>;
  ruleDraft: Awaited<ReturnType<typeof createRuleDraft>>;
}> {
  const input = resolve(options.input);
  const splitOutput = resolve(options.splitOutput);
  const output = resolve(options.output);
  if (splitOutput === output)
    throw new Error(
      "Split i rules-draft moraju imati različite izlazne putanje.",
    );
  if (input === splitOutput)
    throw new Error(
      "Ulaz i izlaz ne mogu biti ista putanja; ulaz ostaje neizmenjen.",
    );

  // Check the second destination before data:split writes its output.
  await assertOutputDoesNotExist(output);
  const split = await splitTrials({
    input,
    output: splitOutput,
    selection: options.selection,
    ...(options.limit === undefined ? {} : { limit: options.limit }),
    ...(options.seed === undefined ? {} : { seed: options.seed }),
  });
  const ruleDraft = await createRuleDraft(splitOutput, output);
  return { split, ruleDraft };
}

async function main(): Promise<void> {
  const options = parseSplitDraftArgs(process.argv.slice(2));
  const { split, ruleDraft } = await splitAndCreateRuleDraft(options);
  console.log(
    JSON.stringify(
      {
        split: {
          output: resolve(options.splitOutput),
          totalStudyCount: split.report.totalStudyCount,
          availableStudyCount: split.report.availableStudyCount,
          selectedCount: split.report.selectedCount,
          processedTrialIds: split.report.processedTrialIds,
          problems: split.report.problems,
          needsManualSplit: split.report.needsManualSplit,
          hasNextPage: split.report.hasNextPage,
        },
        rulesDraft: {
          output: resolve(options.output),
          createdStudyCount: ruleDraft.drafts.length,
          omittedStudyCount: ruleDraft.omittedTrialIds.length,
          omittedTrialIds: ruleDraft.omittedTrialIds,
        },
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
