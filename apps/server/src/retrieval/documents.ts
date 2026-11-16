import type { Trial } from "../../../../packages/shared/src/index.js";
import type { VectorKind } from "./vector-store.js";

export type RagDocument = {
  id: string;
  trialId: string;
  kind: VectorKind;
  sourceId?: string;
  text: string;
};

export function buildRagDocuments(trials: readonly Trial[]): RagDocument[] {
  const documents: RagDocument[] = [];
  for (const trial of [...trials].sort((left, right) =>
    left.trialId.localeCompare(right.trialId, "en"),
  )) {
    const studyText = [trial.title, ...trial.conditions, trial.summary ?? ""]
      .filter(Boolean)
      .join("\n");
    documents.push({
      id: `${trial.trialId}#study`,
      trialId: trial.trialId,
      kind: "study",
      text: studyText,
    });
    for (const criterion of trial.criteria) {
      documents.push({
        id: criterion.id,
        trialId: trial.trialId,
        kind: "passage",
        sourceId: criterion.sourceId,
        text: criterion.sourceQuote,
      });
    }
  }
  return documents;
}
