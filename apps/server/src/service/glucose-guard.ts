import type { Extraction } from "../../../../packages/shared/src/index.js";

// JS `\b` je samo ASCII, pa se koriste Unicode granice reči.
const L = String.raw`(?<!\p{L})`;
const R = String.raw`(?!\p{L})`;
// "šećer" bez nastavka "-na/-ne" (šećerna bolest = dijabetes); "šećer u krvi" počinje istim pojmom.
const GLUCOSE = new RegExp(
  String.raw`${L}(?:šećer(?:a|u|om)?|secer(?:a|u|om)?|шећер(?:а|у|ом)?|sugar|glucose|blood\s+sugar|glukoz(?:a|e|u|om)|глукоз(?:а|е|у|ом)|glikemij(?:a|e|u|om)|гликемиј(?:а|е|у|ом))${R}`,
  "iu",
);
const HBA1C = new RegExp(
  String.raw`${L}(?:hb\s?a1c|a1c|хб\s?а1ц|(?:glikozilirani|glikozilisani|glikirani|glikovani|гликозилирани|гликозилисани|гликирани|гликовани)\s+(?:hemoglobin|хемоглобин))${R}`,
  "iu",
);

export const GLUCOSE_AMBIGUITY_REASON =
  "Vrednost šećera može biti HbA1c ili glukoza.";

export function hasGlucoseWithoutHba1c(text: string): boolean {
  return GLUCOSE.test(text) && !HBA1C.test(text);
}

/**
 * Deterministička zaštita: ako unos pominje šećer/glukozu bez eksplicitnog HbA1c,
 * izvučena vrednost hba1c se odbacuje i beleži se dvosmislenost.
 */
export function applyGlucoseGuard(
  text: string,
  extraction: Extraction,
): { extraction: Extraction; triggered: boolean } {
  if (!hasGlucoseWithoutHba1c(text)) return { extraction, triggered: false };
  const { hba1c: _removed, ...profile } = extraction.profile;
  void _removed;
  const ambiguities = [...(profile.ambiguities ?? [])];
  if (!ambiguities.some((item) => item.field === "hba1c"))
    ambiguities.push({ field: "hba1c", reason: GLUCOSE_AMBIGUITY_REASON });
  return {
    extraction: { ...extraction, profile: { ...profile, ambiguities } },
    triggered: true,
  };
}
