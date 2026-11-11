import type {
  DerivedValue,
  Profile,
} from "../../../../packages/shared/src/index.js";
import {
  derivedChips,
  missingProfileFields,
  profileAmbiguities,
  profileChips,
} from "../result-view-model.js";
import { copy } from "../copy.js";

export function ProfileCard({
  profile,
  derived,
  sourceText,
}: {
  profile: Profile;
  derived: readonly DerivedValue[];
  sourceText: string | null;
}) {
  const chips = profileChips(profile);
  const derivedValues = derivedChips(derived);
  const missing = missingProfileFields(profile);
  const ambiguities = profileAmbiguities(profile);

  return (
    <section className="profile-card" aria-labelledby="profile-card-heading">
      <h3 id="profile-card-heading">{copy.profile.heading}</h3>
      {sourceText !== null && (
        <>
          <p className="profile-label">{copy.profile.sourceLabel}</p>
          <p className="source-text">{sourceText}</p>
        </>
      )}
      <p className="profile-label">{copy.profile.extractedLabel}</p>
      {chips.length > 0 ? (
        <ul className="chip-list">
          {chips.map((chip) => (
            <li className="chip" key={chip.key}>
              <span className="chip-label">{chip.label}</span>{" "}
              <span className="mono">{chip.value}</span>
              {chip.origin === "answer" && (
                <span className="chip-origin">{copy.profile.originAnswer}</span>
              )}
              {chip.origin === "hypothesis" && (
                <span className="chip-origin chip-hypothetical">
                  {copy.profile.originHypothesis}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="profile-empty">{copy.profile.noneExtracted}</p>
      )}
      {derivedValues.length > 0 && (
        <>
          <p className="profile-label">{copy.profile.derivedLabel}</p>
          <ul className="chip-list">
            {derivedValues.map((chip) => (
              <li className="chip chip-derived" key={chip.key}>
                <span className="mono">{chip.text}</span>{" "}
                <span className="chip-origin">
                  {copy.profile.derivedSuffix}
                </span>
              </li>
            ))}
          </ul>
          <ul className="formula-list">
            {derivedValues.map((chip) => (
              <li key={chip.key}>
                {copy.profile.formula(chip.formula, chip.source)}
              </li>
            ))}
          </ul>
        </>
      )}
      {missing.length > 0 && (
        <>
          <p className="profile-label">{copy.profile.missingLabel}</p>
          <ul className="chip-list">
            {missing.map((field) => (
              <li className="chip chip-missing" key={field}>
                {field}
              </li>
            ))}
          </ul>
        </>
      )}
      {ambiguities.length > 0 && (
        <>
          <p className="profile-label">{copy.profile.ambiguousLabel}</p>
          <ul className="formula-list">
            {ambiguities.map((ambiguity, index) => (
              <li key={`${ambiguity.label}-${index}`}>
                {ambiguity.label}: {ambiguity.reason}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
