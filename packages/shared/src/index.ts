import { z } from "zod";

export const CalendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(value + "T00:00:00Z");
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  });
export const DatasetManifestSchema = z
  .object({
    name: z.string().min(1),
    version: z.string().min(1),
    date: CalendarDateSchema.nullable(),
    origin: z.string().min(1),
    synthetic: z.boolean(),
    license: z.string().min(1),
    transformations: z.string().min(1),
    limitations: z.array(z.string()),
    downloadDate: z.string().datetime({ offset: true }).optional(),
    queryParameters: z.record(z.string(), z.string()).optional(),
    downloadedCount: z.number().int().nonnegative().optional(),
    includedCount: z.number().int().nonnegative().optional(),
    sourceHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    rulesVersion: z.string().min(1).optional(),
  })
  .strict()
  .refine(
    (m) =>
      m.includedCount === undefined ||
      m.downloadedCount === undefined ||
      m.includedCount <= m.downloadedCount,
  );
export type DatasetManifest = z.infer<typeof DatasetManifestSchema>;

export const ProfileFieldSchema = z.enum([
  "age",
  "sex",
  "hba1c",
  "creatinine",
  "height",
  "weight",
  "insulin_last_3_months",
  "medications",
  "stated_diagnoses",
]);
export const CriterionFieldSchema = z.union([
  ProfileFieldSchema,
  z.enum(["egfr", "bmi"]),
]);

export const ProvenanceSchema = z
  .object({
    origin: z.enum(["initial_input", "answer", "hypothesis"]),
    round: z.number().int().nonnegative(),
  })
  .strict();

export const AmbiguitySchema = z
  .object({
    field: CriterionFieldSchema,
    reason: z.string().min(1),
  })
  .strict();

export const MeasurementSchema = z
  .object({
    value: z.number().finite(),
    unit: z.string().min(1),
  })
  .strict();

export const ProfileSchema = z
  .object({
    age: z.number().int().min(0).max(120).optional(),
    sex: z.enum(["male", "female"]).optional(),
    hba1c: MeasurementSchema.optional(),
    creatinine: MeasurementSchema.optional(),
    height: MeasurementSchema.optional(),
    weight: MeasurementSchema.optional(),
    insulin_last_3_months: z.boolean().optional(),
    medications: z.array(z.string().min(1)).optional(),
    stated_diagnoses: z.array(z.string().min(1)).optional(),
    ambiguities: z.array(AmbiguitySchema).optional(),
    provenance: z
      .partialRecord(ProfileFieldSchema, ProvenanceSchema)
      .optional(),
  })
  .strict();

const LegacyCriterionSchema = z
  .object({
    id: z.string().min(1),
    trialId: z.string().min(1),
    kind: z.enum(["inclusion", "exclusion"]),
    field: CriterionFieldSchema,
    operator: z.enum([
      "gt",
      "lt",
      "gte",
      "lte",
      "between",
      "eq",
      "in",
      "not_in",
      "is_true",
      "is_false",
    ]),
    value: z.union([
      z.number(),
      z.boolean(),
      z.string(),
      z.array(z.union([z.number(), z.string()])),
    ]),
    unit: z.string().optional(),
    checkability: z.enum(["auto", "manual_review"]),
    origin: z.enum(["structured_field", "compiled_reviewed"]),
    text: z.string().min(1),
    sourceId: z.string().min(1),
    sourceQuote: z.string().min(1),
  })
  .strict();

const ManualCriterionSchema = z
  .object({
    id: z.string().min(1),
    trialId: z.string().min(1),
    kind: z.enum(["inclusion", "exclusion"]),
    checkability: z.literal("manual_review"),
    origin: z.enum(["structured_field", "compiled_reviewed"]),
    text: z.string().min(1),
    sourceId: z.string().min(1),
    sourceQuote: z.string().min(1),
    reason: z.string().min(1),
    field: CriterionFieldSchema.optional(),
    operator: LegacyCriterionSchema.shape.operator.optional(),
    value: LegacyCriterionSchema.shape.value.optional(),
    unit: z.string().optional(),
  })
  .strict();
