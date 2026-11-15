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
import { buildRetrievalQueries } from "./query.js";
import type { RetrievedContext, RetrievalOptions } from "./retrieve.js";
import { filterKnownMetadata } from "./metadata.js";
import {
  RAG_MAX_CANDIDATES,
  RAG_MAX_RETRIEVAL_HITS,
  RAG_MAX_RERANK_CANDIDATES,
  RAG_MAX_SNIPPETS,
  RAG_MAX_VECTOR_DISTANCE,
  RAG_MIN_LEXICAL_SCORE,
} from "./config.js";
import type { PersistentVectorStore, VectorHit } from "./vector-store.js";

type RankedCandidate = { id: string; score: number };
export type RerankCandidate = Pick<RagDocument, "id" | "trialId" | "kind" | "text">;

export interface CandidateReranker {
  readonly id: "deterministic" | "gemini";
  rerank(
    query: string,
    candidates: readonly RerankCandidate[],
  ): Promise<RankedCandidate[]>;
}

export type RetrievalTrace = {
  untranslatedTerms: string[];
  embedding: "used" | "lexical_fallback" | "not_needed";
  reranking: "deterministic" | "gemini" | "rrf_fallback" | "disabled";
  metadataFilters: { state?: string; status?: string };
};

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
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

function compareRanked(left: RankedCandidate, right: RankedCandidate): number {
  return right.score - left.score || left.id.localeCompare(right.id, "en");
}

