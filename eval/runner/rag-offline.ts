import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { TrialSchema, type Trial } from "../../packages/shared/src/index.js";
import {
  buildRagDocuments,
  type RagDocument,
} from "../../apps/server/src/retrieval/documents.js";
import type { Embedder } from "../../apps/server/src/retrieval/embeddings.js";
import {
  HybridTrialRetriever,
  type HybridRetrievalOptions,
} from "../../apps/server/src/retrieval/hybrid-retrieve.js";
import { buildRetrievalQueries } from "../../apps/server/src/retrieval/query.js";
import { hashText } from "../../apps/server/src/retrieval/indexing.js";
import {
  isMetricEligibleCase,
  rankingCutoffs,
  rankingMetrics,
  RetrievalDatasetSchema,
} from "./rag-retrieval.js";
import {
  InMemoryVectorStore,
  openSQLiteVectorStore,
  type VectorRecord,
  type VectorStore,
} from "../../apps/server/src/retrieval/vector-store.js";

const FAKE_MODEL = "offline-rag-hash-v1";
const VECTOR_DIMENSIONS = 1536;

class DeterministicHashEmbedder implements Embedder {
  readonly model = FAKE_MODEL;

  async embed(input: readonly string[]) {
    return {
      vectors: input.map((text) => {
        const vector = Array.from({ length: VECTOR_DIMENSIONS }, () => 0);
        for (const token of text.toLocaleLowerCase("en").match(/[\p{Letter}\p{Number}]+/gu) ?? []) {
          const digest = createHash("sha256").update(token).digest();
          const index = digest.readUInt32BE(0) % VECTOR_DIMENSIONS;
          vector[index] = vector[index]! + 1;
        }
        const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
        return norm === 0 ? vector : vector.map((value) => value / norm);
      }),
      dimensions: VECTOR_DIMENSIONS,
      tokens: 0,
    };
  }
}

function passageIds(
  sourceIds: readonly string[],
  trials: readonly Trial[],
): string[] {
  const sourceSet = new Set(sourceIds);
  return [
    ...new Set(
      trials.flatMap((trial) =>
        trial.criteria
          .filter((criterion) => sourceSet.has(criterion.sourceId))
          .map((criterion) => criterion.id),
      ),
    ),
  ];
}

function metricSet(
  retrieved: string[],
  relevant: string[],
  cutoffs: number[],
  corpusSize: number,
) {
  return Object.fromEntries(
    cutoffs.map((k) => [
      `at${k}`,
      rankingMetrics(retrieved, relevant, k, corpusSize),
    ]),
  );
}

async function openParityStore(): Promise<VectorStore> {
  return openSQLiteVectorStore(":memory:");
}

