import type { Profile } from "../../../../packages/shared/src/index.js";
import { normalizeCreatinine } from "./units.js";

export const EGFR_FORMULA_NAME = "CKD-EPI 2021 kreatinin, bez rase";
export const EGFR_SOURCE =
  "Inker LA et al. (2021), NEJM 385:1737–1749, DOI:10.1056/NEJMoa2102953, PMID:34554658; implementacioni izvor: NIDDK, 2021 CKD-EPI Creatinine Equation.";

export function computeEgfr(profile: Profile): number | undefined {
  const { age, sex, creatinine } = profile;
  if (age === undefined || sex === undefined || creatinine === undefined)
    return undefined;
  const normalized = normalizeCreatinine(creatinine);
  if (age < 0 || age > 120 || normalized.value < 0.1 || normalized.value > 20) {
    throw new RangeError("Vrednost je van tehničkih granica unosa.");
  }
  const female = sex === "female";
  const kappa = female ? 0.7 : 0.9;
  const alpha = female ? -0.241 : -0.302;
  const ratio = normalized.value / kappa;
  const result =
    142 *
    Math.pow(Math.min(ratio, 1), alpha) *
    Math.pow(Math.max(ratio, 1), -1.2) *
    Math.pow(0.9938, age) *
    (female ? 1.012 : 1);
  return Number(result.toFixed(2));
}
