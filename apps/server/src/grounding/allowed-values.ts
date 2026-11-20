import type {
  DerivedValue,
  Profile,
  Trial,
  TrialResult,
} from "../../../../packages/shared/src/index.js";
import {
  normalizeCreatinine,
  normalizeHba1c,
  normalizeHeight,
  normalizeWeight,
} from "../derived/units.js";
import { extractNumbers } from "./numeric.js";

function flatten(value: unknown): number[] {
  if (typeof value === "number") return Number.isFinite(value) ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(flatten);
  return [];
}

/**
 * Brojevi koje objašnjenje sme da navede: vrednosti profila (kako su date i
 * normalizovane), izvedene vrednosti, posmatrane vrednosti kriterijuma, pragovi
 * pravila i brojevi iz izvornih tekstova (`sourceTexts`); pozivalac prosleđuje
 * samo odlomke koje objašnjenje samo navodi, ne sve dozvoljene izvore.
 */
export function collectAllowedNumbers(input: {
  profile: Profile;
  derived: DerivedValue[];
  results: TrialResult[];
  trials: Trial[];
  sourceTexts: Iterable<string>;
}): number[] {
  const { profile } = input;
  const values: number[] = [];
  if (profile.age !== undefined) values.push(profile.age);
  const measured: Array<
    [
      { value: number; unit: string } | undefined,
      (m: { value: number; unit: string }) => { value: number },
    ]
  > = [
    [profile.hba1c, normalizeHba1c],
    [profile.creatinine, normalizeCreatinine],
    [profile.height, normalizeHeight],
    [profile.weight, normalizeWeight],
  ];
  for (const [measurement, normalize] of measured) {
    if (!measurement) continue;
    values.push(measurement.value);
    try {
      values.push(normalize(measurement).value);
    } catch {
      // Nepoznata jedinica: dozvoljena je samo vrednost kako je data.
    }
  }
  for (const item of input.derived) values.push(...flatten(item.value));
  for (const trial of input.results)
    for (const criterion of trial.criteria)
      values.push(...flatten(criterion.observedValue));
  for (const trial of input.trials)
    for (const criterion of trial.criteria)
      if ("value" in criterion) values.push(...flatten(criterion.value));
  for (const text of input.sourceTexts) values.push(...extractNumbers(text));
  return values;
}
