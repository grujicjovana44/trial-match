import MiniSearch from "minisearch";
import type { Profile, Trial } from "../../../../packages/shared/src/index.js";
import {
  getObservedValue,
  missingFieldsForCriterion,
} from "../matcher/evaluate-criteria.js";

export type RetrievedContext = {
  trials: Trial[];
  sourceIds: string[];
  sourceTexts: Map<string, string>;
  contextText: string;
};

export function retrieveTrials(
  profile: Profile,
  trials: Trial[],
  options: {
    maxCandidates: number;
    maxSnippets: number;
    maxContextChars: number;
  },
): RetrievedContext {
  type SearchTrial = Trial & { criteriaText: string };
  const index = new MiniSearch<SearchTrial>({
    fields: ["title", "conditions", "criteriaText"],
    idField: "trialId",
    storeFields: ["trialId"],
    searchOptions: {
      boost: { title: 2, conditions: 1, criteriaText: 1 },
      prefix: true,
    },
  });
  const documents: SearchTrial[] = trials.map((trial) => ({
    ...trial,
    criteriaText: trial.criteria.map((criterion) => criterion.text).join(" "),
  }));
  index.addAll(documents);
  const query = profile.stated_diagnoses?.join(" ") ?? "";
  const matchedIds = query
    ? new Set(
        index
          .search(query)
          .slice(0, options.maxCandidates)
          .map((hit) => String(hit.trialId)),
      )
    : new Set(
        trials.slice(0, options.maxCandidates).map((trial) => trial.trialId),
      );
  const selected = trials.filter((trial) => matchedIds.has(trial.trialId));
  const resolvableFields = new Set([
    "age",
    "sex",
    "hba1c",
    "creatinine",
    "height",
    "weight",
    "insulin_last_3_months",
  ]);
  const availableCriteria = (trial: Trial) =>
    trial.criteria.filter(
      (criterion) =>
        criterion.checkability === "auto" &&
        getObservedValue(profile, criterion.field) !== null,
    ).length;
  const resolvableCriteria = (trial: Trial) =>
    trial.criteria.filter(
      (criterion) =>
        criterion.checkability === "auto" &&
        getObservedValue(profile, criterion.field) === null &&
        missingFieldsForCriterion(profile, criterion.field).some((field) =>
          resolvableFields.has(field),
        ),
    ).length;
  selected.sort(
    (left, right) =>
      availableCriteria(right) - availableCriteria(left) ||
      resolvableCriteria(right) - resolvableCriteria(left) ||
      left.trialId.localeCompare(right.trialId, "en"),
  );
  selected.length = Math.min(selected.length, options.maxCandidates);
  const snippets: string[] = [];
  const sourceTexts = new Map<string, string>();
  for (const trial of selected) {
    for (const criterion of trial.criteria)
      sourceTexts.set(criterion.sourceId, criterion.sourceQuote);
  }
  let contextLength = 0;
  const contextSourceIds: string[] = [];
  for (const trial of selected) {
    for (const criterion of trial.criteria) {
      if (snippets.length >= options.maxSnippets) break;
      const next = `${criterion.sourceId}: ${criterion.sourceQuote}`;
      const addedLength = next.length + (snippets.length > 0 ? 1 : 0);
      if (contextLength + addedLength > options.maxContextChars) continue;
      snippets.push(next);
      contextLength += addedLength;
      contextSourceIds.push(criterion.sourceId);
    }
  }
  return {
    trials: selected,
    sourceIds: contextSourceIds,
    sourceTexts,
    contextText: snippets.join("\n"),
  };
}
