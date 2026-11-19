import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { TrialSchema, type Trial } from "../../packages/shared/src/index.js";
import {
  buildRagDocuments,
  type RagDocument,
} from "../../apps/server/src/retrieval/documents.js";
import { hashRagSourceContent } from "../../apps/server/src/retrieval/corpus.js";
import {
  createOpenAIEmbeddingClient,
  type Embedder,
} from "../../apps/server/src/retrieval/embeddings.js";
import {
  HybridTrialRetriever,
  type HybridRetrievalOptions,
  validateIndexDocuments,
} from "../../apps/server/src/retrieval/hybrid-retrieve.js";
import { buildRetrievalQueries } from "../../apps/server/src/retrieval/query.js";
import {
  hashText,
  RagIndexManifestSchema,
} from "../../apps/server/src/retrieval/indexing.js";
import {
  isMetricEligibleCase,
  rankingCutoffs,
  rankingMetrics,
  RetrievalDatasetSchema,
} from "./rag-retrieval.js";
import {
  DEFAULT_EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
} from "../../apps/server/src/retrieval/config.js";
import {
  InMemoryVectorStore,
  openSQLiteVectorStore,
  type PersistentVectorStore,
  type VectorRecord,
  type VectorStore,
} from "../../apps/server/src/retrieval/vector-store.js";

const FAKE_MODEL = "offline-rag-hash-v1";
const VECTOR_DIMENSIONS = EMBEDDING_DIMENSIONS;

export type RagOfflineOptions = {
  embeddingMode?: "fake" | "real";
  caseIds?: string[];
  indexPath?: string;
  datasetPath?: string;
};

function commandOptions(args: string[]): RagOfflineOptions {
  const options: RagOfflineOptions = {};
  for (let index = 0; index < args.length; index += 1) {
    const [flag, inlineValue] = args[index]!.split("=", 2);
    if (flag === "--" || flag === "--summary") continue;
    if (flag === "--embedding-mode") {
      const value = inlineValue ?? args[++index];
      if (value !== "fake" && value !== "real")
        throw new Error("--embedding-mode mora biti fake ili real.");
      options.embeddingMode = value;
    } else if (flag === "--cases") {
      const value = inlineValue ?? args[++index];
      if (!value?.trim()) throw new Error("--cases zahteva ID-jeve slučajeva.");
      options.caseIds = value.split(",").map((caseId) => caseId.trim());
    } else if (flag === "--index") {
      const value = inlineValue ?? args[++index];
      if (!value?.trim()) throw new Error("--index zahteva putanju.");
      options.indexPath = value;
    } else if (flag === "--dataset") {
      const value = inlineValue ?? args[++index];
      if (!value?.trim()) throw new Error("--dataset zahteva putanju.");
      options.datasetPath = value;
    } else {
      throw new Error(`Nepoznata opcija eval:rag:offline: ${flag}`);
    }
  }
  return options;
}

async function openExistingIndex(
  indexPath: string,
  trials: Trial[],
): Promise<PersistentVectorStore> {
  try {
    const info = await stat(indexPath);
    if (!info.isFile()) throw new Error(`RAG indeks nije fajl: ${indexPath}`);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    )
      throw new Error(
        `Stvarni embedding režim zahteva već izgrađen indeks: ${indexPath}`,
      );
    throw error;
  }

  const store = await openSQLiteVectorStore(indexPath);
  try {
    const serialized = store.getManifest();
    if (!serialized) throw new Error("SQLite RAG indeks nema manifest.");
    const manifest = RagIndexManifestSchema.parse(JSON.parse(serialized));
    if (manifest.dimensions !== EMBEDDING_DIMENSIONS)
      throw new Error("RAG indeks ima nepodržanu embedding dimenziju.");
    if (manifest.embeddingModel !== DEFAULT_EMBEDDING_MODEL)
      throw new Error("RAG indeks koristi nepodržan embedding model.");
    validateIndexDocuments(manifest.documentHashes, trials);
    return store;
  } catch (error) {
    store.close();
    throw error;
  }
}

