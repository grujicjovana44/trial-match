import { describe, expect, it } from "vitest";
import retrievalDatasetV2 from "../rag/retrieval-v2.json" with { type: "json" };
import {
  isMetricEligibleCase,
  rankingCutoffs,
  rankingMetrics,
  RetrievalDatasetSchema,
} from "./rag-retrieval.js";

describe("RAG retrieval ranking metrics", () => {
  it("računa recall@k, precision@k, MRR i nDCG za ručne oznake", () => {
    expect(
      rankingMetrics(
        ["wrong", "relevant", "also-relevant"],
        ["relevant"],
        2,
        6,
      ),
    ).toEqual({
      recall: 1,
      precision: 1 / 2,
      reciprocalRank: 0.5,
      ndcg: expect.closeTo(1 / Math.log2(3), 10),
    });
  });

  it("ne izmišlja metriku kada nema relevantnih odlomaka", () => {
    expect(rankingMetrics(["one"], [], 1, 5)).toBeNull();
  });

  it("ograničava k na najviše polovinu korpusa", () => {
    expect(rankingCutoffs(5)).toEqual([1, 2]);
    expect(
      rankingMetrics(["relevant", "other", "irrelevant"], ["relevant"], 3, 5),
    ).toBeNull();
  });
});

describe("RAG retrieval dataset v2", () => {
  const dataset = RetrievalDatasetSchema.parse(retrievalDatasetV2);

  it("validira delimično adjudikovane anotacije i ostavlja v1 van izmene", () => {
    expect(dataset.schemaVersion).toBe(2);
    expect(dataset.corpusSnapshotId).toBe("rag-corpus-v0-dev");
    expect(dataset.cases).toHaveLength(4);
    expect(dataset.annotationStatus).toBe("pending_human_review");
    expect(
      dataset.cases.map(({ caseId, labelStatus, reviewer }) => [
        caseId,
        labelStatus,
        reviewer,
      ]),
    ).toEqual([
      ["RAG-001", "confirmed", "JG"],
      ["RAG-002", "confirmed", "JG"],
      ["RAG-003", "confirmed", "JG"],
      ["RAG-004", "confirmed", "JG"],
    ]);
  });

  it("boduje samo potvrđene rangirajuće slučajeve", () => {
    const behavior = dataset.cases.find(
      (testCase) => testCase.kind === "behavior",
    );
    const firstConfirmedRanking = dataset.cases.find(
      (testCase) => testCase.caseId === "RAG-001",
    );
    const confirmedRanking = dataset.cases.find(
      (testCase) => testCase.caseId === "RAG-002",
    );
    expect(behavior).toBeDefined();
    expect(firstConfirmedRanking).toBeDefined();
    expect(confirmedRanking).toBeDefined();
    expect(isMetricEligibleCase(behavior!)).toBe(false);
    expect(isMetricEligibleCase(firstConfirmedRanking!)).toBe(true);
    expect(isMetricEligibleCase(confirmedRanking!)).toBe(true);
    expect(
      isMetricEligibleCase({
        kind: "ranking",
        labelStatus: "disputed",
      }),
    ).toBe(false);
    expect(
      isMetricEligibleCase({
        kind: "ranking",
        labelStatus: "confirmed",
      }),
    ).toBe(true);
  });

  it("zahteva reviewer i datum zajedno sa confirmed/disputed statusom", () => {
    const partiallyReviewed = structuredClone(retrievalDatasetV2);
    partiallyReviewed.cases[1]!.reviewer = "TODO";
    expect(RetrievalDatasetSchema.safeParse(partiallyReviewed).success).toBe(
      false,
    );

    const disputed = structuredClone(retrievalDatasetV2);
    disputed.cases[0]!.labelStatus = "disputed";
    disputed.cases[0]!.reviewer = "Reviewer";
    disputed.cases[0]!.reviewedAt = "2026-11-15T20:00:00Z";
    expect(RetrievalDatasetSchema.safeParse(disputed).success).toBe(true);
  });

  it("navodi corpus-v1 obrasce samo opisno, bez ručno dodeljenih oznaka", () => {
    expect(dataset.plannedPatterns.map((pattern) => pattern.pattern)).toEqual([
      "no_matching_query",
      "serbian_synonyms_and_cyrillic",
      "malicious_indexed_passage",
      "lexical_hard_negatives",
    ]);
    expect(
      dataset.plannedPatterns.every(
        (pattern) =>
          pattern.corpusVersionRequired === "corpus-v1" &&
          pattern.status === "description_only",
      ),
    ).toBe(true);
  });
});
