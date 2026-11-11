import type { TrialResult } from "../../../../packages/shared/src/index.js";
import {
  summarizeCriteria,
  trialAnchorId,
  verdictLabel,
} from "../result-view-model.js";
import { copy } from "../copy.js";

export function TrialOverview({ trials }: { trials: readonly TrialResult[] }) {
  if (trials.length <= 1) return null;
  return (
    <nav className="trial-overview" aria-labelledby="overview-heading">
      <h3 id="overview-heading">{copy.overview.heading}</h3>
      <p className="overview-count">{copy.overview.count(trials.length)}</p>
      <ol>
        {trials.map((trial, index) => (
          <li key={trial.trialId}>
            <a
              href={`#${trialAnchorId(index)}`}
              onClick={(event) => {
                // Skok pregledača na #trial-N bi posle ovog rukovaoca vratio
                // fokus na <body>; zato se skok zaustavlja i fokus (koji
                // sam pomera prikaz) postavlja direktno na naslov studije.
                const title = document.getElementById(
                  `${trialAnchorId(index)}-title`,
                );
                if (!title) return;
                event.preventDefault();
                title.focus();
              }}
            >
              <span className="mono">{trial.trialId}</span>{" "}
              <span className="overview-verdict">
                {verdictLabel(trial.verdict)}
              </span>{" "}
              ·{" "}
              <span className="overview-summary">
                {summarizeCriteria(trial.criteria).label}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
