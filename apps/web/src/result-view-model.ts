import type {
  CriterionResult,
  Profile,
  RunResponse,
} from "../../../packages/shared/src/index.js";

const statusLabels: Record<RunResponse["status"], string> = {
  ok: "Preliminarna provera završena",
  needs_clarification: "Potrebna je dopuna",
  insufficient_evidence: "Nema dovoljno dokaza",
  rejected: "Zahtev nije podržan",
  error: "Provera nije završena",
};

const criterionLabels: Record<CriterionResult["status"], string> = {
  met: "Ispunjen prema dostupnim podacima",
  not_met: "Nije ispunjen prema dostupnim podacima",
  unknown: "Nepoznato — potrebna je dopuna ili ručna provera",
};

const profileFieldLabels: Record<string, string> = {
  age: "starost",
  sex: "pol za eGFR",
  hba1c: "HbA1c",
  creatinine: "kreatinin",
  height: "visina",
  weight: "težina",
  insulin_last_3_months: "upotreba insulina",
  medications: "terapije",
  stated_diagnoses: "navedena dijagnoza",
};

export function statusLabel(status: RunResponse["status"]): string {
  return statusLabels[status];
}

export function criterionStatusLabel(
  status: CriterionResult["status"],
): string {
  return criterionLabels[status];
}

export function missingProfileFields(profile: Profile): string[] {
  return Object.keys(profileFieldLabels)
    .filter((field) => !Object.hasOwn(profile, field))
    .map((field) => profileFieldLabels[field] ?? field);
}
