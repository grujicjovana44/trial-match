import type { TrialResult } from "../../../../packages/shared/src/index.js";
import { motion } from "motion/react";
import {
  phaseLabel,
  recruitmentStatusLabel,
  summarizeCriteria,
  type RegistryLabel,
  trialAnchorId,
  trialRegistryUrl,
  verdictLabel,
} from "../result-view-model.js";
import { copy } from "../copy.js";
import { CriteriaSummaryBar } from "../motion/CriteriaSummaryBar.js";
import { enter } from "../motion/motion-presets.js";
import { CriterionRow } from "./CriterionRow.js";

function RegistryValue({ label }: { label: RegistryLabel }) {
  return label.known ? (
    <>{label.text}</>
  ) : (
    <span className="mono">{label.text}</span>
  );
}

export function TrialCard({
  trial,
  index,
}: {
  trial: TrialResult;
  index: number;
}) {
  const registryUrl = trialRegistryUrl(trial.trialId);
  // Polje koje nedostaje se izostavlja, bez podrazumevane vrednosti (FR-025).
  const recruitment = recruitmentStatusLabel(trial.overallStatus);
  const phase = phaseLabel(trial.phase);
  return (
    <motion.article
      className="trial-card"
      id={trialAnchorId(index)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...enter, delay: Math.min(index, 8) * 0.04 }}
    >
      <div className="trial-heading">
        <div>
          <p className="eyebrow mono">{trial.trialId}</p>
          <h3 id={`${trialAnchorId(index)}-title`} tabIndex={-1}>
            {trial.title}
          </h3>
        </div>
        <span className={`status-tag verdict-${trial.verdict}`}>
          {verdictLabel(trial.verdict)}
        </span>
      </div>
      {(recruitment !== null || phase !== null) && (
        <p className="trial-facts">
          {recruitment !== null && (
            <>
              {copy.trial.recruitment} <RegistryValue label={recruitment} />
            </>
          )}
          {recruitment !== null && phase !== null && " · "}
          {phase !== null && (
            <>
              {copy.trial.phase} <RegistryValue label={phase} />
            </>
          )}
        </p>
      )}
      {registryUrl !== null && (
        <p className="trial-links">
          <a href={registryUrl} target="_blank" rel="noopener noreferrer">
            {copy.trial.registryLink(trial.trialId)}{" "}
            <span aria-hidden="true">↗</span>
            <span className="visually-hidden"> {copy.trial.newTab}</span>
          </a>
        </p>
      )}
      <CriteriaSummaryBar summary={summarizeCriteria(trial.criteria)} />
      {trial.criteria.length > 0 ? (
        <ul className="criteria-list">
          {trial.criteria.map((criterion) => (
            <CriterionRow key={criterion.id} criterion={criterion} />
          ))}
        </ul>
      ) : (
        <p className="trial-empty">{copy.trial.noCriteria}</p>
      )}
    </motion.article>
  );
}
