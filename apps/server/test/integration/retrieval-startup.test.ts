import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/api/app.js";
import { parseConfig } from "../../src/config/index.js";
import { loadRagCorpus } from "../../src/retrieval/corpus.js";
import { buildVectorIndex } from "../../src/retrieval/indexing.js";
import {
  EMBEDDING_DIMENSIONS,
  DEFAULT_EMBEDDING_MODEL,
} from "../../src/retrieval/config.js";
import { openSQLiteVectorStore } from "../../src/retrieval/vector-store.js";

const dirs: string[] = [];
afterEach(async () =>
  Promise.all(
    dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  ),
);
async function tempDir() {
  const dir = await mkdtemp(join(tmpdir(), "trialmatch-rag-startup-"));
  dirs.push(dir);
  return dir;
}
function appFor(indexPath: string) {
  return createApp({
    config: parseConfig({
      NODE_ENV: "development",
      DEMO_MODE: "true",
      DATASET_PROFILE: "fixtures",
      DATA_DIR: "data/fixtures",
      RAG_INDEX_PATH: indexPath,
    }),
  });
}

describe("DEMO RAG startup fallback", () => {
  it("prikazuje lexical fallback kada indeks nedostaje", async () => {
    const app = appFor(join(await tempDir(), "missing.sqlite"));
    try {
      const response = await app.inject({ method: "GET", url: "/health" });
      expect(response.json()).toMatchObject({
        retrievalMode: "lexical-only",
        retrievalFallbackReason: "index_missing",
      });
    } finally {
      await app.close();
    }
  });

  it("prikazuje lexical fallback za zastareo ili nečitljiv indeks", async () => {
    const dir = await tempDir();
    const index = join(dir, "stale.sqlite");
    await writeFile(index, "nije SQLite indeks");
    const app = appFor(index);
    try {
      const response = await app.inject({ method: "GET", url: "/health" });
      expect(response.json()).toMatchObject({
        retrievalMode: "lexical-only",
        retrievalFallbackReason: "index_invalid",
      });
    } finally {
      await app.close();
    }
  });

  it("učitava validan lokalni indeks kao hybrid bez poziva embedding servisu", async () => {
    const dir = await tempDir();
    const index = join(dir, "valid.sqlite");
    const corpus = await loadRagCorpus(["data/fixtures"]);
    const store = await openSQLiteVectorStore(index);
    try {
      await buildVectorIndex({
        corpus,
        store,
        embedder: {
          model: DEFAULT_EMBEDDING_MODEL,
          async embed(input) {
            return {
              vectors: input.map(() =>
                Array.from({ length: EMBEDDING_DIMENSIONS }, (_, i) =>
                  i === 0 ? 1 : 0,
                ),
              ),
              dimensions: EMBEDDING_DIMENSIONS,
              tokens: 0,
            };
          },
        },
      });
    } finally {
      store.close();
    }
    const previousKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "test-placeholder-no-network-call";
    const app = appFor(index);
    try {
      const response = await app.inject({ method: "GET", url: "/health" });
      expect(response.json()).toMatchObject({
        retrievalMode: "hybrid",
        retrievalFallbackReason: null,
      });
    } finally {
      await app.close();
      if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = previousKey;
    }
  });
});
