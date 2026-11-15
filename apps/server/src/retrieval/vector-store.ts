import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";

export type VectorKind = "study" | "passage";

export type VectorRecord = {
  id: string;
  trialId: string;
  kind: VectorKind;
  vector: readonly number[];
};

export type VectorHit = {
  id: string;
  trialId: string;
  kind: VectorKind;
  distance: number;
};

export interface VectorStore {
  upsert(records: readonly VectorRecord[]): void;
  search(
    vector: readonly number[],
    limit: number,
    kind?: VectorKind,
  ): VectorHit[];
  clear(): void;
  close(): void;
}

export interface PersistentVectorStore extends VectorStore {
  commitIndex(records: readonly VectorRecord[], manifest: string): void;
  getCachedEmbedding(model: string, textHash: string): number[] | undefined;
  putCachedEmbedding(
    model: string,
    textHash: string,
    vector: readonly number[],
  ): void;
  pruneEmbeddingCache(model: string, usedTextHashes: ReadonlySet<string>): void;
  getManifest(): string | undefined;
}

const supportedPlatforms = new Set([
  "darwin-arm64",
  "darwin-x64",
  "linux-arm64",
  "linux-x64",
  "win32-x64",
]);
const SqlVectorHitSchema = z
  .object({
    id: z.string(),
    trialId: z.string(),
    kind: z.enum(["study", "passage"]),
    distance: z.number().finite(),
  })
  .strict();

export function assertSupportedVectorPlatform(
  platform = process.platform,
  architecture = process.arch,
): void {
  if (!supportedPlatforms.has(`${platform}-${architecture}`)) {
    throw new Error(
      `SQLite vektorski indeks ne podržava platformu ${platform}/${architecture}. ` +
        "Podržani su macOS arm64/x64, Linux arm64/x64 i Windows x64. " +
        "Pokrenite aplikaciju na podržanoj platformi ili koristite InMemoryVectorStore samo za testove/offline evaluaciju.",
    );
  }
}

function assertVector(vector: readonly number[]): void {
  if (vector.length === 0 || vector.some((value) => !Number.isFinite(value))) {
    throw new Error(
      "Embedding mora biti neprazan i sadržati samo konačne brojeve.",
    );
  }
}

function distanceL2(left: readonly number[], right: readonly number[]): number {
  if (left.length !== right.length)
    throw new Error("Dimenzije query i index embeddinga se ne podudaraju.");
  let sum = 0;
  for (let index = 0; index < left.length; index += 1) {
    const difference = Math.fround(
      Math.fround(left[index]!) - Math.fround(right[index]!),
    );
    sum = Math.fround(sum + Math.fround(difference * difference));
  }
  return Math.fround(Math.sqrt(sum));
}

function validateSearch(vector: readonly number[], limit: number): void {
  assertVector(vector);
  if (!Number.isSafeInteger(limit) || limit < 0)
    throw new Error("VectorStore limit mora biti nenegativan ceo broj.");
}

export class InMemoryVectorStore implements PersistentVectorStore {
  private readonly records = new Map<string, VectorRecord>();
  private readonly embeddingCache = new Map<string, number[]>();
  private manifest: string | undefined;

  upsert(records: readonly VectorRecord[]): void {
    for (const record of records) {
      assertVector(record.vector);
      this.records.set(record.id, {
        ...record,
        vector: [...record.vector],
      });
    }
  }

  search(
    vector: readonly number[],
    limit: number,
    kind?: VectorKind,
  ): VectorHit[] {
    validateSearch(vector, limit);
    if (limit === 0) return [];
    return [...this.records.values()]
      .filter((record) => kind === undefined || record.kind === kind)
      .map((record) => ({
        id: record.id,
        trialId: record.trialId,
        kind: record.kind,
        distance: distanceL2(vector, record.vector),
      }))
      .sort(
        (left, right) =>
          left.distance - right.distance ||
          left.id.localeCompare(right.id, "en"),
      )
      .slice(0, limit);
  }

  clear(): void {
    this.records.clear();
  }

  commitIndex(records: readonly VectorRecord[], manifest: string): void {
    this.clear();
    this.upsert(records);
    this.manifest = manifest;
  }

  getCachedEmbedding(model: string, textHash: string): number[] | undefined {
    const vector = this.embeddingCache.get(`${model}\t${textHash}`);
    return vector ? [...vector] : undefined;
  }

  putCachedEmbedding(
    model: string,
    textHash: string,
    vector: readonly number[],
  ): void {
    assertVector(vector);
    this.embeddingCache.set(`${model}\t${textHash}`, [...vector]);
  }

  pruneEmbeddingCache(
    model: string,
    usedTextHashes: ReadonlySet<string>,
  ): void {
    for (const key of this.embeddingCache.keys())
      if (
        key.startsWith(`${model}\t`) &&
        !usedTextHashes.has(key.slice(model.length + 1))
      )
        this.embeddingCache.delete(key);
  }

  getManifest(): string | undefined {
    return this.manifest;
  }

  close(): void {}
}

function vectorBlob(vector: readonly number[]): Uint8Array {
  assertVector(vector);
  return new Uint8Array(Float32Array.from(vector).buffer);
}

function vectorFromBlob(blob: Uint8Array, dimension: number): number[] {
  if (blob.byteLength !== dimension * Float32Array.BYTES_PER_ELEMENT)
    throw new Error("Embedding sačuvan u SQLite kešu ima nevažeću dimenziju.");
  return Array.from(new Float32Array(blob.buffer, blob.byteOffset, dimension));
}