export const CriterionSchema = z
  .union([LegacyCriterionSchema, ManualCriterionSchema])
  .superRefine((c, ctx) => {
    if (c.checkability === "manual_review") return;
    let valid = true;
    const numberFields = new Set([
      "age",
      "hba1c",
      "creatinine",
      "height",
      "weight",
      "egfr",
      "bmi",
    ]);
    const expectedUnits: Record<string, string> = {
      age: "years",
      hba1c: "%",
      creatinine: "mg/dL",
      height: "cm",
      weight: "kg",
      egfr: "mL/min/1.73 m²",
      bmi: "kg/m²",
    };
    if (numberFields.has(c.field) && c.unit !== expectedUnits[c.field]) {
      ctx.addIssue({
        code: "custom",
        path: ["unit"],
        message: "Numerički kriterijum mora biti u kanonskoj jedinici.",
      });
    }
    if (c.operator === "between")
      valid =
        Array.isArray(c.value) &&
        c.value.length === 2 &&
        typeof c.value[0] === "number" &&
        typeof c.value[1] === "number" &&
        c.value[0] <= c.value[1];
    if (
      c.operator === "gt" ||
      c.operator === "lt" ||
      c.operator === "gte" ||
      c.operator === "lte"
    )
      valid = typeof c.value === "number";
    if (c.operator === "in" || c.operator === "not_in")
      valid = Array.isArray(c.value) && c.value.length > 0;
    if (c.operator === "is_true" || c.operator === "is_false")
      valid = c.field === "insulin_last_3_months";
    const valueType = numberFields.has(c.field)
      ? "number"
      : c.field === "insulin_last_3_months"
        ? "boolean"
        : "string";
    if (c.operator === "eq") valid = typeof c.value === valueType;
    if (c.operator === "in" || c.operator === "not_in")
      valid =
        Array.isArray(c.value) &&
        c.value.length > 0 &&
        c.value.every((value) => typeof value === valueType);
    if (!valid)
      ctx.addIssue({
        code: "custom",
        message: "Operator i vrednost nisu saglasni.",
      });
  });

export const TrialSchema = z
  .object({
    trialId: z.string().min(1),
    title: z.string().min(1),
    conditions: z.array(z.string()),
    overallStatus: z.string().nullable(),
    phase: z.string().nullable(),
    phases: z.array(z.string()).optional(),
    locations: z.array(z.string()),
    eligibilityText: z.string(),
    criteria: z.array(CriterionSchema),
    dataVersion: z.string().min(1),
  })
  .strict();

export const CitationSchema = z
  .object({
    sourceId: z.string().min(1),
    quote: z.string().min(1),
  })
  .strict();

export const CriterionResultSchema = z
  .object({
    id: z.string().min(1),
    text: z.string().min(1),
    status: z.enum(["met", "not_met", "unknown"]),
    observedValue: z.union([
      z.number().finite(),
      z.boolean(),
      z.string(),
      z.null(),
    ]),
    observedUnit: z.string().min(1).nullable(),
    observedOrigin: z.enum(["profile", "derived", "unknown"]),
    sourceId: z.string().min(1),
    citation: CitationSchema,
  })
  .strict();

export const TrialResultSchema = z
  .object({
    trialId: z.string().min(1),
    title: z.string().min(1),
    verdict: z.enum(["candidate", "pending", "excluded"]),
    overallStatus: z.string().nullable(),
    phase: z.string().nullable(),
    criteria: z.array(CriterionResultSchema),
  })
  .strict();

export const QuestionSchema = z
  .object({
    field: ProfileFieldSchema,
    text: z.string().min(1),
    options: z.array(z.string()).optional(),
    trialsResolved: z.array(z.string()),
  })
  .strict();

export const DerivedValueSchema = z
  .object({
    name: z.enum(["eGFR", "BMI"]),
    value: z.number().finite(),
    unit: z.string().min(1),
    formulaName: z.string().min(1),
    sourceReference: z.string().min(1),
  })
  .strict();

export const ErrorCategorySchema = z.enum([
  "invalid_request",
  "invalid_profile",
  "invalid_hypothesis",
  "ambiguous_hypothesis",
  "forbidden_intent",
  "input_too_large",
  "run_not_found",
  "invalid_transition",
  "rate_limit_exceeded",
  "internal_contract_violation",
  "model_call_limit",
  "model_timeout",
  "run_timeout",
  "tool_call_limit",
  "question_round_limit",
  "unknown_tool",
  "invalid_tool_arguments",
  "invalid_tool_result",
  "tool_error",
  "tool_timeout",
  "invalid_model_output",
  "provider_auth_error",
  "provider_config_error",
  "provider_rate_limit",
  "provider_unavailable",
  "citation_validation_failed",
]);
export const ErrorInfoSchema = z
  .object({
    category: ErrorCategorySchema,
    message: z.string().min(1),
    retryable: z.boolean(),
  })
  .strict();

export const MetaSchema = z
  .object({
    modelId: z.string(),
    providerId: z.string().min(1),
    modelAttempts: z.number().int().nonnegative(),
    dataSnapshotDate: CalendarDateSchema.nullable(),
    dataOrigin: z.string().min(1),
    dataSynthetic: z.boolean(),
    promptVersion: z.string(),
    schemaVersion: z.string(),
    dataVersion: z.string(),
    durationMs: z.number().nonnegative(),
    modelCalls: z.number().int().nonnegative(),
    toolCalls: z.number().int().nonnegative(),
    tokens: z.number().int().nonnegative().nullable(),
    demoMode: z.boolean(),
  })
  .strict();

