import type { Profile } from "../../../../packages/shared/src/index.js";
import { normalizeHeight, normalizeWeight } from "./units.js";

export const BMI_FORMULA_NAME = "BMI = težina (kg) / visina (m)²";
export const BMI_SOURCE =
  "Centers for Disease Control and Prevention (CDC), Calculating BMI.";

export function computeBmi(profile: Profile): number | undefined {
  if (profile.height === undefined || profile.weight === undefined)
    return undefined;
  const height = normalizeHeight(profile.height).value;
  const weight = normalizeWeight(profile.weight).value;
  if (height < 50 || height > 250 || weight < 2 || weight > 400) {
    throw new RangeError("Vrednost je van tehničkih granica unosa.");
  }
  return Number((weight / (height / 100) ** 2).toFixed(2));
}
