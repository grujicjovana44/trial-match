import { z } from "zod";
import { createHash } from "node:crypto";
import { CriterionFieldSchema } from "../../packages/shared/src/index.js";
const AtomSchema = z
  .object({
    sourceId: z.string().min(1),
    kind: z.enum(["inclusion", "exclusion"]),
    field: CriterionFieldSchema.nullable(),
    operator: z
      .enum([
        "gte",
        "lte",
        "between",
        "eq",
        "in",
        "not_in",
        "is_true",
        "is_false",
      ])
      .nullable(),
    value: z
      .union([
        z.number().finite(),
        z.boolean(),
        z.string(),
        z.array(z.union([z.number().finite(), z.boolean(), z.string()])),
      ])
      .nullable(),
    unit: z.string().nullable(),
    checkability: z.enum(["auto", "manual_review"]),
  })
  .strict()
  .superRefine((atom, ctx) => {
    if (atom.checkability === "manual_review") return;
    const numericFields = new Set([
      "age",
      "hba1c",
      "creatinine",
      "height",
      "weight",
      "egfr",
      "bmi",
    ]);
    const units: Record<string, string> = {
      age: "years",
      hba1c: "%",
      creatinine: "mg/dL",
      height: "cm",
      weight: "kg",
      egfr: "mL/min/1.73 m²",
      bmi: "kg/m²",
    };
    if (atom.field === null || atom.operator === null || atom.value === null) {
      ctx.addIssue({ code: "custom", message: "Auto atom je nepotpun." });
      return;
    }
    const expectedType = numericFields.has(atom.field)
      ? "number"
      : atom.field === "insulin_last_3_months"
        ? "boolean"
        : "string";
    if (numericFields.has(atom.field) && atom.unit !== units[atom.field])
      ctx.addIssue({
        code: "custom",
        path: ["unit"],
        message: "Auto atom nema kanonsku jedinicu.",
      });
    let valid = true;
    if (atom.operator === "gte" || atom.operator === "lte")
      valid = typeof atom.value === "number";
    else if (atom.operator === "between")
      valid =
        Array.isArray(atom.value) &&
        atom.value.length === 2 &&
        atom.value.every((item) => typeof item === "number");
    else if (atom.operator === "eq") valid = typeof atom.value === expectedType;
    else if (atom.operator === "in" || atom.operator === "not_in")
      valid =
        Array.isArray(atom.value) &&
        atom.value.length > 0 &&
        atom.value.every((item) => typeof item === expectedType);
    else
      valid =
        atom.field === "insulin_last_3_months" &&
        typeof atom.value === "boolean";
    if (!valid)
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "Operator, polje i vrednost nisu saglasni.",
      });
  });
const AnnotationSchema = z
  .object({
    annotationId: z.string().min(1),
    sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
    originalText: z.string().min(1),
    expected: z.array(AtomSchema),
    reviewer: z.string().min(1),
    reviewedAt: z.string().datetime({ offset: true }),
    datasetVersion: z.string().min(1),
    annotationVersion: z.string().min(1),
  })
  .strict();
const PredictionSchema = z
  .object({
    annotationId: z.string().min(1),
    sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
    datasetVersion: z.string().min(1),
    annotationVersion: z.string().min(1),
    candidate: z.array(AtomSchema),
    method: z.enum(["manual", "structured"]),
    modelVersion: z.null(),
    traceId: z.null(),
  })
  .strict();
export function scoreCriteria(
  annotationsRaw: unknown,
  predictionsRaw: unknown,
  datasetVersion: string,
) {
  const annotations = AnnotationSchema.array().parse(annotationsRaw);
  const predictions = PredictionSchema.array().parse(predictionsRaw);
  if (
    new Set(annotations.map((a) => a.annotationId)).size !==
      annotations.length ||
    new Set(predictions.map((p) => p.annotationId)).size !== predictions.length
  )
    throw new Error("Duplirani annotationId.");
  const key = (atom: z.infer<typeof AtomSchema>) =>
    JSON.stringify([
      atom.sourceId,
      atom.kind,
      atom.field,
      atom.operator,
      atom.value,
      atom.unit,
      atom.checkability,
    ]);
  for (const annotation of annotations) {
    const sourceHash = createHash("sha256")
      .update(annotation.originalText)
      .digest("hex");
    if (sourceHash !== annotation.sourceHash)
      throw new Error(
        `Izvorni hash ne odgovara oznaci ${annotation.annotationId}.`,
      );
    if (
      new Set(annotation.expected.map(key)).size !== annotation.expected.length
    )
      throw new Error(
        `Duplirani atomski kriterijumi ${annotation.annotationId}.`,
      );
  }
  const knownAnnotations = new Set(annotations.map((a) => a.annotationId));
  for (const prediction of predictions) {
    const annotation = annotations.find(
      (item) => item.annotationId === prediction.annotationId,
    );
    if (!knownAnnotations.has(prediction.annotationId) || !annotation)
      throw new Error(`Predikcija nema oznaku ${prediction.annotationId}.`);
    if (
      prediction.sourceHash !== annotation.sourceHash ||
      prediction.datasetVersion !== datasetVersion ||
      prediction.annotationVersion !== annotation.annotationVersion
    )
      throw new Error(
        `Verzija ili izvor predikcije se ne podudara: ${prediction.annotationId}.`,
      );
    if (
      new Set(prediction.candidate.map(key)).size !==
      prediction.candidate.length
    )
      throw new Error(
        `Duplirani predviđeni kriterijumi ${prediction.annotationId}.`,
      );
  }
  if (
    annotations.some((a) => a.datasetVersion !== datasetVersion) ||
    predictions.some((p) => p.datasetVersion !== datasetVersion)
  )
    throw new Error("Dataset verzija se ne podudara.");
  let tp = 0,
    fp = 0,
    fn = 0;
  for (const annotation of annotations) {
    const prediction = predictions.find(
      (p) => p.annotationId === annotation.annotationId,
    );
    const expected = annotation.expected.map(key);
    const actual = (prediction?.candidate ?? []).map(key);
    for (const atom of actual)
      if (expected.includes(atom)) tp++;
      else fp++;
    for (const atom of expected) if (!actual.includes(atom)) fn++;
  }
  return {
    datasetVersion,
    annotations: annotations.length,
    method: "local_manual_or_structured",
    tp,
    fp,
    fn,
    precision: tp + fp ? tp / (tp + fp) : null,
    recall: tp + fn ? tp / (tp + fn) : null,
  };
}
