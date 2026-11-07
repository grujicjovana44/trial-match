import type { TrialResult } from "../../../../packages/shared/src/index.js";

const verdictRank = { candidate: 0, pending: 1, excluded: 2 } as const;

export function rankResults(results: TrialResult[]): TrialResult[] {
  return [...results].sort((a, b) => {
    const verdict = verdictRank[a.verdict] - verdictRank[b.verdict];
    if (verdict !== 0) return verdict;
    const aMet =
      a.criteria.filter((criterion) => criterion.status === "met").length /
      Math.max(a.criteria.length, 1);
    const bMet =
      b.criteria.filter((criterion) => criterion.status === "met").length /
      Math.max(b.criteria.length, 1);
    if (aMet !== bMet) return bMet - aMet;
    return a.trialId.toUpperCase().localeCompare(b.trialId.toUpperCase(), "en");
  });
}
