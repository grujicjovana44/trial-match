import { createHash } from "node:crypto";
import { z } from "zod";
import { buildRagDocuments } from "./documents.js";
import type { Embedder } from "./embeddings.js";
import {
  DEFAULT_EMBEDDING_MODEL,
  EMBEDDING_BATCH_SIZE,
  EMBEDDING_DIMENSIONS,
  INDEX_TOKEN_CONFIRMATION_THRESHOLD,
  INDEX_TOKEN_ESTIMATE_CALIBRATION_FACTOR,
  MAX_CHUNKS_PER_INDEX_BUILD,
} from "./config.js";
import type { RagCorpus } from "./corpus.js";
import type { PersistentVectorStore, VectorRecord } from "./vector-store.js";

export const RagIndexManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    embeddingModel: z.literal(DEFAULT_EMBEDDING_MODEL),
    dimensions: z.number().int().positive(),
    corpusVersion: z.string().min(1),
    corpusHash: z.string().regex(/^[a-f0-9]{64}$/),
    sourceHashes: z
      .array(
        z
          .object({
            path: z.string().min(1),
            version: z.string().min(1),
            sha256: z.string().regex(/^[a-f0-9]{64}$/),
          })
          .strict(),
      )
      .min(1),
    documentHashes: z
      .array(
        z
          .object({
            id: z.string().min(1),
            sha256: z.string().regex(/^[a-f0-9]{64}$/),
          })
          .strict(),
      )
      .min(1),
    createdAt: z.string().datetime({ offset: true }),
  })
  .strict();

export type RagIndexManifest = z.infer<typeof RagIndexManifestSchema>;

export function hashText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function estimateRawEmbeddingTokens(texts: readonly string[]): number {
  return texts.reduce(
    (total, text) => total + Math.ceil(Buffer.byteLength(text, "utf8") / 4),
    0,
  );
}

export function estimateEmbeddingTokens(texts: readonly string[]): number {
  return Math.ceil(
    estimateRawEmbeddingTokens(texts) * INDEX_TOKEN_ESTIMATE_CALIBRATION_FACTOR,
  );
}

export function estimatePendingEmbeddings(
  corpus: RagCorpus,
  store: PersistentVectorStore,
  model: string,
): { uniqueTexts: number; rawTokens: number; tokens: number } {
  const pendingTexts = new Map<string, string>();
  for (const document of buildRagDocuments(corpus.trials)) {
    const textHash = hashText(document.text);
    if (!pendingTexts.has(textHash)) pendingTexts.set(textHash, document.text);
  }
  const missingTexts = [...pendingTexts.entries()]
    .filter(([textHash]) => !store.getCachedEmbedding(model, textHash))
    .map(([, text]) => text);
  return {
    uniqueTexts: missingTexts.length,
    rawTokens: estimateRawEmbeddingTokens(missingTexts),
    tokens: estimateEmbeddingTokens(missingTexts),
  };
}

