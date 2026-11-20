import type { ProfileField } from "../../../../packages/shared/src/index.js";

// JS `\b` je samo ASCII, pa se koriste Unicode granice reči.
const LABELS: Partial<Record<ProfileField, string>> = {
  hba1c: String.raw`hb\s?a1c|a1c|(?:glikozilirani|glikirani|glikovani)\s+hemoglobin`,
  creatinine: String.raw`kreatinin|creatinine`,
  height: String.raw`visina|height`,
  weight: String.raw`težina|tezina|weight`,
};

const cache = new Map<ProfileField, RegExp>();

function labelPattern(field: ProfileField): RegExp | undefined {
  const labels = LABELS[field];
  if (labels === undefined) return undefined;
  let pattern = cache.get(field);
  if (!pattern) {
    pattern = new RegExp(
      String.raw`^\s*(?:${labels})(?!\p{L})\s*[:=]?\s*`,
      "iu",
    );
    cache.set(field, pattern);
  }
  return pattern;
}

/**
 * Uklanja vodeću oznaku traženog polja ("HbA1c 8,1%", "kreatinin: 1,3 mg/dL")
 * da bi odgovor počinjao brojem. Uklanja se samo oznaka polja koje se traži.
 */
export function stripAnswerLabel(field: ProfileField, answer: string): string {
  const pattern = labelPattern(field);
  return pattern ? answer.replace(pattern, "") : answer;
}
