import {
  ProfileSchema,
  type DerivedValue,
  type Profile,
} from "../../../../packages/shared/src/index.js";

export const SR_EN_LEXICON_VERSION = "sr-en-clinical-v2";

const diagnoses: Readonly<Record<string, string>> = {
  "dijabetes tip 2": "type 2 diabetes",
  "dijabetes tipa 2": "type 2 diabetes",
  "dijabetes melitus tip 2": "type 2 diabetes",
  "dijabetes melitus tipa 2": "type 2 diabetes",
  "tip 2 dijabetes": "type 2 diabetes",
  "diabetes mellitus type 2": "type 2 diabetes",
  "type 2 diabetes": "type 2 diabetes",
  t2dm: "type 2 diabetes",
  gojaznost: "obesity",
  obesity: "obesity",
  "prekomerna tezina": "overweight",
  overweight: "overweight",
  hipertenzija: "hypertension",
  "povisen krvni pritisak": "high blood pressure hypertension",
  hypertension: "hypertension",
  "visok krvni pritisak": "high blood pressure hypertension",
  "bubrezna bolest": "kidney disease renal disease",
  "hronicna bubrezna bolest": "chronic kidney disease CKD",
  "bolest bubrega": "kidney disease renal disease",
  "hronicna bolest bubrega": "chronic kidney disease CKD",
  "renal disease": "renal disease kidney disease",
  "kidney disease": "kidney disease renal disease",
  "chronic kidney disease": "chronic kidney disease CKD",
  dislipidemija: "dyslipidemia",
  dyslipidemia: "dyslipidemia",
  hiperlipidemija: "hyperlipidemia",
  hyperlipidemia: "hyperlipidemia",
  "koronarna bolest": "coronary artery disease",
  "koronarna bolest srca": "coronary artery disease",
  "coronary artery disease": "coronary artery disease",
  astma: "asthma",
  asthma: "asthma",
  depresija: "depression",
  depression: "depression",
};

const cyrillicToLatin: Readonly<Record<string, string>> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  ђ: "dj",
  е: "e",
  ж: "z",
  з: "z",
  и: "i",
  ј: "j",
  к: "k",
  л: "l",
  љ: "lj",
  м: "m",
  н: "n",
  њ: "nj",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  ћ: "c",
  у: "u",
  ф: "f",
  х: "h",
  ц: "c",
  ч: "c",
  џ: "dz",
  ш: "s",
};

export function normalizeClinicalTerm(value: string): string {
  const transliterated = [...value.toLocaleLowerCase("sr")]
    .map((character) => cyrillicToLatin[character] ?? character)
    .join("");
  return transliterated
    .replace(/đ/gu, "dj")
    .replace(/dž/gu, "dz")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

export type RetrievalQuery = {
  text: string;
  untranslatedTerms: string[];
  aspects: string[];
};

function translatedTerm(value: string): {
  value: string;
  sourceAlias?: string;
  untranslated?: string;
} {
  const normalized = normalizeClinicalTerm(value);
  const translation = diagnoses[normalized];
  return translation
    ? {
        value: translation,
        sourceAlias:
          translation === "type 2 diabetes" ? "dijabetes tip 2" : normalized,
      }
    : { value: normalized, untranslated: normalized };
}

export function buildRetrievalQueries(
  profileInput: Profile | unknown,
  derived: readonly DerivedValue[] = [],
): RetrievalQuery {
  const profile: Profile = ProfileSchema.parse(profileInput);
  const aspects: Array<{ name: string; value: string }> = [];
  const untranslatedTerms = new Set<string>();

  for (const diagnosis of profile.stated_diagnoses ?? []) {
    const translated = translatedTerm(diagnosis);
    aspects.push({ name: "diagnosis", value: translated.value });
    if (translated.sourceAlias && translated.sourceAlias !== translated.value)
      aspects.push({
        name: "diagnosis_source_alias",
        value: translated.sourceAlias,
      });
    if (translated.untranslated) untranslatedTerms.add(translated.untranslated);
  }
  if (profile.hba1c)
    aspects.push({
      name: "hba1c",
      value: "hba1c",
    });
  if (profile.creatinine)
    aspects.push({
      name: "creatinine kidney function",
      value: "creatinine kidney function renal",
    });
  const egfr = derived.find((value) => value.name === "eGFR");
  if (egfr)
    aspects.push({
      name: "egfr",
      value: "egfr kidney function renal",
    });
  const bmi = derived.find((value) => value.name === "BMI");
  if (bmi)
    aspects.push({
      name: "bmi",
      value: "bmi body mass index",
    });
  for (const medication of profile.medications ?? []) {
    const translated = translatedTerm(medication);
    aspects.push({ name: "medication", value: translated.value });
    if (translated.sourceAlias && translated.sourceAlias !== translated.value)
      aspects.push({
        name: "medication_source_alias",
        value: translated.sourceAlias,
      });
    if (translated.untranslated) untranslatedTerms.add(translated.untranslated);
  }

  const queries = [...new Set(aspects.map(({ value }) => value.trim()).filter(Boolean))];
  return {
    text: queries.join("; "),
    untranslatedTerms: [...untranslatedTerms].sort((a, b) => a.localeCompare(b, "en")),
    aspects: aspects.map(({ name }) => name),
  };
}

export function buildRetrievalQuery(profileInput: Profile | unknown): string {
  return buildRetrievalQueries(profileInput).text;
}
