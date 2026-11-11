import type { ReactNode } from "react";
import { motion } from "motion/react";
import type { RunResponse } from "../../../../packages/shared/src/index.js";
import type { Ref } from "react";
import { copy } from "../copy.js";
import { enter } from "../motion/motion-presets.js";
import { SavedNotice } from "../motion/SavedNotice.js";
import { resultHeading } from "../result-view-model.js";
import { ClarificationForm } from "./ClarificationForm.js";
import { HypothesisForm } from "./HypothesisForm.js";
import { ProfileCard } from "./ProfileCard.js";
import { TrialCard } from "./TrialCard.js";
import { TrialOverview } from "./TrialOverview.js";
import { ResultMeta } from "./ResultMeta.js";

export function ResultPanel({
  result,
  stale,
  headingRef,
  sourceText,
  showSaved,
  busy,
  onAnswer,
  clarificationRef,
  resultSeq,
  onHypothesis,
  isHypothesis,
  hypothesisText,
  children,
}: {
  result: RunResponse;
  stale: boolean;
  headingRef?: Ref<HTMLHeadingElement>;
  sourceText: string | null;
  showSaved: boolean;
  busy: boolean;
  onAnswer: (text: string) => void;
  clarificationRef?: Ref<HTMLHeadingElement>;
  resultSeq: number;
  onHypothesis: (text: string) => void;
  isHypothesis: boolean;
  hypothesisText: string | null;
  children?: ReactNode;
}) {
  return (
    <motion.section
      className={stale ? "panel results-panel is-stale" : "panel results-panel"}
      aria-labelledby="results-heading"
      aria-busy={stale || undefined}
      inert={stale}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={enter}
    >
      {stale && <p className="stale-banner">{copy.processing.stale}</p>}
      {showSaved && !stale && <SavedNotice />}
      {isHypothesis && !stale && (
        <div className="hypothesis-banner">
          <strong>{copy.result.hypothesisBanner}</strong>
          {hypothesisText && (
            <span>{copy.result.hypothesisChange(hypothesisText)}</span>
          )}
        </div>
      )}
      <div className="results-heading">
        <div>
          <p className="eyebrow">
            {isHypothesis ? copy.result.eyebrowHypothesis : copy.result.eyebrow}
          </p>
          <h2 id="results-heading" tabIndex={-1} ref={headingRef}>
            {resultHeading(result)}
          </h2>
        </div>
      </div>
      {(result.status === "ok" ||
        result.status === "needs_clarification" ||
        result.status === "error") && (
        <p className="explanation">{result.explanation}</p>
      )}
      {result.status === "insufficient_evidence" &&
        result.reason === "no_matching_trial" && (
          <>
            <p className="explanation">{copy.result.noMatchBody}</p>
            <p className="explanation outcome-detail">
              {copy.result.noMatchDetail}
            </p>
            <p className="explanation system-explanation">
              <span className="profile-label">
                {copy.result.systemExplanation}
              </span>{" "}
              {result.explanation}
            </p>
          </>
        )}
      {result.status === "insufficient_evidence" &&
        result.reason === "not_in_sources" && (
          <p className="explanation">{copy.result.notInSourcesBody}</p>
        )}
      {result.status === "rejected" && (
        <>
          <p className="explanation">{copy.result.rejectedBody}</p>
          <p className="explanation">{copy.result.rejectedNext}</p>
          <p className="explanation system-explanation">
            <span className="profile-label">
              {copy.result.systemExplanation}
            </span>{" "}
            {result.explanation}
          </p>
        </>
      )}
      {result.profile && (
        <ProfileCard
          profile={result.profile}
          derived={result.derived}
          sourceText={sourceText}
        />
      )}
      <TrialOverview trials={result.results} />
      {result.results.length > 0 && (
        <div className="trial-list">
          {result.results.map((trial, index) => (
            <TrialCard key={trial.trialId} trial={trial} index={index} />
          ))}
        </div>
      )}
      {result.status === "needs_clarification" && result.question && (
        <ClarificationForm
          key={resultSeq}
          question={result.question}
          busy={busy}
          onAnswer={onAnswer}
          headingRef={clarificationRef}
        />
      )}
      {(result.status === "ok" ||
        (result.status === "insufficient_evidence" &&
          result.reason === "no_matching_trial")) && (
        <HypothesisForm key={resultSeq} busy={busy} onSubmit={onHypothesis} />
      )}
      {children}
      <ResultMeta meta={result.meta} />
    </motion.section>
  );
}
