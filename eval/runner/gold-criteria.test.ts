import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { scoreCriteria } from "./gold-criteria.js";

const datasetVersion = "criteria-fixture-v1";
const annotationVersion = "annotation-fixture-v1";
const text = "Age at least 18 years";
const sourceHash = createHash("sha256").update(text).digest("hex");

function atom(value: number) {
  return {
    sourceId: "NCT00000001#inc-1",
    kind: "inclusion" as const,
    field: "age" as const,
    operator: "gte" as const,
    value,
    unit: "years",
    checkability: "auto" as const,
  };
}

function annotation(expected: ReturnType<typeof atom>[]) {
  return {
    annotationId: "A-1",
    sourceHash,
    originalText: text,
    expected,
    reviewer: "Reviewer fixture",
    reviewedAt: "2026-11-18T12:00:00Z",
    datasetVersion,
    annotationVersion,
  };
}

function prediction(candidate: ReturnType<typeof atom>[]) {
  return {
    annotationId: "A-1",
    sourceHash,
    datasetVersion,
    annotationVersion,
    candidate,
    method: "structured" as const,
    modelVersion: null,
    traceId: null,
  };
}

describe("criteria gold metrics", () => {
  it("scores exact atoms and counts wrong values as both FP and FN", () => {
    const result = scoreCriteria(
      [annotation([atom(18)])],
      [prediction([atom(19)])],
      datasetVersion,
    );

    expect(result).toMatchObject({
      annotations: 1,
      tp: 0,
      fp: 1,
      fn: 1,
      precision: 0,
      recall: 0,
    });
  });

  it("returns null when precision or recall has a zero denominator", () => {
    const noPredictions = scoreCriteria(
      [annotation([atom(18)])],
      [prediction([])],
      datasetVersion,
    );
    expect(noPredictions).toMatchObject({
      tp: 0,
      fp: 0,
      fn: 1,
      precision: null,
      recall: 0,
    });

    const noExpected = scoreCriteria(
      [annotation([])],
      [prediction([atom(18)])],
      datasetVersion,
    );
    expect(noExpected).toMatchObject({
      tp: 0,
      fp: 1,
      fn: 0,
      precision: 0,
      recall: null,
    });
  });

  it("accepts manual_review atoms with null matcher fields", () => {
    const manualAtom = {
      sourceId: "NCT00000001#exc-1",
      kind: "exclusion" as const,
      field: null,
      operator: null,
      value: null,
      unit: null,
      checkability: "manual_review" as const,
    };
    const manualText = "History of a condition requiring specialist review";
    const manualHash = createHash("sha256").update(manualText).digest("hex");
    const expected = {
      annotationId: "A-1",
      sourceHash: manualHash,
      originalText: manualText,
      expected: [manualAtom],
      reviewer: "Reviewer fixture",
      reviewedAt: "2026-11-18T12:00:00Z",
      datasetVersion,
      annotationVersion,
    };
    const candidate = {
      annotationId: "A-1",
      sourceHash: manualHash,
      datasetVersion,
      annotationVersion,
      candidate: [manualAtom],
      method: "structured" as const,
      modelVersion: null,
      traceId: null,
    };

    expect(scoreCriteria([expected], [candidate], datasetVersion)).toMatchObject(
      { tp: 1, fp: 0, fn: 0, precision: 1, recall: 1 },
    );
  });

  it("rejects duplicate IDs, duplicate atoms, and mismatched source hashes", () => {
    expect(() =>
      scoreCriteria(
        [annotation([atom(18)]), annotation([atom(18)])],
        [prediction([atom(18)])],
        datasetVersion,
      ),
    ).toThrow("Duplirani annotationId.");

    expect(() =>
      scoreCriteria(
        [annotation([atom(18), atom(18)])],
        [prediction([atom(18)])],
        datasetVersion,
      ),
    ).toThrow("Duplirani atomski kriterijumi");

    expect(() =>
      scoreCriteria(
        [{ ...annotation([atom(18)]), sourceHash: "0".repeat(64) }],
        [prediction([atom(18)])],
        datasetVersion,
      ),
    ).toThrow("Izvorni hash ne odgovara");
  });

  it("rejects mismatched dataset and annotation versions", () => {
    expect(() =>
      scoreCriteria(
        [annotation([atom(18)])],
        [prediction([atom(18)])],
        "different-dataset",
      ),
    ).toThrow("Verzija ili izvor predikcije se ne podudara");

    expect(() =>
      scoreCriteria(
        [annotation([atom(18)])],
        [{ ...prediction([atom(18)]), annotationVersion: "stale-v0" }],
        datasetVersion,
      ),
    ).toThrow("Verzija ili izvor predikcije se ne podudara");
  });

  it("requires reviewer/date provenance and rejects duplicate prediction IDs", () => {
    expect(() =>
      scoreCriteria(
        [{ ...annotation([atom(18)]), reviewer: "" }],
        [prediction([atom(18)])],
        datasetVersion,
      ),
    ).toThrow();

    expect(() =>
      scoreCriteria(
        [{ ...annotation([atom(18)]), reviewedAt: "not-a-date" }],
        [prediction([atom(18)])],
        datasetVersion,
      ),
    ).toThrow();

    expect(() =>
      scoreCriteria(
        [annotation([atom(18)])],
        [prediction([atom(18)]), prediction([atom(18)])],
        datasetVersion,
      ),
    ).toThrow("Duplirani annotationId.");
  });

  it("keeps the T323 sample, proposal, and provisional prediction artifacts distinct", async () => {
    const base = "eval/gold-criteria/t323-v1";
    const manifest = JSON.parse(
      await readFile(`${base}/manifest.json`, "utf8"),
    ) as {
      status: string;
      sampleCount: number;
      strata: Record<string, number>;
      sourcePackage: string;
      sourcePackageSha256: string;
      predictionBasis: string;
      artifacts: { annotations: { sha256: string }; predictions: { sha256: string } };
    };
    const proposalContents = await readFile(
      `${base}/annotation-proposals.json`,
      "utf8",
    );
    const predictionContents = await readFile(
      `${base}/predictions-provisional.json`,
      "utf8",
    );
    const proposal = JSON.parse(proposalContents) as {
      status: string;
      samples: Array<{
        sourceHash: string;
        originalText: string;
        criterionId: string;
        sourceId: string;
        reviewer: string | null;
        reviewedAt: string | null;
      }>;
    };
    const predictions = JSON.parse(predictionContents) as unknown[];
    const sourceContents = await readFile(manifest.sourcePackage, "utf8");
    const sourceTrials = JSON.parse(sourceContents) as Array<{
      trialId: string;
      criteria: Array<{ id: string; sourceId: string; text: string }>;
    }>;
    const digest = (value: string) =>
      createHash("sha256").update(value).digest("hex");
    const sourceCriteria = new Map(
      sourceTrials.flatMap((trial) =>
        trial.criteria.map((criterion) => [criterion.id, criterion] as const),
      ),
    );

    expect(manifest.status).toBe("PREPARATION_ONLY_T323_OPEN");
    expect(manifest.sampleCount).toBe(30);
    expect(digest(sourceContents)).toBe(manifest.sourcePackageSha256);
    expect(manifest.strata).toEqual({
      simple_numeric_or_structured: 10,
      complex_manual_review: 10,
      manual_review_text: 10,
    });
    expect(digest(proposalContents)).toBe(manifest.artifacts.annotations.sha256);
    expect(digest(predictionContents)).toBe(
      manifest.artifacts.predictions.sha256,
    );
    expect(proposal.status).toBe("PROPOSAL_NOT_HUMAN_CONFIRMED_NOT_GOLD");
    expect(proposal.samples).toHaveLength(30);
    expect(proposal.samples.every((sample) => sample.reviewer === null)).toBe(
      true,
    );
    expect(
      proposal.samples.every((sample) => sample.reviewedAt === null),
    ).toBe(true);
    expect(
      proposal.samples.every(
        (sample) => digest(sample.originalText) === sample.sourceHash,
      ),
    ).toBe(true);
    expect(
      proposal.samples.every((sample) => {
        const source = sourceCriteria.get(sample.criterionId);
        return (
          source?.sourceId === sample.sourceId &&
          source.text === sample.originalText
        );
      }),
    ).toBe(true);
    expect(manifest.predictionBasis).toContain("not an independently executed");
    expect(predictions).toHaveLength(30);
  });
});
