import { z } from "zod";
import type {
  CandidateReranker,
  RerankCandidate,
} from "./hybrid-retrieve.js";

export const COHERE_RERANK_MODEL = "rerank-v5.0-fast" as const;
const MAX_CANDIDATES = 20;
const CohereResponseSchema = z
  .object({
    results: z.array(
      z.object({
        index: z.number().int().nonnegative(),
        relevance_score: z.number().finite().min(0).max(1),
      }),
    ),
  })
  .passthrough();

export class CohereCandidateReranker implements CandidateReranker {
  readonly id = "cohere" as const;

  constructor(
    private readonly apiKey: string | undefined,
    private readonly model: string = COHERE_RERANK_MODEL,
    private readonly transport: typeof fetch = fetch,
    private readonly timeoutMs = 2_000,
  ) {
    if (model !== COHERE_RERANK_MODEL)
      throw new Error("Cohere reranker zahteva odobreni model rerank-v5.0-fast.");
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0)
      throw new Error("RAG reranker timeout mora biti pozitivan ceo broj.");
  }

  async rerank(
    query: string,
    candidates: readonly RerankCandidate[],
  ): Promise<Array<{ id: string; score: number }>> {
    if (!this.apiKey)
      throw new Error("Cohere reranker API ključ nije konfigurisan.");
    if (
      candidates.length < 1 ||
      candidates.length > MAX_CANDIDATES ||
      new Set(candidates.map(({ id }) => id)).size !== candidates.length
    )
      throw new Error("Cohere reranker kandidati nisu validni.");

    const response = await this.transport("https://api.cohere.com/v2/rerank", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        query: query.slice(0, 4000),
        documents: candidates.map(
          (candidate) => `${candidate.kind}: ${candidate.text.slice(0, 800)}`,
        ),
        top_n: candidates.length,
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok)
      throw new Error(`Cohere reranker HTTP greška (${response.status}).`);

    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      throw new Error("Cohere reranker vratio je neispravan JSON.");
    }
    const parsed = CohereResponseSchema.safeParse(raw);
    if (!parsed.success) throw new Error("Cohere reranker odgovor nije validan.");
    const results = parsed.data.results;
    if (
      results.length !== candidates.length ||
      new Set(results.map(({ index }) => index)).size !== results.length ||
      results.some(({ index }) => index >= candidates.length)
    )
      throw new Error("Cohere reranker nije vratio svaki kandidat tačno jednom.");

    return results.map(({ index, relevance_score }) => ({
      id: candidates[index]!.id,
      score: relevance_score,
    }));
  }
}