export async function openSQLiteVectorStore(
  databasePath: string,
): Promise<SQLiteVectorStore> {
  assertSupportedVectorPlatform();
  if (databasePath !== ":memory:")
    await mkdir(dirname(databasePath), { recursive: true });

  const [{ DatabaseSync }, sqliteVec] = await Promise.all([
    import("node:sqlite"),
    import("sqlite-vec"),
  ]);
  const database = new DatabaseSync(databasePath, {
    allowExtension: true,
    timeout: 5000,
  });
  try {
    sqliteVec.load(database);
    database.enableLoadExtension(false);
  } catch (error) {
    database.close();
    throw new Error(
      "Nije moguće učitati sqlite-vec SQLite ekstenziju. Proverite da je sqlite-vec@0.1.9 " +
        "instaliran sa platformskim paketom i da Node podržava node:sqlite/allowExtension; " +
        "zatim pokrenite `pnpm install --frozen-lockfile` i `pnpm sqlite:smoke`.",
      { cause: error },
    );
  }
  try {
    return new SQLiteVectorStore(database);
  } catch (error) {
    database.close();
    throw error;
  }
}

export class SQLiteVectorStore implements PersistentVectorStore {
  private readonly insertRecord: ReturnType<DatabaseSync["prepare"]>;
  private readonly insertCache: ReturnType<DatabaseSync["prepare"]>;

  constructor(private readonly database: DatabaseSync) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS rag_vectors (
        id TEXT PRIMARY KEY,
        trial_id TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('study', 'passage')),
        embedding BLOB NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS rag_vectors_kind_idx ON rag_vectors(kind);
      CREATE TABLE IF NOT EXISTS rag_embedding_cache (
        model TEXT NOT NULL,
        text_hash TEXT NOT NULL,
        dimension INTEGER NOT NULL,
        embedding BLOB NOT NULL,
        PRIMARY KEY (model, text_hash)
      ) STRICT;
      CREATE TABLE IF NOT EXISTS rag_index_manifest (
        singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
        value TEXT NOT NULL
      ) STRICT;
    `);
    this.insertRecord = database.prepare(`
      INSERT INTO rag_vectors (id, trial_id, kind, embedding)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        trial_id = excluded.trial_id,
        kind = excluded.kind,
        embedding = excluded.embedding
    `);
    this.insertCache = database.prepare(`
      INSERT INTO rag_embedding_cache (model, text_hash, dimension, embedding)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(model, text_hash) DO UPDATE SET
        dimension = excluded.dimension,
        embedding = excluded.embedding
    `);
  }

  upsert(records: readonly VectorRecord[]): void {
    this.database.exec("BEGIN");
    try {
      for (const record of records) this.writeRecord(record);
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  commitIndex(records: readonly VectorRecord[], manifest: string): void {
    this.database.exec("BEGIN");
    try {
      this.database.exec("DELETE FROM rag_vectors");
      for (const record of records) this.writeRecord(record);
      this.database
        .prepare(
          `INSERT INTO rag_index_manifest (singleton, value) VALUES (1, ?)
           ON CONFLICT(singleton) DO UPDATE SET value = excluded.value`,
        )
        .run(manifest);
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  search(
    vector: readonly number[],
    limit: number,
    kind?: VectorKind,
  ): VectorHit[] {
    validateSearch(vector, limit);
    if (limit === 0) return [];
    const statement = this.database.prepare(`
      SELECT id, trial_id AS trialId, kind,
        vec_distance_L2(embedding, ?) AS distance
      FROM rag_vectors
      WHERE (? IS NULL OR kind = ?)
      ORDER BY distance ASC, id ASC
      LIMIT ?
    `);
    return SqlVectorHitSchema.array().parse(
      statement.all(vectorBlob(vector), kind ?? null, kind ?? null, limit),
    );
  }

  clear(): void {
    this.database.exec("DELETE FROM rag_vectors");
  }

  getCachedEmbedding(model: string, textHash: string): number[] | undefined {
    const row = z
      .object({
        dimension: z.number().int().positive(),
        embedding: z.instanceof(Uint8Array),
      })
      .strict()
      .optional()
      .parse(
        this.database
          .prepare(
            "SELECT dimension, embedding FROM rag_embedding_cache WHERE model = ? AND text_hash = ?",
          )
          .get(model, textHash),
      );
    return row ? vectorFromBlob(row.embedding, row.dimension) : undefined;
  }

  putCachedEmbedding(
    model: string,
    textHash: string,
    vector: readonly number[],
  ): void {
    assertVector(vector);
    this.insertCache.run(model, textHash, vector.length, vectorBlob(vector));
  }

  pruneEmbeddingCache(
    model: string,
    usedTextHashes: ReadonlySet<string>,
  ): void {
    const remove = this.database.prepare(
      "DELETE FROM rag_embedding_cache WHERE model = ? AND text_hash = ?",
    );
    const existing = z
      .object({ text_hash: z.string() })
      .strict()
      .array()
      .parse(
        this.database
          .prepare("SELECT text_hash FROM rag_embedding_cache WHERE model = ?")
          .all(model),
      );
    this.database.exec("BEGIN");
    try {
      for (const { text_hash: textHash } of existing)
        if (!usedTextHashes.has(textHash)) remove.run(model, textHash);
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  getManifest(): string | undefined {
    const row = z
      .object({ value: z.string() })
      .strict()
      .optional()
      .parse(
        this.database
          .prepare("SELECT value FROM rag_index_manifest WHERE singleton = 1")
          .get(),
      );
    return row?.value;
  }

  private writeRecord(record: VectorRecord): void {
    assertVector(record.vector);
    this.insertRecord.run(
      record.id,
      record.trialId,
      record.kind,
      vectorBlob(record.vector),
    );
  }

  close(): void {
    this.database.close();
  }
}
