import { describe, expect, it } from "vitest";
import retrievalDatasetV2 from "../rag/retrieval-v2.json" with { type: "json" };
import retrievalDatasetV4 from "../rag/retrieval-v4-jovana-clinicaltrials20-2026-11-19.json" with { type: "json" };
import retrievalProposalQueue from "../rag/retrieval-proposals-v1.json" with { type: "json" };
import {
  aggregateRankingMetrics,
  isMetricEligibleCase,
  rankingCutoffs,
  rankingMetrics,
  RetrievalDatasetSchema,
  RetrievalProposalQueueSchema,
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

  it("računa cutoffs odlomaka prema veličini korpusa odlomaka, ne studija", () => {
    expect(rankingCutoffs(15)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    const ranked = ["irrelevant-1", "irrelevant-2", "relevant-1", "relevant-2"];
    expect(
      rankingMetrics(ranked, ["relevant-1", "relevant-2"], 2, 15)?.ndcg,
    ).toBe(0);
    expect(
      rankingMetrics(ranked, ["relevant-1", "relevant-2"], 3, 15)?.ndcg,
    ).toBeGreaterThan(0);
  });

  it("koristi cutoffs odlomaka pri agregiranju baseline metrike", () => {
    const metrics = {
      at1: { recall: 0, precision: 0, reciprocalRank: 0, ndcg: 0 },
      at3: {
        recall: 0.5,
        precision: 1 / 3,
        reciprocalRank: 1 / 3,
        ndcg: 0.4,
      },
    };
    expect(
      aggregateRankingMetrics([{ metrics }], rankingCutoffs(15)),
    ).toMatchObject({
      at1: { ndcg: 0 },
      at3: { ndcg: 0.4 },
    });
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

describe("Jovanine oznake za aktivni 20-study korpus", () => {
  const dataset = RetrievalDatasetSchema.parse(retrievalDatasetV4);

  it("čuva osam potvrđenih relevance oznaka bez mešanja sa kliničkim pregledom", () => {
    expect(dataset.annotationStatus).toBe("adjudicated");
    expect(dataset.cases).toHaveLength(8);
    expect(dataset.cases.filter((testCase) => testCase.kind === "ranking")).toHaveLength(7);
    expect(dataset.cases.filter((testCase) => testCase.kind === "negative")).toMatchObject([
      {
        caseId: "J-RAG-07",
        relevantTrialIds: [],
        relevantPassageIds: [],
        labelStatus: "confirmed",
        reviewer: "Jovana",
      },
    ]);
    expect(dataset.annotationMethod).toContain("not clinical review");
    expect(dataset.cases.every((testCase) => testCase.reviewer === "Jovana")).toBe(true);
  });
});

describe("RAG proposed-label review queue", () => {
  const queue = RetrievalProposalQueueSchema.parse(retrievalProposalQueue);

  it("ties every unapproved case to the frozen corpus without confirming its labels", () => {
    const base = RetrievalDatasetSchema.parse(retrievalDatasetV2);
    expect(queue.baseDatasetId).toBe(base.datasetId);
    expect(queue.corpusSnapshotId).toBe(base.corpusSnapshotId);
    expect(queue.cases).toHaveLength(4);
    expect(
      queue.cases.map(({ caseId, kind, labelStatus, reviewer, reviewedAt }) => [
        caseId,
        kind,
        labelStatus,
        reviewer,
        reviewedAt,
      ]),
    ).toEqual([
      ["RAG-P001", "ranking", "proposed", "TODO", "TODO"],
      ["RAG-P002", "ranking", "proposed", "TODO", "TODO"],
      ["RAG-P003", "ranking", "proposed", "TODO", "TODO"],
      ["RAG-P004", "behavior", "proposed", "TODO", "TODO"],
    ]);
  });
});