export async function buildVectorIndex(options: {
  corpus: RagCorpus;
  store: PersistentVectorStore;
  embedder: Embedder;
  confirmLarge?: boolean;
  batchSize?: number;
  maxChunks?: number;
  tokenConfirmationThreshold?: number;
  now?: () => number;
}): Promise<{
  manifest: RagIndexManifest;
  embeddedTexts: number;
  reusedTexts: number;
  rawEstimatedTokens: number;
  estimatedTokens: number;
  embeddingCalls: number;
  tokensUsed: number;
}> {
  const documents = buildRagDocuments(options.corpus.trials);
  const maxChunks = options.maxChunks ?? MAX_CHUNKS_PER_INDEX_BUILD;
  const batchSize = options.batchSize ?? EMBEDDING_BATCH_SIZE;
  if (!Number.isSafeInteger(maxChunks) || maxChunks < 1)
    throw new Error("MAX_CHUNKS_PER_INDEX_BUILD mora biti pozitivan ceo broj.");
  if (!Number.isSafeInteger(batchSize) || batchSize < 1)
    throw new Error("Embedding batch size mora biti pozitivan ceo broj.");
  if (documents.length > maxChunks)
    throw new Error(
      `Indeks sadrži ${documents.length} odlomaka, iznad limita ${maxChunks}. Podelite korpus ili povećajte konfigurisani limit.`,
    );
  if (documents.length === 0)
    throw new Error("Korpus nema tekstova za embeddings.");

  const uniqueTexts = new Map<string, string>();
  const documentHashes = documents.map((document) => {
    const textHash = hashText(document.text);
    uniqueTexts.set(textHash, document.text);
    return { id: document.id, sha256: textHash };
  });
  const uniqueHashes = [...uniqueTexts.keys()].sort((left, right) =>
    left.localeCompare(right, "en"),
  );
  const threshold =
    options.tokenConfirmationThreshold ?? INDEX_TOKEN_CONFIRMATION_THRESHOLD;
  const embeddingsByHash = new Map<string, number[]>();
  const missing: string[] = [];
  let reusedTexts = 0;
  let embeddingCalls = 0;
  let tokensUsed = 0;
  for (const textHash of uniqueHashes) {
    const cached = options.store.getCachedEmbedding(
      options.embedder.model,
      textHash,
    );
    if (cached) {
      if (
        cached.length !== EMBEDDING_DIMENSIONS ||
        cached.some((value) => !Number.isFinite(value))
      )
        throw new Error(
          `Keširani embedding ${textHash} ima neispravnu dimenziju.`,
        );
      embeddingsByHash.set(textHash, cached);
      reusedTexts += 1;
    } else {
      missing.push(textHash);
    }
  }

  const missingTexts = missing.map((textHash) => uniqueTexts.get(textHash)!);
  const rawEstimatedTokens = estimateRawEmbeddingTokens(missingTexts);
  const estimatedTokens = estimateEmbeddingTokens(missingTexts);
  if (estimatedTokens > threshold && options.confirmLarge !== true)
    throw new Error(
      `Procena je ${estimatedTokens} tokena, iznad praga ${threshold}. Potrebna je eksplicitna potvrda pre embeddings poziva.`,
    );

  for (let offset = 0; offset < missing.length; offset += batchSize) {
    const batchHashes = missing.slice(offset, offset + batchSize);
    const batch = await options.embedder.embed(
      batchHashes.map((textHash) => uniqueTexts.get(textHash)!),
    );
    embeddingCalls += 1;
    tokensUsed += batch.tokens;
    if (
      batch.dimensions !== EMBEDDING_DIMENSIONS ||
      batch.vectors.length !== batchHashes.length
    )
      throw new Error(
        "Embedding batch odgovor ne odgovara indeks konfiguraciji.",
      );
    for (const [index, textHash] of batchHashes.entries()) {
      const vector = batch.vectors[index]!;
      if (
        vector.length !== EMBEDDING_DIMENSIONS ||
        vector.some((value) => !Number.isFinite(value))
      )
        throw new Error(`Embedding za ${textHash} ima neispravne vrednosti.`);
      options.store.putCachedEmbedding(
        options.embedder.model,
        textHash,
        vector,
      );
      embeddingsByHash.set(textHash, vector);
    }
  }

  const records: VectorRecord[] = documents.map((document, index) => {
    const textHash = documentHashes[index]!.sha256;
    const vector = embeddingsByHash.get(textHash);
    if (!vector)
      throw new Error(`Nedostaje embedding za dokument ${document.id}.`);
    return {
      id: document.id,
      trialId: document.trialId,
      kind: document.kind,
      vector,
    };
  });
  const manifest = RagIndexManifestSchema.parse({
    schemaVersion: 1,
    embeddingModel: options.embedder.model,
    dimensions: EMBEDDING_DIMENSIONS,
    corpusVersion: options.corpus.version,
    corpusHash: options.corpus.sha256,
    sourceHashes: options.corpus.sources,
    documentHashes: documentHashes.sort((left, right) =>
      left.id.localeCompare(right.id, "en"),
    ),
    createdAt: new Date((options.now ?? Date.now)()).toISOString(),
  });

  options.store.commitIndex(records, JSON.stringify(manifest));
  options.store.pruneEmbeddingCache(
    options.embedder.model,
    new Set(uniqueHashes),
  );
  return {
    manifest,
    embeddedTexts: missing.length,
    reusedTexts,
    rawEstimatedTokens,
    estimatedTokens,
    embeddingCalls,
    tokensUsed,
  };
}
