import { describe, expect, it } from "vitest";
import { rankingMetrics } from "./rag-retrieval.js";

describe("RAG retrieval ranking metrics", () => {
  it("računa recall@k, precision@k, MRR i nDCG za ručne oznake", () => {
    expect(
      rankingMetrics(["wrong", "relevant", "also-relevant"], ["relevant"], 3),
    ).toEqual({
      recall: 1,
      precision: 1 / 3,
      reciprocalRank: 0.5,
      ndcg: expect.closeTo(1 / Math.log2(3), 10),
    });
  });

  it("ne izmišlja metriku kada nema relevantnih odlomaka", () => {
    expect(rankingMetrics(["one"], [], 3)).toBeNull();
  });
});
