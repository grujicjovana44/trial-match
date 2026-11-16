import { describe, expect, it } from "vitest";
import fixtureData from "../../../../data/fixtures/trials.json" with { type: "json" };
import approvedTrialsData from "../../../../data/rule_sets/studies_2_approved_20261115_1539/trials.json" with { type: "json" };
import approvalReport from "../../../../data/rule_sets/studies_2_approved_20261115_1539/review-report.json" with { type: "json" };
import { TrialSchema } from "../../../../packages/shared/src/index.js";
import type { Embedder } from "./embeddings.js";
import { buildRagDocuments } from "./documents.js";
import {
  buildVectorIndex,
  estimateEmbeddingTokens,
  estimatePendingEmbeddings,
  estimateRawEmbeddingTokens,
} from "./indexing.js";
import { InMemoryVectorStore } from "./vector-store.js";

class DeterministicFakeEmbedder implements Embedder {
  readonly model = "text-embedding-3-small";
  calls = 0;

  async embed(input: readonly string[]) {
    this.calls += 1;
    return {
      vectors: input.map((text) => {
        const vector = Array.from({ length: 1536 }, () => 0);
        for (const character of text) {
          const index = character.codePointAt(0)! % vector.length;
          vector[index] = (vector[index] ?? 0) + 1;
        }
        return vector;
      }),
      dimensions: 1536,
      tokens: input.reduce((count, text) => count + text.length, 0),
    };
  }
}

const corpus = {
  trials: TrialSchema.array().parse(fixtureData),
  sources: [
    {
      path: "data/fixtures/trials.json",
      version: "synthetic-trials-v1",
      sha256: "f".repeat(64),
    },
  ],
  skipped: [],
  version: "synthetic-trials-v1",
  sha256: "e".repeat(64),
};

describe("RAG vector index build", () => {
  it("kalibriše procenu po sačuvanom 192→290 uzorku", () => {
    const sample = ["a".repeat(768)];
    expect(estimateRawEmbeddingTokens(sample)).toBe(192);
    expect(estimateEmbeddingTokens(sample)).toBe(290);
  });

  it("zadržava ID-jeve, source ID-jeve i originalne citate odobrenih kriterijuma", () => {
    const approvedTrials = TrialSchema.array().parse(approvedTrialsData);
    const criteriaBefore = structuredClone(
      approvedTrials.map(({ trialId, criteria }) => ({ trialId, criteria })),
    );
    const approvalReportBefore = structuredClone(approvalReport);
    const documents = buildRagDocuments(approvedTrials);
    const key = (
      trialId: string,
      criterionId: string,
      sourceId: string | undefined,
    ) => `${trialId}\u0000${sourceId}\u0000${criterionId}`;
    const expectedPassages = new Map(
      approvedTrials.flatMap((trial) =>
        trial.criteria.map((criterion) => [
          key(trial.trialId, criterion.id, criterion.sourceId),
          {
            trialId: trial.trialId,
            criterionId: criterion.id,
            sourceId: criterion.sourceId,
            text: criterion.sourceQuote,
            kind: "passage",
          },
        ]),
      ),
    );
    const actualPassages = new Map(
      documents
        .filter((document) => document.kind === "passage")
        .map((document) => [
          key(document.trialId, document.id, document.sourceId),
          {
            trialId: document.trialId,
            criterionId: document.id,
            sourceId: document.sourceId,
            text: document.text,
            kind: document.kind,
          },
        ]),
    );
    expect(actualPassages).toEqual(expectedPassages);
    expect(
      approvedTrials.map(({ trialId, criteria }) => ({ trialId, criteria })),
    ).toEqual(criteriaBefore);
    expect(approvedTrials.map((trial) => trial.trialId)).toEqual([
      "NCT07924436",
      "NCT07409714",
    ]);
    expect(approvalReport.included.map(({ trialId }) => trialId)).toEqual(
      approvedTrials.map(({ trialId }) => trialId),
    );
    expect(approvalReport).toEqual(approvalReportBefore);
  });

  it("ne šalje ništa bez potvrde kada procena pređe prag", async () => {
    const store = new InMemoryVectorStore();
    const embedder = new DeterministicFakeEmbedder();
    const estimate = estimatePendingEmbeddings(corpus, store, embedder.model);
    expect(estimate.tokens).toBeGreaterThan(0);

    await expect(
      buildVectorIndex({
        corpus,
        store,
        embedder,
        tokenConfirmationThreshold: 1,
      }),
    ).rejects.toThrow(/Potrebna je eksplicitna potvrda/);
    expect(embedder.calls).toBe(0);
    expect(store.getManifest()).toBeUndefined();
  });

  it("kešira tekst+model i beleži manifest sa dimenzijom i hash-evima", async () => {
    const store = new InMemoryVectorStore();
    const embedder = new DeterministicFakeEmbedder();
    const documents = buildRagDocuments(corpus.trials);

    const first = await buildVectorIndex({
      corpus,
      store,
      embedder,
      tokenConfirmationThreshold: 1,
      confirmLarge: true,
    });
    const callsAfterFirstBuild = embedder.calls;
    const second = await buildVectorIndex({
      corpus,
      store,
      embedder,
      tokenConfirmationThreshold: 1,
    });

    expect(first.manifest.dimensions).toBe(1536);
    expect(first.manifest.corpusVersion).toBe("synthetic-trials-v1");
    expect(first.manifest.documentHashes).toHaveLength(documents.length);
    expect(first.manifest.sourceHashes[0]?.sha256).toBe("f".repeat(64));
    expect(first.embeddingCalls).toBe(embedder.calls);
    expect(first.tokensUsed).toBeGreaterThan(0);
    expect(second.embeddedTexts).toBe(0);
    expect(second.reusedTexts).toBe(first.embeddedTexts);
    expect(second.embeddingCalls).toBe(0);
    expect(second.tokensUsed).toBe(0);
    expect(embedder.calls).toBe(callsAfterFirstBuild);
    expect(JSON.parse(store.getManifest() ?? "{}")).toMatchObject({
      embeddingModel: "text-embedding-3-small",
      dimensions: 1536,
      corpusHash: "e".repeat(64),
    });
  });
});