export async function runOfflineRagEvaluation(): Promise<Record<string, unknown>> {
  const root = process.cwd();
  const dataset = RetrievalDatasetSchema.parse(
    JSON.parse(
      await readFile(resolve(root, "eval/rag/retrieval-v2.json"), "utf8"),
    ),
  );
  const trials: Trial[] = [];
  for (const source of dataset.corpus) {
    const bytes = await readFile(resolve(root, source.path));
    const actualHash = createHash("sha256").update(bytes).digest("hex");
    if (actualHash !== source.sha256)
      throw new Error(`Korpus se razlikuje od zamrznutog snimka: ${source.path}`);
    trials.push(...TrialSchema.array().parse(JSON.parse(bytes.toString("utf8"))));
  }
  const trialIds = new Set(trials.map((trial) => trial.trialId));
  if (trialIds.size !== trials.length)
    throw new Error("ID studije se ponavlja između izvora korpusa.");
  const documents: RagDocument[] = buildRagDocuments(trials);
  const embedder = new DeterministicHashEmbedder();
  const documentVectors = await embedder.embed(
    documents.map((document) => document.text),
  );
  const records: VectorRecord[] = documents.map((document, index) => ({
    id: document.id,
    trialId: document.trialId,
    kind: document.kind,
    vector: documentVectors.vectors[index]!,
  }));
  const memoryStore = new InMemoryVectorStore();
  memoryStore.upsert(records);
  for (const testCase of dataset.cases) {
    const queryTexts = buildRetrievalQueries(testCase.profile)
      .text.split(";")
      .map((query) => query.trim())
      .filter(Boolean);
    if (queryTexts.length === 0) continue;
    const queryVectors = await embedder.embed(queryTexts);
    for (const [index, query] of queryTexts.entries())
      memoryStore.putCachedEmbedding(
        embedder.model,
        hashText(query),
        queryVectors.vectors[index]!,
      );
  }
  const sqliteStore = await openParityStore();
  sqliteStore.upsert(records);
  try {
    const parityQuery = (await embedder.embed(["type 2 diabetes"])).vectors[0]!;
    const parityLimit = Math.min(20, documents.length);
    const memoryStarted = performance.now();
    const memoryHits = memoryStore.search(parityQuery, parityLimit);
    const memoryLatencyMs = performance.now() - memoryStarted;
    const sqliteStarted = performance.now();
    const sqliteHits = sqliteStore.search(parityQuery, parityLimit);
    const sqliteLatencyMs = performance.now() - sqliteStarted;
    const vectorStoreParity =
      memoryHits.length === sqliteHits.length &&
      memoryHits.every((hit, index) => {
        const counterpart = sqliteHits[index];
        return (
          counterpart !== undefined &&
          hit.id === counterpart.id &&
          hit.trialId === counterpart.trialId &&
          hit.kind === counterpart.kind &&
          Math.abs(hit.distance - counterpart.distance) <= 1e-5
        );
      });
    const vectorStoreMismatchIndex = memoryHits.findIndex((hit, index) => {
      const counterpart = sqliteHits[index];
      return (
        counterpart === undefined ||
        hit.id !== counterpart.id ||
        hit.trialId !== counterpart.trialId ||
        hit.kind !== counterpart.kind
      );
    });
    const retriever = new HybridTrialRetriever(memoryStore, embedder, trials);
    const options: HybridRetrievalOptions = {
      maxCandidates: Math.min(10, trials.length),
      maxSnippets: 5,
      maxContextChars: 12000,
    };
    const variants = {
      lexical: { sources: { lexical: true, vector: false }, rerank: false },
      vector: { sources: { lexical: false, vector: true }, rerank: false },
      hybrid: { sources: { lexical: true, vector: true }, rerank: false },
      "hybrid+rerank": {
        sources: { lexical: true, vector: true },
        rerank: true,
      },
    } as const;
    const cutoffs = rankingCutoffs(trials.length);
    const results: Record<string, unknown[]> = {};
    for (const [variant, settings] of Object.entries(variants)) {
      const variantResults = [];
      for (const testCase of dataset.cases) {
        const started = performance.now();
        const result = await retriever.retrieve(
          testCase.profile,
          trials,
          { ...options, ...settings },
        );
        const latencyMs = performance.now() - started;
        const retrievedTrials = result.trials.map((trial) => trial.trialId);
        const retrievedPassages = passageIds(result.sourceIds, result.trials);
        const diagnosticEligible =
          testCase.kind === "ranking" && testCase.relevantTrialIds.length > 0;
        variantResults.push({
          caseId: testCase.caseId,
          labelStatus: testCase.labelStatus,
          split: testCase.split,
          metricStatus: isMetricEligibleCase(testCase)
            ? "confirmed"
            : diagnosticEligible
              ? "provisional_diagnostic_only"
              : "not_ranked",
          retrievedTrialIds: retrievedTrials,
          retrievedPassageIds: retrievedPassages,
          latencyMs,
          retrievalTrace: result.retrievalTrace,
          studyMetrics: diagnosticEligible
            ? metricSet(
                retrievedTrials,
                testCase.relevantTrialIds,
                cutoffs,
                trials.length,
              )
            : null,
          passageMetrics:
            diagnosticEligible && testCase.relevantPassageIds.length > 0
              ? metricSet(
                  retrievedPassages,
                  testCase.relevantPassageIds,
                  cutoffs,
                  trials.length,
                )
              : null,
        });
      }
      results[variant] = variantResults;
    }

    const hybrid = results.hybrid ?? [];
    const reranked = results["hybrid+rerank"] ?? [];
    const pairedComparison = dataset.cases.map((testCase, index) => {
      const base = hybrid[index] as
        | { studyMetrics?: Record<string, { ndcg: number } | null> }
        | undefined;
      const rerank = reranked[index] as
        | { studyMetrics?: Record<string, { ndcg: number } | null> }
        | undefined;
      const cutoff = `at${cutoffs.at(-1) ?? 1}`;
      const before = base?.studyMetrics?.[cutoff]?.ndcg ?? null;
      const after = rerank?.studyMetrics?.[cutoff]?.ndcg ?? null;
      return {
        caseId: testCase.caseId,
        labelStatus: testCase.labelStatus,
        cutoff,
        hybridNdcg: before,
        hybridRerankNdcg: after,
        delta: before === null || after === null ? null : after - before,
        conclusion:
          testCase.labelStatus === "confirmed"
            ? "eligible_for_human_review"
            : "provisional_only_no_quality_claim",
      };
    });
    const report = {
      evaluationId: "rag-offline-v1",
      datasetId: dataset.datasetId,
      corpusSnapshotId: dataset.corpusSnapshotId,
      annotationStatus: dataset.annotationStatus,
      fakeEmbedder: { model: FAKE_MODEL, dimensions: VECTOR_DIMENSIONS },
      variants: results,
      pairedHybridVsRerank: pairedComparison,
      vectorStore: {
        parity: vectorStoreParity,
        topK: parityLimit,
        firstIdMismatch:
          vectorStoreMismatchIndex < 0
            ? null
            : {
                index: vectorStoreMismatchIndex,
                inMemory: memoryHits[vectorStoreMismatchIndex],
                sqlite: sqliteHits[vectorStoreMismatchIndex],
              },
        maxDistanceDelta: Math.max(
          0,
          ...memoryHits.map((hit, index) =>
            Math.abs(hit.distance - (sqliteHits[index]?.distance ?? hit.distance)),
          ),
        ),
        memoryLatencyMs,
        sqliteLatencyMs,
      },
      retrievalLatencyMethod:
        "Local wall-clock; fake query embeddings are pre-cached for every variant.",
      limitations: [
        "Predložene oznake su razvojna dijagnostika, ne kvalitetom potvrđeni zaključci.",
        "Kašnjenje meri lokalni offline proces i nije produkcioni SLO.",
        "RAGAS-style evaluator je heuristički; ovaj benchmark ne poziva generativni model.",
      ],
    };
    const reportDirectory = resolve(
      root,
      "eval/results/rag",
      `offline-${new Date().toISOString().replaceAll(":", "-")}`,
    );
    await mkdir(resolve(root, "eval/results/rag"), { recursive: true });
    await mkdir(reportDirectory, { recursive: false });
    await writeFile(
      resolve(reportDirectory, "summary.json"),
      `${JSON.stringify(report, null, 2)}\n`,
      { flag: "wx" },
    );
    console.log(JSON.stringify(report, null, 2));
    console.log(`Sačuvan offline RAG izveštaj: ${reportDirectory}`);
    return report;
  } finally {
    memoryStore.close();
    sqliteStore.close();
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve("dist/eval/runner/rag-offline.js")
)
  await runOfflineRagEvaluation();
