import type { CriterionResult } from "../../../../packages/shared/src/index.js";
import {
  criterionKindTag,
  criterionStatusIcon,
  criterionStatusNote,
  criterionStatusShort,
  formatObservedValue,
  displayRegistryText,
  formatUnit,
} from "../result-view-model.js";
import { copy } from "../copy.js";

export function CriterionRow({ criterion }: { criterion: CriterionResult }) {
  const value = formatObservedValue(criterion.observedValue);
  // Bez vrednosti nema ni jedinice ni oznake porekla (T220).
  const unit = value.missing ? "" : formatUnit(criterion.observedUnit);
  const computed = !value.missing && criterion.observedOrigin === "derived";
  return (
    <li
      className={`criterion criterion-${criterion.status}`}
      data-kind={criterion.kind}
    >
      <div className="criterion-main">
        <p className="criterion-status">
          <span className={`status-pill status-${criterion.status}`}>
            <span aria-hidden="true">
              {criterionStatusIcon(criterion.status)}
            </span>{" "}
            {criterionStatusShort(criterion.status, criterion.kind)}
          </span>{" "}
          <span className="status-note">
            {criterionStatusNote(criterion.status, criterion.kind)}
          </span>
        </p>
        <p className="criterion-text">
          {criterionKindTag(criterion.kind) !== null && (
            <>
              <span className="criterion-kind">
                {criterionKindTag(criterion.kind)}
              </span>{" "}
            </>
          )}
          {displayRegistryText(criterion.text)}
        </p>
        <p className="criterion-evidence">
          {copy.criterion.value}{" "}
          <span className={value.missing ? "value-missing" : "mono"}>
            {value.text}
            {unit}
          </span>
          {computed && (
            <>
              {" "}
              <span className="chip-origin">{copy.criterion.computed}</span>
            </>
          )}
        </p>
      </div>
      {criterion.citation.quote.trim() !== criterion.text.trim() && (
        <blockquote>
          <q>{displayRegistryText(criterion.citation.quote)}</q>
        </blockquote>
      )}
    </li>
  );
}