const ResponseBaseSchema = z.object({
  runId: z.string().min(1),
  profile: ProfileSchema.nullable(),
  derived: z.array(DerivedValueSchema),
  results: z.array(TrialResultSchema),
  excludedTrials: z.array(TrialResultSchema),
  explanation: z.string().min(1),
  meta: MetaSchema,
});

export const RunResponseSchema = z
  .discriminatedUnion("status", [
    ResponseBaseSchema.extend({
      status: z.literal("ok"),
      stage: z.literal("completed"),
      profile: ProfileSchema,
      results: z.array(TrialResultSchema).min(1),
      question: z.null(),
      reason: z.null(),
      error: z.null(),
    }).strict(),
    ResponseBaseSchema.extend({
      status: z.literal("needs_clarification"),
      stage: z.literal("awaiting_input"),
      profile: ProfileSchema,
      question: QuestionSchema,
      reason: z.null(),
      error: z.null(),
    }).strict(),
    ResponseBaseSchema.extend({
      status: z.literal("insufficient_evidence"),
      stage: z.literal("completed"),
      question: z.null(),
      reason: z.enum(["no_matching_trial", "not_in_sources"]),
      error: z.null(),
      results: z.array(TrialResultSchema).length(0),
    }).strict(),
    ResponseBaseSchema.extend({
      status: z.literal("rejected"),
      stage: z.literal("rejected"),
      profile: z.null(),
      derived: z.array(DerivedValueSchema).length(0),
      results: z.array(TrialResultSchema).length(0),
      question: z.null(),
      reason: z.null(),
      error: z.null(),
    }).strict(),
    ResponseBaseSchema.extend({
      status: z.literal("error"),
      stage: z.literal("failed"),
      question: z.null(),
      reason: z.null(),
      error: ErrorInfoSchema,
      results: z.array(TrialResultSchema).length(0),
    }).strict(),
  ])
  .superRefine((response, ctx) => {
    const exclusionsAllowed =
      response.status === "insufficient_evidence" &&
      response.reason === "no_matching_trial";
    if (
      (!exclusionsAllowed && response.excludedTrials.length > 0) ||
      response.excludedTrials.some(
        (t) =>
          t.verdict !== "excluded" ||
          !t.criteria.some((c) => c.status === "not_met"),
      )
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["excludedTrials"],
        message: "Neispravna kolekcija isključenih studija.",
      });
    }
    for (const trial of [...response.results, ...response.excludedTrials]) {
      for (const criterion of trial.criteria) {
        if (
          criterion.observedOrigin === "unknown" &&
          (criterion.observedValue !== null || criterion.observedUnit !== null)
        )
          ctx.addIssue({
            code: "custom",
            message: "Nepoznata vrednost nema jedinicu ni opažanje.",
          });
      }
    }
  });

export const ErrorEnvelopeSchema = z
  .object({
    status: z.literal("error"),
    error: ErrorInfoSchema,
  })
  .strict();

export const IntentSchema = z.enum([
  "eligibility_check",
  "source_question",
  "diagnosis_request",
  "treatment_advice",
  "inclusion_decision",
]);

export const ExtractionSchema = z
  .object({
    intent: IntentSchema,
    profile: ProfileSchema,
    sourceQuestion: z.string().optional(),
  })
  .strict();

export const ApiErrorRequestSchema = z
  .object({
    status: z.literal("error"),
    error: ErrorInfoSchema,
  })
  .strict();

export type Profile = z.infer<typeof ProfileSchema>;
export type ProfileField = z.infer<typeof ProfileFieldSchema>;
export type CriterionField = z.infer<typeof CriterionFieldSchema>;
export type Criterion = z.infer<typeof CriterionSchema>;
export type Trial = z.infer<typeof TrialSchema>;
export type TrialResult = z.infer<typeof TrialResultSchema>;
export type CriterionResult = z.infer<typeof CriterionResultSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type DerivedValue = z.infer<typeof DerivedValueSchema>;
export type RunResponse = z.infer<typeof RunResponseSchema>;
export type Intent = z.infer<typeof IntentSchema>;
export type Extraction = z.infer<typeof ExtractionSchema>;

export function isProfileValuePresent(
  profile: Profile,
  field: ProfileField,
): boolean {
  return (
    Object.prototype.hasOwnProperty.call(profile, field) &&
    profile[field] !== undefined
  );
}
