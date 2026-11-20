import { z } from "zod";
import {
  ErrorCategorySchema,
  ProfileFieldSchema,
} from "../../../../packages/shared/src/index.js";

const TraceEventSchema = z
  .object({
    step: z.enum([
      "model",
      "tool",
      "grounding",
      "retrieval",
      "guard",
      "filter",
    ]),
    attempt: z.number().int().positive().optional(),
    tool: z
      .enum([
        "compute_egfr",
        "compute_bmi",
        "evaluate_criteria",
        "select_next_question",
      ])
      .optional(),
    durationMs: z.number().nonnegative(),
    inputTokens: z.number().int().nonnegative().optional(),
    outputTokens: z.number().int().nonnegative().optional(),
    outcome: z.string().min(1),
    promptVersion: z.string().optional(),
    promptHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    sourceIds: z.array(z.string()).optional(),
    untranslatedTerms: z.array(z.string().max(100)).optional(),
    retrievalMode: z
      .enum(["hybrid", "lexical_fallback", "lexical_only"])
      .optional(),
    fallbackReason: z
      .string()
      .regex(
        /^embedding_(?:timeout|invalid|network_error|error|http_[1-5]\d{2})$/u,
      )
      .optional(),
    vectorHitCount: z.number().int().nonnegative().optional(),
    selectedTrialIds: z.array(z.string().max(100)).optional(),
    validation: z
      .enum(["ok", "no_candidate", "schema_invalid", "business_invalid"])
      .optional(),
    invalidPaths: z
      .array(
        z
          .string()
          .max(100)
          .regex(/^[A-Za-z0-9_.]+$/u),
      )
      .max(10)
      .optional(),
    validationCode: z
      .string()
      .max(64)
      .regex(/^[a-z_]+$/u)
      .optional(),
    validationField: ProfileFieldSchema.optional(),
    errorKind: z
      .enum(["timeout", "http_429", "http_5xx", "http_4xx", "network", "other"])
      .optional(),
  })
  .strict();

const TrialIdSchema = z.string().min(1).max(100);

// Samo nazivi polja i ID-jevi studija; nikada vrednosti profila ni tekst.
const FinalSummarySchema = z
  .object({
    status: z.string().min(1).max(40),
    stage: z.string().min(1).max(40),
    reason: z.string().min(1).max(40).optional(),
    errorCategory: ErrorCategorySchema.optional(),
    questionField: z.string().min(1).max(40).optional(),
    profileFields: z.array(z.string().min(1).max(40)),
    ambiguityFields: z.array(z.string().min(1).max(40)),
    resultTrialIds: z.array(TrialIdSchema),
    excludedTrialIds: z.array(TrialIdSchema),
    modelCalls: z.number().int().nonnegative(),
    toolCalls: z.number().int().nonnegative(),
  })
  .strict();

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
    events: z.array(TraceEventSchema).default([]),
    final: FinalSummarySchema.optional(),
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
    events: parsed.events,
    ...(parsed.final ? { final: parsed.final } : {}),
  });
}
