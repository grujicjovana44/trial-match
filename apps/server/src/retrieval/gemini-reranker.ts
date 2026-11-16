import { z } from "zod";
import { GeminiAdapter } from "../llm/gemini-adapter.js";
import type {
  CandidateReranker,
  RerankCandidate,
} from "./hybrid-retrieve.js";

export const RerankOutputSchema = z
  .array(
    z
      .object({
        id: z.string().min(1),
        score: z.number().finite().min(0).max(1),
      })
      .strict(),
  )
  .max(20);

export class GeminiCandidateReranker implements CandidateReranker {
  readonly id = "gemini" as const;
  private readonly adapter: GeminiAdapter;

  constructor(
    apiKey: string,
    model: string,
    transport: typeof fetch = fetch,
    private readonly timeoutMs = 2_000,
  ) {
    this.adapter = new GeminiAdapter(apiKey, transport);
    if (model !== this.adapter.modelId)
      throw new Error("Gemini reranker zahteva odobreni LLM_MODEL.");
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0)
      throw new Error("RAG reranker timeout mora biti pozitivan ceo broj.");
  }

  async rerank(
    query: string,
    candidates: readonly RerankCandidate[],
  ): Promise<Array<{ id: string; score: number }>> {
    const result = await this.adapter.generate(
      {
        promptId: "explain_results.v1",
        instruction:
          "Rangiraj kandidate samo po relevantnosti za upit. Ne procenjuj podobnost, kriterijume uključenja/isključenja, dijagnozu niti odluku o učešću. Vrati svaki dati ID tačno jednom sa ocenom 0..1.",
        input: {
          query: query.slice(0, 4000),
          candidates: candidates.map((candidate) => ({
            id: candidate.id,
            kind: candidate.kind,
            text: candidate.text.slice(0, 800),
          })),
        },
        schema: RerankOutputSchema,
      },
      {
        signal: AbortSignal.timeout(this.timeoutMs),
        deadline: Date.now() + this.timeoutMs,
        maxOutputTokens: 512,
      },
    );
    if (result.finish !== "complete" || result.candidate === null)
      throw new Error("Gemini reranker odgovor je nepotpun ili odbijen.");
    const ranking = RerankOutputSchema.parse(result.candidate);
    const expectedIds = new Set(candidates.map(({ id }) => id));
    if (
      ranking.length !== expectedIds.size ||
      new Set(ranking.map(({ id }) => id)).size !== ranking.length ||
      ranking.some(({ id }) => !expectedIds.has(id))
    )
      throw new Error("Gemini reranker vratio je nepoznate ili duplirane ID-jeve.");
    return ranking;
  }
}
