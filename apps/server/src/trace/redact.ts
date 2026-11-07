import { z } from "zod";

export const SafeTraceSchema = z
  .object({
    case_id: z.string().regex(/^EV-\d{2}$/u),
    run_id: z.string().min(1),
    status: z.enum(["passed", "failed", "skipped", "dry_run"]),
    execution_mode: z.enum(["offline", "simulated_fault", "real_model"]),
    model_id: z.string().min(1),
    data_version: z.string().min(1),
    schema_version: z.string().min(1),
    prompt_version: z.string().min(1),
    commit: z.string().min(1),
  })
  .strict();

const SafeTraceInputSchema = SafeTraceSchema.extend({}).passthrough();
export type SafeTrace = z.infer<typeof SafeTraceSchema>;

export function redactTrace(input: unknown): SafeTrace {
  const parsed = SafeTraceInputSchema.parse(input);
  return SafeTraceSchema.parse({
    case_id: parsed.case_id,
    run_id: parsed.run_id,
    status: parsed.status,
    execution_mode: parsed.execution_mode,
    model_id: parsed.model_id,
    data_version: parsed.data_version,
    schema_version: parsed.schema_version,
    prompt_version: parsed.prompt_version,
    commit: parsed.commit,
  });
}
