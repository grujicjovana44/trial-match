import { describe, expect, it, vi } from "vitest";
import { CohereCandidateReranker } from "./cohere-reranker.js";
import type { RerankCandidate } from "./hybrid-retrieve.js";

const candidates: RerankCandidate[] = [
  { id: "NCT-1", trialId: "NCT-1", kind: "study", text: "Study one" },
  { id: "NCT-1#p1", trialId: "NCT-1", kind: "passage", text: "Passage one" },
];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("CohereCandidateReranker", () => {
  it("salje fiksirani model i mapira response index/score na ID-jeve", async () => {
    const transport = vi.fn<typeof fetch>(async (_input, init) => {
      expect(init?.headers).toMatchObject({
        Authorization: "Bearer test-only-key",
        "Content-Type": "application/json",
      });
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      expect(body).toEqual({
        model: "rerank-v5.0-fast",
        query: "type 2 diabetes",
        documents: ["study: Study one", "passage: Passage one"],
        top_n: 2,
      });
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      return jsonResponse({
        results: [
          { index: 1, relevance_score: 0.91 },
          { index: 0, relevance_score: 0.62 },
        ],
      });
    });
    const reranker = new CohereCandidateReranker(
      "test-only-key",
      undefined,
      transport,
    );

    await expect(reranker.rerank("type 2 diabetes", candidates)).resolves.toEqual([
      { id: "NCT-1#p1", score: 0.91 },
      { id: "NCT-1", score: 0.62 },
    ]);
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("ne poziva transport kada nedostaje ključ", async () => {
    const transport = vi.fn<typeof fetch>();
    const reranker = new CohereCandidateReranker(undefined, undefined, transport);
    await expect(reranker.rerank("query", candidates)).rejects.toThrow(
      "API ključ nije konfigurisan",
    );
    expect(transport).not.toHaveBeenCalled();
  });

  it.each([
    [{ results: [{ index: 0, relevance_score: 0.5 }] }, "svaki kandidat"],
    [
      {
        results: [
          { index: 0, relevance_score: 0.5 },
          { index: 0, relevance_score: 0.4 },
        ],
      },
      "svaki kandidat",
    ],
    [
      {
        results: [
          { index: 0, relevance_score: 0.5 },
          { index: 3, relevance_score: 0.4 },
        ],
      },
      "svaki kandidat",
    ],
  ])("odbija nepotpun, dupliran ili van-opsega odgovor", async (body, message) => {
    const reranker = new CohereCandidateReranker(
      "test-only-key",
      undefined,
      vi.fn<typeof fetch>(async () => jsonResponse(body)),
    );
    await expect(reranker.rerank("query", candidates)).rejects.toThrow(message);
  });

  it("svodi HTTP grešku na status bez čitanja tela odgovora", async () => {
    const text = vi.fn();
    const reranker = new CohereCandidateReranker(
      "test-only-key",
      undefined,
      vi.fn<typeof fetch>(async () => ({
        ok: false,
        status: 503,
        text,
      }) as unknown as Response),
    );
    await expect(reranker.rerank("query", candidates)).rejects.toThrow("503");
    expect(text).not.toHaveBeenCalled();
  });
});
