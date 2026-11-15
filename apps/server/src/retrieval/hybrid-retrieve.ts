import MiniSearch from "minisearch";
import {
  ProfileSchema,
  type DerivedValue,
  type Profile,
  type Trial,
} from "../../../../packages/shared/src/index.js";
import { buildRagDocuments, type RagDocument } from "./documents.js";
import type { Embedder } from "./embeddings.js";
import { hashText } from "./indexing.js";
import { buildRetrievalQuery } from "./query.js";
import type { RetrievedContext, RetrievalOptions } from "./retrieve.js";
import {
  RAG_MAX_CANDIDATES,
  RAG_MAX_RETRIEVAL_HITS,
  RAG_MAX_SNIPPETS,
} from "./config.js";
import type { VectorHit, VectorStore } from "./vector-store.js";

type SearchHit = {
  id: string;
  score: number;
};

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function uniqueTrialIds(
  ids: readonly string[],
  documents: ReadonlyMap<string, RagDocument>,
): string[] {
  return unique(
    ids
      .map((id) => documents.get(id)?.trialId)
      .filter((trialId): trialId is string => trialId !== undefined),
  );
}

function reciprocalRankFusion(
  rankings: readonly (readonly string[])[],
): Map<string, number> {
  const scores = new Map<string, number>();
  for (const ranking of rankings) {
    const seen = new Set<string>();
    ranking.forEach((id, index) => {
      if (seen.has(id)) return;
      seen.add(id);
      scores.set(id, (scores.get(id) ?? 0) + 1 / (60 + index + 1));
    });
  }
  return scores;
}

function validateOptions(options: RetrievalOptions): void {
  if (!Number.isSafeInteger(options.maxCandidates) || options.maxCandidates < 1)
    throw new Error("maxCandidates mora biti pozitivan ceo broj.");
  if (options.maxCandidates > RAG_MAX_CANDIDATES)
    throw new Error(`maxCandidates ne može preći ${RAG_MAX_CANDIDATES}.`);
  if (!Number.isSafeInteger(options.maxSnippets) || options.maxSnippets < 0)
    throw new Error("maxSnippets mora biti nenegativan ceo broj.");
  if (options.maxSnippets > RAG_MAX_SNIPPETS)
    throw new Error(`maxSnippets ne može preći ${RAG_MAX_SNIPPETS}.`);
  if (
    !Number.isSafeInteger(options.maxContextChars) ||
    options.maxContextChars < 0
  )
    throw new Error("maxContextChars mora biti nenegativan ceo broj.");
}

function compareRanked(
  left: { id: string; score: number },
  right: { id: string; score: number },
): number {
  return right.score - left.score || left.id.localeCompare(right.id, "en");
}

function l2HitIds(hits: readonly VectorHit[]): string[] {
  return hits.map((hit) => hit.id);
}

export type HybridRetrievalOptions = RetrievalOptions & {
  derived?: DerivedValue[];
  excludeFields?: string[];
};

export class HybridTrialRetriever {
  constructor(
    private readonly store: VectorStore,
    private readonly embedder: Embedder,
  ) {}

