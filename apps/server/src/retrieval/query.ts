import {
  ProfileSchema,
  type Profile,
} from "../../../../packages/shared/src/index.js";

export const SR_EN_LEXICON_VERSION = "sr-en-clinical-v1";

const diagnoses: Readonly<Record<string, string>> = {
  "dijabetes tip 2": "type 2 diabetes",
  "dijabetes tipa 2": "type 2 diabetes",
  "dijabetes melitus tip 2": "type 2 diabetes",
  "dijabetes melitus tipa 2": "type 2 diabetes",
  "tip 2 dijabetes": "type 2 diabetes",
  "diabetes mellitus type 2": "type 2 diabetes",
  "type 2 diabetes": "type 2 diabetes",
  t2dm: "type 2 diabetes",
};

function normalizeTerm(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

export function buildRetrievalQuery(profileInput: Profile | unknown): string {
  const profile: Profile = ProfileSchema.parse(profileInput);
  const terms = (profile.stated_diagnoses ?? [])
    .map((diagnosis) => {
      const normalized = normalizeTerm(diagnosis);
      return diagnoses[normalized] ?? normalized;
    })
    .filter(Boolean);
  return [...new Set(terms)]
    .sort((left, right) => left.localeCompare(right, "en"))
    .join("; ");
}
