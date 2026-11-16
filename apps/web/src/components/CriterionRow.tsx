import type { CriterionResult } from "../../../../packages/shared/src/index.js";
import {
  criterionStatusIcon,
  criterionStatusNote,
  criterionStatusShort,
  formatObservedValue,
} from "../result-view-model.js";
import { copy } from "../copy.js";

export function CriterionRow({ criterion }: { criterion: CriterionResult }) {
  const value = formatObservedValue(criterion.observedValue);
  return (
    <li className={`criterion criterion-${criterion.status}`}>
      <div className="criterion-main">
        <p className="criterion-status">
          <span className={`status-pill status-${criterion.status}`}>
            <span aria-hidden="true">
              {criterionStatusIcon(criterion.status)}
            </span>{" "}
            {criterionStatusShort(criterion.status)}
          </span>{" "}
          <span className="status-note">
            {criterionStatusNote(criterion.status)}
          </span>
        </p>
        <p className="criterion-text">{criterion.text}</p>
        <p className="criterion-evidence">
          {copy.criterion.value}{" "}
          <span className={value.missing ? "value-missing" : "mono"}>
            {value.text}
            {criterion.observedUnit ? ` ${criterion.observedUnit}` : ""}
          </span>{" "}
          ·{" "}
          {criterion.observedOrigin === "derived"
            ? "Izvedena vrednost"
            : criterion.observedOrigin === "profile"
              ? "Iz profila"
              : "Nepoznato"}{" "}
          · {copy.criterion.source}{" "}
          <span className="mono">{criterion.sourceId}</span>
        </p>
      </div>
      <blockquote>
        <q>{criterion.citation.quote}</q>
      </blockquote>
    </li>
  );
}
