import { mkdir, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { z } from "zod";
import {
  SafeTraceSchema,
  type SafeTrace,
} from "../../apps/server/src/trace/redact.js";

const OutcomeSchema = z
  .object({
    case_id: z.string().regex(/^EV-\d{2}$/u),
    execution_mode: z.enum(["offline", "simulated_fault", "real_model"]),
    status: z.enum(["passed", "failed", "skipped", "dry_run"]),
    details: z.string(),
  })
  .strict();

const SummarySchema = z
  .object({
    label: z.string().min(1),
    commit: z.string().min(1),
    data_version: z.string().min(1),
    schema_version: z.string().min(1),
    model_id: z.string().min(1),
    real_model: z
      .object({
        executed: z.number().int().nonnegative(),
        skipped: z.number().int().nonnegative(),
        dry_run: z.number().int().nonnegative(),
      })
      .strict(),
    offline_and_fault: z
      .object({
        passed: z.number().int().nonnegative(),
        failed: z.number().int().nonnegative(),
      })
      .strict(),
    results_file: z.literal("results.jsonl"),
  })
  .strict();

export type RunOutcome = z.infer<typeof OutcomeSchema>;
export type RunSummary = z.infer<typeof SummarySchema>;

export async function writeRunResults(
  outputDir: string,
  outcomes: RunOutcome[],
  summary: RunSummary,
  traces: SafeTrace[],
): Promise<void> {
  if (basename(resolve(outputDir)) === "baseline")
    throw new Error("Direktorijum baseline je nepromenljiv.");
  const validatedOutcomes = OutcomeSchema.array().parse(outcomes);
  const validatedSummary = SummarySchema.parse(summary);
  const validatedTraces = SafeTraceSchema.array().parse(traces);
  const outcomeIds = new Set(validatedOutcomes.map((item) => item.case_id));
  if (
    outcomeIds.size !== validatedOutcomes.length ||
    validatedTraces.length !== validatedOutcomes.length ||
    validatedTraces.some(
      (trace, index) => trace.case_id !== validatedOutcomes[index]?.case_id,
    )
  ) {
    throw new Error(
      "Rezultati moraju imati jedinstvene ID-jeve, a tragovi moraju pratiti isti redosled.",
    );
  }

  await mkdir(outputDir);
  const tracesDir = resolve(outputDir, "traces");
  await mkdir(tracesDir);
  await writeFile(
    resolve(outputDir, "results.jsonl"),
    `${validatedOutcomes.map((item) => JSON.stringify(item)).join("\n")}\n`,
    "utf8",
  );
  await writeFile(
    resolve(outputDir, "summary.json"),
    JSON.stringify(validatedSummary, null, 2),
    "utf8",
  );
  for (const trace of validatedTraces) {
    await writeFile(
      resolve(tracesDir, `${trace.case_id}.json`),
      JSON.stringify(trace, null, 2),
      "utf8",
    );
  }
}