function validateOptions(options: HybridRetrievalOptions): void {
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

function deterministicReranker(): CandidateReranker {
  return {
    id: "deterministic",
    async rerank(query, candidates) {
      const terms = new Set(query.toLocaleLowerCase("en").match(/[\p{Letter}\p{Number}]+/gu) ?? []);
      return candidates
        .map((candidate) => {
          const text = new Set(
            candidate.text
              .toLocaleLowerCase("en")
              .match(/[\p{Letter}\p{Number}]+/gu) ?? [],
          );
          let overlap = 0;
          for (const term of terms) if (text.has(term)) overlap += 1;
          return {
            id: candidate.id,
            score: terms.size === 0 ? 0 : overlap / terms.size,
          };
        })
        .sort(compareRanked);
    },
  };
}

function checkSearchVector(vectors: number[][], dimensions: number): void {
  if (
    vectors.some(
      (vector) =>
        vector.length !== dimensions ||
        vector.some((value) => !Number.isFinite(value)),
    )
  )
    throw new Error("Query embedding odgovor sadrži nevažeći vektor.");
}

export type HybridRetrievalOptions = RetrievalOptions & {
  derived?: DerivedValue[];
  excludeFields?: string[];
  sources?: { lexical?: boolean; vector?: boolean };
};

export class HybridTrialRetriever {
  private indexedTrials: Trial[] | undefined;
  private documents: RagDocument[] = [];
  private documentsById = new Map<string, RagDocument>();
  private trialsById = new Map<string, Trial>();
  private lexicalIndex: MiniSearch<RagDocument> | undefined;
  private readonly reranker: CandidateReranker;

  constructor(
    private readonly store: PersistentVectorStore,
    private readonly embedder: Embedder,
    trials?: Trial[],
    reranker: CandidateReranker = deterministicReranker(),
  ) {
    this.reranker = reranker;
    if (trials) this.buildIndex(trials);
  }

  private buildIndex(trials: Trial[]): void {
    const orderedTrials = [...trials].sort((left, right) =>
      left.trialId.localeCompare(right.trialId, "en"),
    );
    this.indexedTrials = trials;
    this.documents = buildRagDocuments(orderedTrials);
    this.documentsById = new Map(
      this.documents.map((document) => [document.id, document]),
    );
    this.trialsById = new Map(
      orderedTrials.map((trial) => [trial.trialId, trial]),
    );
    this.lexicalIndex = new MiniSearch<RagDocument>({
      fields: ["text"],
      idField: "id",
      searchOptions: { prefix: true },
    });
    this.lexicalIndex.addAll(this.documents);
  }

  async retrieve(
    profileInput: Profile | unknown,
    trials: Trial[],
    options: HybridRetrievalOptions,
  ): Promise<RetrievedContext> {
    validateOptions(options);
    const profile: Profile = ProfileSchema.parse(profileInput);
    if (this.indexedTrials !== trials) this.buildIndex(trials);

    const metadata = filterKnownMetadata(trials, options.metadataFilters);
    const allowedTrials = metadata.trials.sort((left, right) =>
      left.trialId.localeCompare(right.trialId, "en"),
    );
    const allowedTrialIds = new Set(allowedTrials.map((trial) => trial.trialId));
    const queries = buildRetrievalQueries(profile, options.derived);
    const queryTexts = queries.text
      .split(";")
      .map((query) => query.trim())
      .filter(Boolean);
    const lexicalEnabled = options.sources?.lexical !== false;
    const vectorEnabled = options.sources?.vector !== false;
    const lexicalRankings = new Map<string, string[]>();
    const vectorRankings: string[][] = [];
    const lexicalScores = new Map<string, number>();
    let embeddingState: RetrievalTrace["embedding"] = "not_needed";
    let vectorHits: VectorHit[] = [];

    if (queryTexts.length > 0) {
      if (lexicalEnabled && this.lexicalIndex) {
        for (const query of queryTexts) {
          const hits = this.lexicalIndex
            .search(query)
            .map((hit) => ({ id: String(hit.id), score: hit.score }))
            .filter(
              (hit) =>
                hit.score >= RAG_MIN_LEXICAL_SCORE &&
                allowedTrialIds.has(
                  this.documentsById.get(hit.id)?.trialId ?? "",
                ),
            )
            .sort(compareRanked);
          for (const hit of hits)
            lexicalScores.set(
              hit.id,
              Math.max(lexicalScores.get(hit.id) ?? 0, hit.score),
            );
          lexicalRankings.set(
            query,
            hits.slice(0, RAG_MAX_RETRIEVAL_HITS).map((hit) => hit.id),
          );
        }
      }

      if (vectorEnabled) {
        const vectors: number[][] = [];
        try {
          const missing: string[] = [];
          const missingQueries: string[] = [];
          for (const query of queryTexts) {
            const cached = this.store.getCachedEmbedding(
              this.embedder.model,
              hashText(query),
            );
            if (cached) vectors.push(cached);
            else {
              vectors.push([]);
              missing.push(query);
              missingQueries.push(query);
            }
          }
          if (missingQueries.length > 0) {
            const batch = await this.embedder.embed(missingQueries);
            if (batch.vectors.length !== missingQueries.length)
              throw new Error(
                "Query embedding odgovor nema vektor za svaki upit.",
              );
            checkSearchVector(batch.vectors, batch.dimensions);
            let nextVector = 0;
            for (let index = 0; index < queryTexts.length; index += 1) {
              if (vectors[index]!.length > 0) continue;
              const query = missing[nextVector]!;
              const vector = batch.vectors[nextVector]!;
              vectors[index] = vector;
              this.store.putCachedEmbedding(
                this.embedder.model,
                hashText(query),
                vector,
              );
              nextVector += 1;
            }
          }
          const dimensions = vectors[0]?.length ?? 0;
          if (dimensions === 0)
            throw new Error("Query embedding odgovor je prazan.");
          checkSearchVector(vectors, dimensions);
          embeddingState = "used";
          const hitLimit = Math.min(
            RAG_MAX_RETRIEVAL_HITS,
            Math.max(options.maxCandidates * 4, options.maxSnippets * 4, 20),
          );
          for (const vector of vectors) {
            const hits = this.store.search(vector, hitLimit);
            vectorHits.push(
              ...hits.filter(
                (hit) =>
                  hit.distance <= RAG_MAX_VECTOR_DISTANCE &&
                  allowedTrialIds.has(hit.trialId),
              ),
            );
            vectorRankings.push(
              hits
                .filter(
                  (hit) =>
                    hit.distance <= RAG_MAX_VECTOR_DISTANCE &&
                    allowedTrialIds.has(hit.trialId),
                )
                .slice(0, hitLimit)
                .map((hit) => hit.id),
            );
          }
        } catch {
          embeddingState = "lexical_fallback";
          vectorHits = [];
          vectorRankings.length = 0;
        }
      }
    }

    const lexicalStudy = [...lexicalRankings.values()].map((ranking) =>
      ranking.filter((id) => this.documentsById.get(id)?.kind === "study"),
    );
    const lexicalPassage = [...lexicalRankings.values()].map((ranking) =>
      ranking.filter((id) => this.documentsById.get(id)?.kind === "passage"),
    );
    const vectorStudy = vectorRankings.map((ranking) =>
      ranking.filter((id) => this.documentsById.get(id)?.kind === "study"),
    );
    const vectorPassage = vectorRankings.map((ranking) =>
      ranking.filter((id) => this.documentsById.get(id)?.kind === "passage"),
    );
    const trialScores = reciprocalRankFusion([
      ...lexicalStudy.map((ranking) =>
        unique(ranking.map((id) => this.documentsById.get(id)!.trialId)),
      ),
      ...vectorStudy.map((ranking) =>
        unique(ranking.map((id) => this.documentsById.get(id)!.trialId)),
      ),
      ...lexicalPassage.map((ranking) =>
        unique(ranking.map((id) => this.documentsById.get(id)!.trialId)),
      ),
      ...vectorPassage.map((ranking) =>
        unique(ranking.map((id) => this.documentsById.get(id)!.trialId)),
      ),
    ]);

    const relevanceEligible = (trialId: string) => {
      const hasLexicalEvidence =
        this.documents.some(
          (document) =>
            document.trialId === trialId &&
            lexicalScores.has(document.id),
        );
      const hasVectorEvidence = vectorHits.some(
        (hit) => hit.trialId === trialId,
      );
      return hasLexicalEvidence || hasVectorEvidence;
    };
    const rrfTrials = queryTexts.length === 0
      ? allowedTrials.map((trial, index) => ({
          id: trial.trialId,
          score: -index,
        }))
      : [...trialScores]
      .filter(
        ([trialId]) => allowedTrialIds.has(trialId) && relevanceEligible(trialId),
      )
      .map(([id, score]) => ({ id, score }))
      .sort(compareRanked);
    const candidateTrials = rrfTrials.slice(
      0,
      Math.min(RAG_MAX_RERANK_CANDIDATES, options.maxCandidates),
    );

    const passageScores = queryTexts.length === 0
      ? new Map(
          this.documents
            .filter((document) => document.kind === "passage")
            .map((document, index) => [document.id, -index]),
        )
      : reciprocalRankFusion([...lexicalPassage, ...vectorPassage]);
    const candidateIds = new Set(candidateTrials.map(({ id }) => id));
    const passageCandidates = [...passageScores]
      .filter(([id]) => {
        const document = this.documentsById.get(id);
        return (
          document?.kind === "passage" &&
          candidateIds.has(document.trialId) &&
          !options.excludeFields?.includes(
            this.trialsById
              .get(document.trialId)
              ?.criteria.find((criterion) => criterion.id === id)?.field ?? "",
          )
        );
      })
      .map(([id, score]) => ({ id, score }))
      .sort(compareRanked)
      .slice(
        0,
        Math.max(0, RAG_MAX_RERANK_CANDIDATES - candidateTrials.length),
      );
    const rerankCandidates = [
      ...candidateTrials.map(({ id }) => this.documents.find(
        (document) => document.kind === "study" && document.trialId === id,
      )),
      ...passageCandidates.map(({ id }) => this.documentsById.get(id)),
    ].filter((document): document is RagDocument => document !== undefined);
    let rerankingState: RetrievalTrace["reranking"] =
      options.rerank === false || queryTexts.length === 0
      ? "disabled"
      : this.reranker.id;
    let rankedTrials = candidateTrials;
    let rankedPassages = passageCandidates;
    if (
      options.rerank !== false &&
      queryTexts.length > 0 &&
      rerankCandidates.length > 0
    ) {
      try {
        const ranking = await this.reranker.rerank(
          queryTexts.join("; "),
          rerankCandidates,
        );
        const scores = new Map(ranking.map(({ id, score }) => [id, score]));
        if (
          ranking.length !== rerankCandidates.length ||
          rerankCandidates.some((candidate) => !scores.has(candidate.id))
        )
          throw new Error("Reranker nije rangirao svaki kandidat.");
        rankedTrials = candidateTrials
          .map(({ id, score }) => ({
            id,
            score: scores.get(
              this.documents.find(
                (document) => document.kind === "study" && document.trialId === id,
              )?.id ?? "",
            ) ?? score,
          }))
          .sort(compareRanked);
        rankedPassages = passageCandidates
          .map(({ id, score }) => ({ id, score: scores.get(id) ?? score }))
          .sort(compareRanked);
      } catch {
        rerankingState = "rrf_fallback";
      }
    }
    const selectedIds = new Set(
      rankedTrials.slice(0, options.maxCandidates).map(({ id }) => id),
    );
    const selectedTrials = rankedTrials
      .filter(({ id }) => selectedIds.has(id))
      .map(({ id }) => this.trialsById.get(id))
      .filter((trial): trial is Trial => trial !== undefined);
    const sourceTexts = new Map<string, string>();
    for (const trial of selectedTrials)
      for (const criterion of trial.criteria) {
        sourceTexts.set(
          criterion.sourceId,
          criterion.sourceId === `${trial.trialId}#unsplit-1` &&
            trial.eligibilityText !== undefined
            ? trial.eligibilityText
            : criterion.sourceQuote,
        );
      }

    const snippets: string[] = [];
    const sourceIds: string[] = [];
    let contextLength = 0;
    for (const { id } of rankedPassages) {
      if (snippets.length >= options.maxSnippets) break;
      const document = this.documentsById.get(id);
      if (!document?.sourceId || !selectedIds.has(document.trialId)) continue;
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
      retrievalTrace: {
        untranslatedTerms: queries.untranslatedTerms,
        embedding: embeddingState,
        reranking: rerankingState,
        metadataFilters: metadata.applied,
      },
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
  if (indexedById.size !== current.size)
    throw new Error(
      "RAG indeks sadrži dokumente kojih nema u aktuelnom korpusu; ponovo pokrenite pnpm index:build.",
    );
}
