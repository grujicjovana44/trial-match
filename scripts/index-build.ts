import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { resolve } from "node:path";
import { buildRagDocuments } from "../apps/server/src/retrieval/documents.js";
import { createOpenAIEmbeddingClient } from "../apps/server/src/retrieval/embeddings.js";
import {
  buildVectorIndex,
  estimatePendingEmbeddings,
} from "../apps/server/src/retrieval/indexing.js";
import {
  INDEX_TOKEN_CONFIRMATION_THRESHOLD,
  MAX_CHUNKS_PER_INDEX_BUILD,
} from "../apps/server/src/retrieval/config.js";
import { loadRagCorpus } from "../apps/server/src/retrieval/corpus.js";
import { openSQLiteVectorStore } from "../apps/server/src/retrieval/vector-store.js";

async function main(): Promise<void> {
  const corpus = await loadRagCorpus();
  const client = createOpenAIEmbeddingClient();
  const documents = buildRagDocuments(corpus.trials);
  const databasePath = resolve("data/index/rag.sqlite");
  const store = await openSQLiteVectorStore(databasePath);
  try {
    const estimate = estimatePendingEmbeddings(corpus, store, client.model);
    console.log(
      `Korpus: ${corpus.trials.length} studija, ${documents.length} teksta; ` +
        `${estimate.uniqueTexts} novih jedinstvenih tekstova; procena ${estimate.tokens} tokena.`,
    );
    if (corpus.skipped.length > 0) {
      console.log(
        `Preskočeno ${corpus.skipped.length} nepodržanih ili nepotvrđenih JSON fajlova:`,
      );
      for (const entry of corpus.skipped)
        console.log(`- ${entry.path}: ${entry.reason}`);
    }
    if (documents.length > MAX_CHUNKS_PER_INDEX_BUILD)
      throw new Error(
        `Broj tekstova (${documents.length}) prelazi MAX_CHUNKS_PER_INDEX_BUILD=${MAX_CHUNKS_PER_INDEX_BUILD}.`,
      );

    let confirmLarge = false;
    if (estimate.tokens > INDEX_TOKEN_CONFIRMATION_THRESHOLD) {
      if (process.argv.includes("--confirm-large")) {
        confirmLarge = true;
      } else if (stdin.isTTY) {
        const prompt = createInterface({ input: stdin, output: stdout });
        try {
          const answer = await prompt.question(
            `Procena prelazi prag ${INDEX_TOKEN_CONFIRMATION_THRESHOLD}. Nastaviti? [y/N] `,
          );
          confirmLarge = answer.trim().toLowerCase() === "y";
        } finally {
          prompt.close();
        }
      }
      if (!confirmLarge)
        throw new Error(
          "Indeksiranje je prekinuto pre embeddings poziva; prosledite --confirm-large za eksplicitnu potvrdu.",
        );
    }

    const result = await buildVectorIndex({
      corpus,
      store,
      embedder: client,
      confirmLarge,
      maxChunks: MAX_CHUNKS_PER_INDEX_BUILD,
    });
    console.log(
      JSON.stringify({
        index: databasePath,
        model: result.manifest.embeddingModel,
        dimensions: result.manifest.dimensions,
        corpusVersion: result.manifest.corpusVersion,
        corpusHash: result.manifest.corpusHash,
        embeddedTexts: result.embeddedTexts,
        reusedTexts: result.reusedTexts,
        estimatedTokens: result.estimatedTokens,
      }),
    );
  } finally {
    store.close();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Neuspešna izgradnja RAG indeksa.",
  );
  process.exitCode = 1;
});
