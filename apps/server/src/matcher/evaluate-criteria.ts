import type {
  Criterion,
  CriterionField,
  CriterionResult,
  DerivedValue,
  Profile,
  Trial,
  TrialResult,
} from "../../../../packages/shared/src/index.js";
import { computeBmi } from "../derived/bmi.js";
import { computeEgfr } from "../derived/egfr.js";
import {
  normalizeCreatinine,
  normalizeHba1c,
  normalizeHeight,
  normalizeWeight,
} from "../derived/units.js";
import { rankResults } from "./rank-results.js";

export function getObservedValue(
  profile: Profile,
  field: CriterionField,
  derived?: DerivedValue[],
): number | boolean | string | null {
  switch (field) {
    case "age":
      return profile.age ?? null;
    case "sex":
      return profile.sex ?? null;
    case "hba1c":
      return profile.hba1c ? normalizeHba1c(profile.hba1c).value : null;
    case "creatinine":
      return profile.creatinine
        ? normalizeCreatinine(profile.creatinine).value
        : null;
    case "height":
      return profile.height ? normalizeHeight(profile.height).value : null;
    case "weight":
      return profile.weight ? normalizeWeight(profile.weight).value : null;
    case "insulin_last_3_months":
      return profile.insulin_last_3_months ?? null;
    case "egfr":
      return derived
        ? (derived.find((v) => v.name === "eGFR")?.value ?? null)
        : (computeEgfr(profile) ?? null);
    case "bmi":
      return derived
        ? (derived.find((v) => v.name === "BMI")?.value ?? null)
        : (computeBmi(profile) ?? null);
    case "medications":
      return profile.medications?.join(", ") ?? null;
    case "stated_diagnoses":
      return profile.stated_diagnoses?.join(", ") ?? null;
  }
}

function compare(
  value: number | boolean | string,
  criterion: Criterion,
): boolean {
  const expected = criterion.value;
  switch (criterion.operator) {
    case "gte":
      return (
        typeof value === "number" &&
        typeof expected === "number" &&
        value >= expected
      );
    case "lte":
      return (
        typeof value === "number" &&
        typeof expected === "number" &&
        value <= expected
      );
    case "between":
      return (
        typeof value === "number" &&
        Array.isArray(expected) &&
        typeof expected[0] === "number" &&
        typeof expected[1] === "number" &&
        value >= expected[0] &&
        value <= expected[1]
      );
    case "eq":
      return value === expected;
    case "in":
      return Array.isArray(expected) && expected.includes(value as never);
    case "not_in":
      return Array.isArray(expected) && !expected.includes(value as never);
    case "is_true":
      return value === true;
    case "is_false":
      return value === false;
    default:
      return false;
  }
}

function evaluateCriterion(
  profile: Profile,
  criterion: Criterion,
  derived?: DerivedValue[],
): CriterionResult {
  const value =
    criterion.checkability === "manual_review" || !criterion.field
      ? null
      : getObservedValue(profile, criterion.field, derived);
  const status =
    criterion.checkability === "manual_review" || value === null
      ? "unknown"
      : compare(value, criterion) === (criterion.kind === "inclusion")
        ? "met"
        : "not_met";
  return {
    id: criterion.id,
    text: criterion.text,
    status,
    observedValue: value,
    observedUnit:
      value === null
        ? null
        : ((
            {
              age: "years",
              hba1c: "%",
              creatinine: "mg/dL",
              height: "cm",
              weight: "kg",
              egfr: "mL/min/1.73 m²",
              bmi: "kg/m²",
            } as Partial<Record<CriterionField, string>>
          )[criterion.field ?? "age"] ?? null),
    observedOrigin:
      value === null
        ? "unknown"
        : ["egfr", "bmi"].includes(criterion.field ?? "")
          ? "derived"
          : "profile",
    sourceId: criterion.sourceId,
    citation: { sourceId: criterion.sourceId, quote: criterion.sourceQuote },
  };
}

export function evaluateCriteria(
  profile: Profile,
  trials: Trial[],
  derived?: DerivedValue[],
): TrialResult[] {
  const results = trials.map((trial) => {
    const criteria = trial.criteria.map((criterion) =>
      evaluateCriterion(profile, criterion, derived),
    );
    const verdict: TrialResult["verdict"] = criteria.some(
      (criterion) => criterion.status === "not_met",
    )
      ? "excluded"
      : criteria.some((criterion) => criterion.status === "unknown")
        ? "pending"
        : "candidate";
    return {
      trialId: trial.trialId,
      title: trial.title,
      overallStatus: trial.overallStatus,
      phase: trial.phases ? trial.phases.join(", ") || null : trial.phase,
      verdict,
      criteria,
    };
  });
  return rankResults(results);
}

export function getDerivedValues(profile: Profile): DerivedValue[] {
  const values: DerivedValue[] = [];
  const egfr = computeEgfr(profile);
  if (egfr !== undefined)
    values.push({
      name: "eGFR",
      value: egfr,
      unit: "mL/min/1.73 m²",
      formulaName: "CKD-EPI 2021 kreatinin, bez rase",
      sourceReference:
        "Inker LA et al. (2021), DOI:10.1056/NEJMoa2102953, PMID:34554658; NIDDK, 2021 CKD-EPI Creatinine Equation.",
    });
  const bmi = computeBmi(profile);
  if (bmi !== undefined)
    values.push({
      name: "BMI",
      value: bmi,
      unit: "kg/m²",
      formulaName: "BMI = težina (kg) / visina (m)²",
      sourceReference: "CDC, Calculating BMI.",
    });
  return values;
}

export function missingFieldsForCriterion(
  profile: Profile,
  field: CriterionField,
  derived?: DerivedValue[],
): string[] {
  if (getObservedValue(profile, field, derived) !== null) return [];
  if (field === "egfr")
    return ["age", "sex", "creatinine"].filter((key) => {
      if (key === "age") return profile.age === undefined;
      if (key === "sex") return profile.sex === undefined;
      return profile.creatinine === undefined;
    });
  if (field === "bmi")
    return ["height", "weight"].filter((key) =>
      key === "height" ? !profile.height : !profile.weight,
    );
  return [field];
}
