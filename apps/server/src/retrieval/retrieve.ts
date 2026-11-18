import MiniSearch from "minisearch";
import type {
  Profile,
  Trial,
  DerivedValue,
} from "../../../../packages/shared/src/index.js";
import { buildRagDocuments, type RagDocument } from "./documents.js";
import { buildRetrievalQueries } from "./query.js";
import { filterKnownMetadata } from "./metadata.js";
import type { EmbeddingFailureReason } from "./embeddings.js";
import type { AppliedReranker, RerankerFallbackReason } from "./hybrid-retrieve.js";

export type RetrievedContext = {
  trials: Trial[];
  sourceIds: string[];
  passageIds: string[];
  sourceTexts: Map<string, string>;
  contextText: string;
  retrievalTrace?: {
    untranslatedTerms: string[];
    embedding: "used" | "lexical_fallback" | "not_needed";
    retrievalMode: "hybrid" | "lexical_fallback" | "lexical_only";
    fallbackReason?: EmbeddingFailureReason;
    vectorHitCount: number;
    reranking: "deterministic" | "gemini" | "cohere" | "rrf_fallback" | "disabled";
    appliedReranker: AppliedReranker;
    rerankerFallbackReason?: RerankerFallbackReason;
    metadataFilters: { state?: string; status?: string };
  };
};

export type RetrievalOptions = {
  maxCandidates: number;
  maxSnippets: number;
  maxContextChars: number;
  rerank?: boolean;
  metadataFilters?: { state?: string; status?: string };
};

type LexicalIndex = {
  search: MiniSearch<RagDocument>;
  documentsById: Map<string, RagDocument>;
};
const lexicalIndexes = new WeakMap<Trial[], LexicalIndex>();

function lexicalIndexFor(trials: Trial[]): LexicalIndex {
  const cached = lexicalIndexes.get(trials);
  if (cached) return cached;
  const documents = buildRagDocuments(trials);
  const search = new MiniSearch<RagDocument>({
    fields: ["text"],
    idField: "id",
    searchOptions: { prefix: true },
  });
  search.addAll(documents);
  const index = {
    search,
    documentsById: new Map(
      documents.map((document) => [document.id, document]),
    ),
  };
  lexicalIndexes.set(trials, index);
  return index;
}

function reciprocalRankFusion(
  rankings: readonly (readonly string[])[],
): string[] {
  const scores = new Map<string, number>();
  for (const ranking of rankings) {
    const seen = new Set<string>();
    ranking.forEach((id, index) => {
      if (seen.has(id)) return;
      seen.add(id);
      scores.set(id, (scores.get(id) ?? 0) + 1 / (60 + index + 1));
    });
  }
  return [...scores]
    .sort(
      ([leftId, leftScore], [rightId, rightScore]) =>
        rightScore - leftScore || leftId.localeCompare(rightId, "en"),
    )
    .map(([id]) => id);
}

export function retrieveTrials(
  profile: Profile,
  trials: Trial[],
  options: RetrievalOptions & {
    derived?: DerivedValue[];
    excludeFields?: string[];
  },
): RetrievedContext {
  const { search, documentsById } = lexicalIndexFor(trials);
  const trialsById = new Map(trials.map((trial) => [trial.trialId, trial]));
  const metadata = filterKnownMetadata(trials, options.metadataFilters);
  const allowedTrialIds = new Set(
    metadata.trials.map((trial) => trial.trialId),
  );
  const queries = buildRetrievalQueries(profile, options.derived);
  const queryTexts = queries.text
    .split(";")
    .map((query) => query.trim())
    .filter(Boolean);
  const studyRankings: string[][] = [];
  const passageRankings: string[][] = [];
  for (const query of queryTexts) {
    const hits = search
      .search(query)
      .filter((hit) => hit.score >= 0.05)
      .sort(
        (left, right) =>
          right.score - left.score ||
          String(left.id).localeCompare(String(right.id), "en"),
      );
    studyRankings.push(
      hits
        .filter((hit) => {
          const document = documentsById.get(String(hit.id));
          return (
            document?.kind === "study" && allowedTrialIds.has(document.trialId)
          );
        })
        .map((hit) => documentsById.get(String(hit.id))!.trialId),
    );
    passageRankings.push(
      hits
        .filter((hit) => {
          const document = documentsById.get(String(hit.id));
          return (
            document?.kind === "passage" &&
            allowedTrialIds.has(document.trialId)
          );
        })
        .map((hit) => String(hit.id)),
    );
  }
  const rankedTrialIds =
    queryTexts.length === 0
      ? [...allowedTrialIds].sort((a, b) => a.localeCompare(b, "en"))
      : reciprocalRankFusion([
          ...studyRankings,
          ...passageRankings.map((ranking) =>
            ranking
              .map((id) => documentsById.get(id)?.trialId)
              .filter((id): id is string => id !== undefined),
          ),
        ]);
  const selectedIds = new Set(rankedTrialIds.slice(0, options.maxCandidates));
  const selected = rankedTrialIds
    .filter((trialId) => selectedIds.has(trialId))
    .map((trialId) => trialsById.get(trialId))
    .filter((trial): trial is Trial => trial !== undefined);
  const sourceTexts = new Map<string, string>();
  for (const trial of selected)
    for (const criterion of trial.criteria) {
      sourceTexts.set(
        criterion.sourceId,
        criterion.sourceId === `${trial.trialId}#unsplit-1` &&
          trial.eligibilityText !== undefined
          ? trial.eligibilityText
          : criterion.sourceQuote,
      );
    }

  const fallbackPassageIds =
    queryTexts.length === 0
      ? [...documentsById.values()]
          .filter((document) => document.kind === "passage")
          .map((document) => document.id)
      : reciprocalRankFusion(passageRankings);
  const snippets: string[] = [];
  const sourceIds: string[] = [];
  const passageIds: string[] = [];
  let contextLength = 0;
  for (const id of fallbackPassageIds) {
    if (snippets.length >= options.maxSnippets) break;
    const document = documentsById.get(id);
    if (
      !document?.sourceId ||
      !selectedIds.has(document.trialId) ||
      options.excludeFields?.includes(
        trialsById
          .get(document.trialId)
          ?.criteria.find((criterion) => criterion.id === id)?.field ?? "",
      )
    )
      continue;
    const snippet = `${document.sourceId}: ${document.text}`;
    const addedLength = snippet.length + (snippets.length > 0 ? 1 : 0);
    if (contextLength + addedLength > options.maxContextChars) continue;
    snippets.push(snippet);
    sourceIds.push(document.sourceId);
    passageIds.push(id);
    contextLength += addedLength;
  }
  console.info(
    JSON.stringify({ event: "retrieval_reranker", reranker: "disabled" }),
  );
  return {
    trials: selected,
    sourceIds,
    passageIds,
    sourceTexts,
    contextText: snippets.join("\n"),
    retrievalTrace: {
      untranslatedTerms: queries.untranslatedTerms,
      embedding: "not_needed",
      retrievalMode: "lexical_only",
      vectorHitCount: 0,
      reranking: "disabled",
      appliedReranker: "disabled",
      metadataFilters: metadata.applied,
    },
  };
}
