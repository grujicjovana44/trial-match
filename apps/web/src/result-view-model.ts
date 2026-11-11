import type {
  CriterionResult,
  DerivedValue,
  Profile,
  ProfileField,
  RunResponse,
} from "../../../packages/shared/src/index.js";
import { copy } from "./copy.js";

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

const profileFieldOrder: ProfileField[] = [
  "age",
  "sex",
  "hba1c",
  "creatinine",
  "height",
  "weight",
  "insulin_last_3_months",
  "medications",
  "stated_diagnoses",
];

export function statusLabel(status: RunResponse["status"]): string {
  return statusLabels[status];
}

export function criterionStatusLabel(
  status: CriterionResult["status"],
): string {
  return criterionLabels[status];
}

export interface CriteriaSummary {
  total: number;
  met: number;
  notMet: number;
  unknown: number;
  label: string;
}

export function summarizeCriteria(
  criteria: readonly Pick<CriterionResult, "status">[],
): CriteriaSummary {
  const met = criteria.filter((c) => c.status === "met").length;
  const notMet = criteria.filter((c) => c.status === "not_met").length;
  const unknown = criteria.filter((c) => c.status === "unknown").length;
  const parts = [`${met} od ${criteria.length} ispunjeno`];
  if (notMet > 0) parts.push(`${notMet} nije ispunjeno`);
  if (unknown > 0) parts.push(`${unknown} nepoznato`);
  return {
    total: criteria.length,
    met,
    notMet,
    unknown,
    label: parts.join(", "),
  };
}

export function missingProfileFields(profile: Profile): string[] {
  return profileFieldOrder
    .filter((field) => !Object.hasOwn(profile, field))
    .map((field) => copy.profile.fields[field]);
}

export function resultHeading(result: RunResponse): string {
  if (result.status === "insufficient_evidence") {
    return result.reason === "no_matching_trial"
      ? copy.result.headingNoMatch
      : copy.result.headingNotInSources;
  }
  switch (result.status) {
    case "ok":
      return copy.result.headingOk;
    case "needs_clarification":
      return copy.result.headingClarification;
    case "rejected":
      return copy.result.headingRejected;
    case "error":
      return statusLabel(result.status);
  }
}

export type TrialVerdict = "candidate" | "pending" | "excluded";
export type CriterionStatus = CriterionResult["status"];

export function verdictLabel(verdict: TrialVerdict): string {
  return copy.trial.verdict[verdict];
}

export function criterionStatusShort(status: CriterionStatus): string {
  return copy.criterion.short[status];
}

export function criterionStatusNote(status: CriterionStatus): string {
  return copy.criterion.note[status];
}

export function criterionStatusIcon(status: CriterionStatus): string {
  return copy.criterion.icon[status];
}

export function formatNumber(value: number): string {
  return String(Math.round(value * 100) / 100).replace(".", ",");
}

export function formatObservedValue(value: number | boolean | string | null): {
  text: string;
  missing: boolean;
} {
  if (value === null) return { text: copy.criterion.missing, missing: true };
  if (typeof value === "number") {
    return { text: formatNumber(value), missing: false };
  }
  if (typeof value === "boolean") {
    return {
      text: value ? copy.criterion.yes : copy.criterion.no,
      missing: false,
    };
  }
  if (value === "male") {
    return { text: copy.criterion.male, missing: false };
  }
  if (value === "female") {
    return { text: copy.criterion.female, missing: false };
  }
  return { text: value, missing: false };
}

export interface ProfileChip {
  key: ProfileField;
  label: string;
  value: string;
  origin: "initial_input" | "answer" | "hypothesis" | null;
}

export interface DerivedChip {
  key: string;
  text: string;
  formula: string;
  source: string;
}

function profileValue(profile: Profile, key: ProfileField): string | null {
  switch (key) {
    case "age":
      return profile.age === undefined ? null : String(profile.age);
    case "sex":
      return profile.sex === undefined
        ? null
        : profile.sex === "male"
          ? copy.profile.sexMale
          : copy.profile.sexFemale;
    case "hba1c":
    case "creatinine":
    case "height":
    case "weight": {
      const measure = profile[key];
      if (measure === undefined) return null;
      const unit = measure.unit === "%" ? "%" : ` ${measure.unit}`;
      return `${formatNumber(measure.value)}${unit}`;
    }
    case "insulin_last_3_months":
      return profile.insulin_last_3_months === undefined
        ? null
        : profile.insulin_last_3_months
          ? copy.criterion.yes
          : copy.criterion.no;
    case "medications":
      return profile.medications?.join(", ") ?? null;
    case "stated_diagnoses":
      return profile.stated_diagnoses?.join(", ") ?? null;
  }
}

export function profileChips(profile: Profile): ProfileChip[] {
  return profileFieldOrder.flatMap((key) => {
    if (!Object.hasOwn(profile, key)) return [];
    const value = profileValue(profile, key);
    if (value === null) return [];
    return [
      {
        key,
        label: copy.profile.fields[key],
        value,
        origin: profile.provenance?.[key]?.origin ?? null,
      },
    ];
  });
}

export function derivedChips(derived: readonly DerivedValue[]): DerivedChip[] {
  return derived.map((item) => ({
    key: item.name,
    text: `${item.name} ≈ ${formatNumber(item.value)} ${item.unit}`,
    formula: item.formulaName,
    source: item.sourceReference,
  }));
}

export function profileAmbiguities(
  profile: Profile,
): { label: string; reason: string }[] {
  return (profile.ambiguities ?? []).map((ambiguity) => ({
    label: copy.profile.fields[ambiguity.field],
    reason: ambiguity.reason,
  }));
}

export function trialRegistryUrl(trialId: string): string | null {
  return /^NCT\d{8}$/.test(trialId)
    ? `https://clinicaltrials.gov/study/${trialId}`
    : null;
}

export function trialAnchorId(index: number): string {
  return `trial-${index + 1}`;
}

export type ModeBadgeModel =
  { kind: "demo" } | { kind: "live"; modelId: string | null };

export function modeBadge(
  meta: RunResponse["meta"] | null,
): ModeBadgeModel | null {
  if (meta === null) return null;
  return meta.demoMode
    ? { kind: "demo" }
    : { kind: "live", modelId: meta.modelId || null };
}

const monthNames = [
  "januar",
  "februar",
  "mart",
  "april",
  "maj",
  "jun",
  "jul",
  "avgust",
  "septembar",
  "oktobar",
  "novembar",
  "decembar",
];

export function formatSnapshotDate(iso: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const monthName = monthNames[month - 1];
  if (monthName === undefined || day < 1) return null;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ][month - 1];
  if (daysInMonth === undefined || day > daysInMonth) return null;
  return `${day}. ${monthName} ${year}.`;
}
