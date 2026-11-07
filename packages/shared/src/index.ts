import { z } from "zod";

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

export const CriterionSchema = z
  .object({
    id: z.string().min(1),
    trialId: z.string().min(1),
    kind: z.enum(["inclusion", "exclusion"]),
    field: CriterionFieldSchema,
    operator: z.enum([
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

export const TrialSchema = z
  .object({
    trialId: z.string().min(1),
    title: z.string().min(1),
    conditions: z.array(z.string()),
    overallStatus: z.string(),
    phase: z.string(),
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
    observedValue: z.union([z.number(), z.boolean(), z.string(), z.null()]),
    sourceId: z.string().min(1),
    citation: CitationSchema,
  })
  .strict();

export const TrialResultSchema = z
  .object({
    trialId: z.string().min(1),
    title: z.string().min(1),
    verdict: z.enum(["candidate", "pending", "excluded"]),
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

export const ErrorInfoSchema = z
  .object({
    category: z.string().min(1),
    message: z.string().min(1),
    retryable: z.boolean(),
  })
  .strict();

export const MetaSchema = z
  .object({
    modelId: z.string(),
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
  explanation: z.string().min(1),
  meta: MetaSchema,
});

export const RunResponseSchema = z.discriminatedUnion("status", [
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
]);

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