class DeterministicHashEmbedder implements Embedder {
  readonly model = FAKE_MODEL;

  async embed(input: readonly string[]) {
    return {
      vectors: input.map((text) => {
        const vector = Array.from({ length: VECTOR_DIMENSIONS }, () => 0);
        for (const token of text
          .toLocaleLowerCase("en")
          .match(/[\p{Letter}\p{Number}]+/gu) ?? []) {
          const digest = createHash("sha256").update(token).digest();
          const index = digest.readUInt32BE(0) % VECTOR_DIMENSIONS;
          vector[index] = vector[index]! + 1;
        }
        const norm = Math.sqrt(
          vector.reduce((sum, value) => sum + value * value, 0),
        );
        return norm === 0 ? vector : vector.map((value) => value / norm);
      }),
      dimensions: VECTOR_DIMENSIONS,
      tokens: 0,
    };
  }
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

export async function runOfflineRagEvaluation(
  options: RagOfflineOptions = {},
): Promise<Record<string, unknown>> {
  const root = process.cwd();
  const dataset = RetrievalDatasetSchema.parse(
    JSON.parse(
      await readFile(resolve(root, options.datasetPath ?? "eval/rag/retrieval-v2.json"), "utf8"),
    ),
  );
  const trials: Trial[] = [];
  for (const source of dataset.corpus) {
    const bytes = await readFile(resolve(root, source.path));
    const actualHash = hashRagSourceContent(bytes);
    if (actualHash !== source.sha256)
      throw new Error(
        `Korpus se razlikuje od zamrznutog snimka: ${source.path}`,
      );
    trials.push(
      ...TrialSchema.array().parse(JSON.parse(bytes.toString("utf8"))),
    );
  }
  const trialIds = new Set(trials.map((trial) => trial.trialId));
  if (trialIds.size !== trials.length)
    throw new Error("ID studije se ponavlja između izvora korpusa.");
  const documents: RagDocument[] = buildRagDocuments(trials);
  const embeddingMode = options.embeddingMode ?? "fake";
  const selectedCases = options.caseIds
    ? dataset.cases.filter((testCase) =>
        options.caseIds!.includes(testCase.caseId),
      )
    : dataset.cases;
  if (
    !selectedCases.length ||
    (options.caseIds &&
      (new Set(options.caseIds).size !== options.caseIds.length ||
        selectedCases.length !== options.caseIds.length))
  )
    throw new Error("Izbor slučajeva je prazan, dupliran ili nepoznat.");

  let embedder: Embedder;
  let vectorStore: PersistentVectorStore;
  let memoryStore: InMemoryVectorStore | undefined;
  let parityStore: VectorStore | undefined;
  let indexPath: string | undefined;
  if (embeddingMode === "fake") {
    embedder = new DeterministicHashEmbedder();
    memoryStore = new InMemoryVectorStore();
    vectorStore = memoryStore;
    const documentVectors = await embedder.embed(
      documents.map((document) => document.text),
    );
    const records: VectorRecord[] = documents.map((document, index) => ({
      id: document.id,
      trialId: document.trialId,
      kind: document.kind,
      vector: documentVectors.vectors[index]!,
    }));
    memoryStore.upsert(records);
    for (const testCase of selectedCases) {
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
    parityStore = await openParityStore();
    parityStore.upsert(records);
  } else {
    indexPath = resolve(root, options.indexPath ?? "data/index/rag.sqlite");
    vectorStore = await openExistingIndex(indexPath, trials);
    try {
      embedder = createOpenAIEmbeddingClient();
    } catch (error) {
      vectorStore.close();
      throw error;
    }
  }

  try {
    let vectorStoreParity: boolean | null = null;
    let vectorStoreMismatchIndex = -1;
    let parityLimit = 0;
    let memoryHits: ReturnType<VectorStore["search"]> = [];
    let sqliteHits: ReturnType<VectorStore["search"]> = [];
    let memoryLatencyMs: number | null = null;
    let sqliteLatencyMs: number | null = null;
    if (memoryStore && parityStore) {
      const parityQuery = (await embedder.embed(["type 2 diabetes"]))
        .vectors[0]!;
      parityLimit = Math.min(20, documents.length);
      const memoryStarted = performance.now();
      memoryHits = memoryStore.search(parityQuery, parityLimit);
      memoryLatencyMs = performance.now() - memoryStarted;
      const sqliteStarted = performance.now();
      sqliteHits = parityStore.search(parityQuery, parityLimit);
      sqliteLatencyMs = performance.now() - sqliteStarted;
      vectorStoreParity =
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
      vectorStoreMismatchIndex = memoryHits.findIndex((hit, index) => {
        const counterpart = sqliteHits[index];
        return (
          counterpart === undefined ||
          hit.id !== counterpart.id ||
          hit.trialId !== counterpart.trialId ||
          hit.kind !== counterpart.kind
        );
      });
    }
    const retriever = new HybridTrialRetriever(vectorStore, embedder, trials);
    const retrievalOptions: HybridRetrievalOptions = {
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
    const studyCutoffs = rankingCutoffs(trials.length);
    const passageCount = documents.filter(
      (document) => document.kind === "passage",
    ).length;
    const passageCutoffs = rankingCutoffs(passageCount);
    const results: Record<string, unknown[]> = {};
    for (const [variant, settings] of Object.entries(variants)) {
      const variantResults = [];
      for (const testCase of selectedCases) {
        const started = performance.now();
        const result = await retriever.retrieve(testCase.profile, trials, {
          ...retrievalOptions,
          ...settings,
        });
        const latencyMs = performance.now() - started;
        const retrievedTrials = result.trials.map((trial) => trial.trialId);
        const retrievedPassages = result.passageIds;
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
          topPassages: retrievedPassages.slice(0, 5).map((id, index) => ({
            rank: index + 1,
            id,
            relevant: testCase.relevantPassageIds.includes(id),
          })),
          latencyMs,
          retrievalTrace: result.retrievalTrace,
          studyMetrics: diagnosticEligible
            ? metricSet(
                retrievedTrials,
                testCase.relevantTrialIds,
                studyCutoffs,
                trials.length,
              )
            : null,
          passageMetrics:
            diagnosticEligible && testCase.relevantPassageIds.length > 0
              ? metricSet(
                  retrievedPassages,
                  testCase.relevantPassageIds,
                  passageCutoffs,
                  passageCount,
                )
              : null,
        });
      }
      results[variant] = variantResults;
    }

    const hybrid = results.hybrid ?? [];
    const reranked = results["hybrid+rerank"] ?? [];
    const pairedComparison = selectedCases.map((testCase, index) => {
      const base = hybrid[index] as
        | {
            studyMetrics?: Record<string, { ndcg: number } | null>;
            passageMetrics?: Record<string, { ndcg: number } | null> | null;
          }
        | undefined;
      const rerank = reranked[index] as
        | {
            studyMetrics?: Record<string, { ndcg: number } | null>;
            passageMetrics?: Record<string, { ndcg: number } | null> | null;
          }
        | undefined;
      const cutoff = `at${studyCutoffs.at(-1) ?? 1}`;
      const before = base?.studyMetrics?.[cutoff]?.ndcg ?? null;
      const after = rerank?.studyMetrics?.[cutoff]?.ndcg ?? null;
      const passageCutoff = "at5";
      const passageBefore = base?.passageMetrics?.[passageCutoff]?.ndcg ?? null;
      const passageAfter =
        rerank?.passageMetrics?.[passageCutoff]?.ndcg ?? null;
      return {
        caseId: testCase.caseId,
        labelStatus: testCase.labelStatus,
        cutoff,
        hybridNdcg: before,
        hybridRerankNdcg: after,
        delta: before === null || after === null ? null : after - before,
        passageCutoff,
        hybridPassageNdcg: passageBefore,
        hybridRerankPassageNdcg: passageAfter,
        passageDelta:
          passageBefore === null || passageAfter === null
            ? null
            : passageAfter - passageBefore,
        conclusion:
          testCase.labelStatus === "confirmed"
            ? "eligible_for_human_review"
            : "provisional_only_no_quality_claim",
      };
    });
    const report = {
      evaluationId: `rag-offline-${embeddingMode}-v2`,
      datasetId: dataset.datasetId,
      corpusSnapshotId: dataset.corpusSnapshotId,
      annotationStatus: dataset.annotationStatus,
      embeddingEvaluation: {
        mode: embeddingMode,
        semanticEvidence:
          embeddingMode === "real"
            ? "valid_semantic_retrieval_evidence"
            : "not_valid_semantic_quality_evidence",
        model: embedder.model,
        dimensions: VECTOR_DIMENSIONS,
        indexPath: indexPath ?? null,
        caseIds: selectedCases.map(({ caseId }) => caseId),
      },
      variants: results,
      pairedHybridVsRerank: pairedComparison,
      vectorStore:
        vectorStoreParity === null
          ? null
          : {
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
                  Math.abs(
                    hit.distance -
                      (sqliteHits[index]?.distance ?? hit.distance),
                  ),
                ),
              ),
              memoryLatencyMs,
              sqliteLatencyMs,
            },
      retrievalLatencyMethod:
        embeddingMode === "fake"
          ? "Local wall-clock; simulated query embeddings are pre-cached for every variant."
          : "Local wall-clock; real query embeddings use the existing persistent embedding cache.",
      limitations: [
        "Hash embedder daje simulirane/noisy vektorske rezultate i nije dokaz semantičkog kvaliteta.",
        "Rezultati lažnog i stvarnog embedding režima moraju se posmatrati odvojeno.",
        "Rezultati su ograničeni obimom i statusom oznaka ovog skupa; nisu potvrda kvaliteta van njega.",
        "Kašnjenje meri lokalni offline proces i nije produkcioni SLO.",
        "RAGAS-style evaluator je heuristički; ovaj benchmark ne poziva generativni model.",
      ],
    };
    const reportDirectory = resolve(
      root,
      "eval/results/rag",
      `offline-${embeddingMode}-${new Date().toISOString().replaceAll(":", "-")}`,
    );
    await mkdir(resolve(root, "eval/results/rag"), { recursive: true });
    await mkdir(reportDirectory, { recursive: false });
    await writeFile(
      resolve(reportDirectory, "summary.json"),
      `${JSON.stringify(report, null, 2)}\n`,
      { flag: "wx" },
    );
    if (process.argv.includes("--summary")) {
      const selectMetrics = (value: unknown) => {
        if (typeof value !== "object" || value === null) return null;
        const metrics = value as Record<string, unknown>;
        return Object.fromEntries(
          ["at1", "at2", "at3", "at5"].flatMap((key) =>
            key in metrics ? [[key, metrics[key]]] : [],
          ),
        );
      };
      console.log(
        JSON.stringify(
          {
            evaluationId: report.evaluationId,
            datasetId: report.datasetId,
            corpusSnapshotId: report.corpusSnapshotId,
            annotationStatus: report.annotationStatus,
            embeddingEvaluation: report.embeddingEvaluation,
            cases: Object.fromEntries(
              Object.entries(results).map(([variant, entries]) => [
                variant,
                entries.map((entry) => {
                  const item = entry as Record<string, unknown>;
                  return {
                    caseId: item.caseId,
                    labelStatus: item.labelStatus,
                    metricStatus: item.metricStatus,
                    retrievedTrialIds: item.retrievedTrialIds,
                    topPassages: item.topPassages,
                    studyMetrics: selectMetrics(item.studyMetrics),
                    passageMetrics: selectMetrics(item.passageMetrics),
                  };
                }),
              ]),
            ),
            pairedHybridVsRerank: report.pairedHybridVsRerank,
            vectorStore: report.vectorStore,
          },
          null,
          2,
        ),
      );
    } else console.log(JSON.stringify(report, null, 2));
    console.log(`Sačuvan offline RAG izveštaj: ${reportDirectory}`);
    return report;
  } finally {
    vectorStore.close();
    parityStore?.close();
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve("dist/eval/runner/rag-offline.js")
)
  await runOfflineRagEvaluation(commandOptions(process.argv.slice(2)));
