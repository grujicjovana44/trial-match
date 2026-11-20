import type { TrialResult } from "../../../../packages/shared/src/index.js";
import { motion } from "motion/react";
import {
  phaseLabel,
  recruitmentStatusLabel,
  type RegistryLabel,
  criterionStatusShort,
  displayRegistryText,
  trialAnchorId,
  trialRegistryUrl,
  verdictLabel,
} from "../result-view-model.js";
import { copy } from "../copy.js";
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
  const uncertain = trial.criteria.filter(
    (criterion) => criterion.status === "unknown",
  );
  const exclusions = trial.criteria.filter(
    (criterion) =>
      criterion.status !== "unknown" && criterion.kind === "exclusion",
  );
  const inclusions = trial.criteria.filter(
    (criterion) =>
      criterion.status !== "unknown" && criterion.kind === "inclusion",
  );
  const untyped = trial.criteria.filter(
    (criterion) => criterion.status !== "unknown" && !criterion.kind,
  );
  const reasons = [
    ...trial.criteria.filter((criterion) => criterion.status === "not_met"),
    ...trial.criteria.filter((criterion) => criterion.status === "met"),
  ].slice(0, 3);
  const unknownCount = uncertain.length;
  const remainingUnknown = trial.criteria.filter(
    (criterion) => criterion.status === "unknown",
  );
  function section(title: string, items: typeof trial.criteria, id: string) {
    if (items.length === 0) return null;
    return (
      <section className="criterion-group" aria-labelledby={`${id}-heading`}>
        <h4 id={`${id}-heading`}>{title}</h4>
        <ul className="criteria-list">
          {items.map((criterion) => (
            <CriterionRow key={criterion.id} criterion={criterion} />
          ))}
        </ul>
      </section>
    );
  }
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
          <p className="eyebrow">
            Studija <span className="mono">{trial.trialId}</span>
          </p>
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
      {reasons.length > 0 && (
        <ul className="trial-reasons" aria-label="Glavni razlozi">
          {reasons.map((criterion) => (
            <li key={criterion.id}>
              <span className={`status-pill status-${criterion.status}`}>
                {criterionStatusShort(criterion.status, criterion.kind)}
              </span>{" "}
              {displayRegistryText(criterion.text)}
            </li>
          ))}
        </ul>
      )}
      {unknownCount > 0 && (
        <p className="trial-unknown-count">
          {unknownCount} {copy.trial.reviewCount(unknownCount)}
        </p>
      )}
      <details className="trial-details">
        <summary>{copy.trial.details}</summary>
        {trial.criteria.length > 0 ? (
          <div className="trial-detail-body">
            {section("Isključuje", exclusions, `exclusion-${index}`)}
            {section("Uključuje", inclusions, `inclusion-${index}`)}
            {section(
              "Isključuje",
              untyped.filter((criterion) => criterion.status === "not_met"),
              `untyped-exclusion-${index}`,
            )}
            {section(
              "Uključuje",
              untyped.filter((criterion) => criterion.status === "met"),
              `untyped-inclusion-${index}`,
            )}
            {remainingUnknown.length > 0 && (
              <details className="unknown-details">
                <summary>
                  {copy.trial.reviewGroup(remainingUnknown.length)}
                </summary>
                <ul className="criteria-list">
                  {remainingUnknown.map((criterion) => (
                    <CriterionRow key={criterion.id} criterion={criterion} />
                  ))}
                </ul>
              </details>
            )}
            <details className="technical-details">
              <summary>{copy.trial.technical}</summary>
              <ul>
                {trial.criteria.map((criterion) => (
                  <li key={criterion.id}>
                    ID segmenta: <span className="mono">{criterion.id}</span>;
                    izvor: <span className="mono">{criterion.sourceId}</span>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        ) : (
          <p className="trial-empty">{copy.trial.noCriteria}</p>
        )}
      </details>
    </motion.article>
  );
}
