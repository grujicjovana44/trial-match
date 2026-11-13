import type {
  Profile,
  Question,
  Trial,
  TrialResult,
  DerivedValue,
} from "../../../../packages/shared/src/index.js";
import { missingFieldsForCriterion } from "../matcher/evaluate-criteria.js";

const questionCopy: Record<string, { text: string; options?: string[] }> = {
  age: { text: "Koliko godina ima osoba?", options: [] },
  sex: {
    text: "Koji je pol naveden za potrebe izračunavanja eGFR?",
    options: ["Ženski", "Muški"],
  },
  hba1c: {
    text: "Koja je poslednja poznata vrednost HbA1c i u kojoj jedinici?",
    options: [],
  },
  creatinine: {
    text: "Koja je poslednja poznata vrednost kreatinina i u kojoj jedinici?",
    options: [],
  },
  height: { text: "Koja je visina osobe i u kojoj jedinici?", options: [] },
  weight: { text: "Koja je težina osobe i u kojoj jedinici?", options: [] },
  insulin_last_3_months: {
    text: "Da li je osoba koristila insulin u poslednja 3 meseca?",
    options: ["Da", "Ne"],
  },
};

export function selectNextQuestion(
  profile: Profile,
  trials: Trial[],
  results: TrialResult[],
  derived?: DerivedValue[],
): Question | undefined {
  const verdictById = new Map(
    results.map((result) => [result.trialId, result.verdict]),
  );
  const resolutions = new Map<string, Set<string>>();
  for (const trial of trials) {
    if (verdictById.get(trial.trialId) === "excluded") continue;
    for (const criterion of trial.criteria) {
      if (criterion.checkability !== "auto") continue;
      const result = results
        .find((item) => item.trialId === trial.trialId)
        ?.criteria.find((item) => item.id === criterion.id);
      if (result?.status !== "unknown") continue;
      for (const field of missingFieldsForCriterion(
        profile,
        criterion.field ?? "age",
        derived,
      )) {
        const studies = resolutions.get(field) ?? new Set<string>();
        studies.add(trial.trialId);
        resolutions.set(field, studies);
      }
    }
  }
  const candidates = [...resolutions.entries()].filter(
    ([field]) => questionCopy[field],
  );
  candidates.sort(
    ([fieldA, trialsA], [fieldB, trialsB]) =>
      trialsB.size - trialsA.size || fieldA.localeCompare(fieldB, "en"),
  );
  const selected = candidates[0];
  if (!selected) return undefined;
  const [field, resolved] = selected;
  const copy = questionCopy[field];
  if (!copy) return undefined;
  return {
    field: field as Question["field"],
    text: copy.text,
    ...(copy.options ? { options: copy.options } : {}),
    trialsResolved: [...resolved].sort(),
  };
}