  async retrieve(
    profileInput: Profile | unknown,
    trials: Trial[],
    options: HybridRetrievalOptions,
  ): Promise<RetrievedContext> {
    validateOptions(options);
    const profile: Profile = ProfileSchema.parse(profileInput);
    const orderedTrials = [...trials].sort((left, right) =>
      left.trialId.localeCompare(right.trialId, "en"),
    );
    const allowedTrialIds = new Set(
      orderedTrials.map((trial) => trial.trialId),
    );
    const documents = buildRagDocuments(orderedTrials);
    const documentsById = new Map(
      documents.map((document) => [document.id, document]),
    );
    const trialsById = new Map(
      orderedTrials.map((trial) => [trial.trialId, trial]),
    );
    const lexicalIndex = new MiniSearch<RagDocument>({
      fields: ["text"],
      idField: "id",
      searchOptions: { prefix: true },
    });
    lexicalIndex.addAll(documents);

    const query = buildRetrievalQuery(profile);
    let lexicalHits: SearchHit[] = [];
    let studyVectorHits: VectorHit[] = [];
    let passageVectorHits: VectorHit[] = [];
    if (query) {
      lexicalHits = lexicalIndex
        .search(query)
        .sort(compareRanked)
        .map((hit) => ({ id: String(hit.id), score: hit.score }));
      const { vectors, dimensions } = await this.embedder.embed([query]);
      if (vectors.length !== 1)
        throw new Error("Query embedding odgovor mora sadržati jedan vektor.");
      const vector = vectors[0]!;
      if (vector.length !== dimensions)
        throw new Error("Query embedding dimenzija nije saglasna sa vektorom.");
      const hitLimit = Math.min(
        RAG_MAX_RETRIEVAL_HITS,
        Math.max(options.maxCandidates * 4, options.maxSnippets * 4, 20),
      );
      studyVectorHits = this.store.search(vector, hitLimit, "study");
      passageVectorHits = this.store.search(vector, hitLimit, "passage");
    }

    const lexicalStudyIds = lexicalHits
      .filter((hit) => documentsById.get(hit.id)?.kind === "study")
      .map((hit) => hit.id);
    const lexicalPassageIds = lexicalHits
      .filter((hit) => documentsById.get(hit.id)?.kind === "passage")
      .map((hit) => hit.id);
    const candidateScores = reciprocalRankFusion([
      uniqueTrialIds(lexicalStudyIds, documentsById),
      unique(studyVectorHits.map((hit) => hit.trialId)),
      uniqueTrialIds(lexicalPassageIds, documentsById),
      unique(passageVectorHits.map((hit) => hit.trialId)),
    ]);
    const rankedTrialIds = query
      ? [...candidateScores]
          .filter(([trialId]) => allowedTrialIds.has(trialId))
          .map(([id, score]) => ({ id, score }))
          .sort(compareRanked)
          .slice(0, options.maxCandidates)
          .map(({ id }) => id)
      : orderedTrials
          .slice(0, options.maxCandidates)
          .map((trial) => trial.trialId);
    const selectedIds = new Set(rankedTrialIds);
    const selectedTrials = rankedTrialIds
      .map((trialId) => trialsById.get(trialId))
      .filter((trial): trial is Trial => trial !== undefined);
    const sourceTexts = new Map<string, string>();
    for (const trial of selectedTrials)
      for (const criterion of trial.criteria) {
        const sourceText =
          criterion.sourceId === `${trial.trialId}#unsplit-1` &&
          trial.eligibilityText !== undefined
            ? trial.eligibilityText
            : criterion.sourceQuote;
        sourceTexts.set(criterion.sourceId, sourceText);
      }

    const passageScores = query
      ? reciprocalRankFusion([lexicalPassageIds, l2HitIds(passageVectorHits)])
      : new Map(
          documents
            .filter((document) => document.kind === "passage")
            .map((document, index) => [document.id, -index]),
        );
    const passageCandidates = [...passageScores]
      .filter(([id]) => {
        const document = documentsById.get(id);
        return (
          document?.kind === "passage" && selectedIds.has(document.trialId)
        );
      })
      .map(([id, score]) => ({ id, score }))
      .sort(compareRanked);
    const snippets: string[] = [];
    const sourceIds: string[] = [];
    let contextLength = 0;
    for (const { id } of passageCandidates) {
      if (snippets.length >= options.maxSnippets) break;
      const document = documentsById.get(id);
      if (!document?.sourceId) continue;
      const trial = trialsById.get(document.trialId);
      const criterion = trial?.criteria.find((item) => item.id === id);
      if (!criterion || options.excludeFields?.includes(criterion.field ?? ""))
        continue;
      const snippet = `${document.sourceId}: ${document.text}`;
      const addedLength = snippet.length + (snippets.length > 0 ? 1 : 0);
      if (contextLength + addedLength > options.maxContextChars) continue;
      snippets.push(snippet);
      sourceIds.push(document.sourceId);
      contextLength += addedLength;
    }

    return {
      trials: selectedTrials,
      sourceIds,
      sourceTexts,
      contextText: snippets.join("\n"),
    };
  }
}

export function validateIndexDocuments(
  indexed: readonly { id: string; sha256: string }[],
  trials: readonly Trial[],
): void {
  const current = new Map(
    buildRagDocuments(trials).map((document) => [document.id, document.text]),
  );
  const indexedById = new Map(
    indexed.map((document) => [document.id, document.sha256]),
  );
  for (const [id, text] of current) {
    const expectedHash = indexedById.get(id);
    if (!expectedHash)
      throw new Error(
        `RAG indeksu nedostaje dokument ${id}; pokrenite ponovo pnpm index:build.`,
      );
    const actualHash = hashText(text);
    if (expectedHash !== actualHash)
      throw new Error(
        `RAG indeks je zastareo za dokument ${id}; pokrenite ponovo pnpm index:build.`,
      );
  }
}
