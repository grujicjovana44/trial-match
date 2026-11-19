import { stat } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { buildRagDocuments } from "../apps/server/src/retrieval/documents.js";
import { createOpenAIEmbeddingClient } from "../apps/server/src/retrieval/embeddings.js";
import {
  buildVectorIndex,
  estimatePendingEmbeddings,
} from "../apps/server/src/retrieval/indexing.js";
import {
  DEFAULT_EMBEDDING_MODEL,
  INDEX_TOKEN_ESTIMATE_CALIBRATION_FACTOR,
  INDEX_TOKEN_CONFIRMATION_THRESHOLD,
  MAX_CHUNKS_PER_INDEX_BUILD,
} from "../apps/server/src/retrieval/config.js";
import { loadRagCorpus } from "../apps/server/src/retrieval/corpus.js";
import {
  InMemoryVectorStore,
  openSQLiteVectorStore,
} from "../apps/server/src/retrieval/vector-store.js";

type BuildOptions = {
  corpusRoots: string[];
  indexPath: string;
  indexPathExplicit: boolean;
  estimateOnly: boolean;
  confirmLarge: boolean;
};

export const CLINICALTRIALS_20_CORPUS_ROOTS = [
  "data/rule_sets/studies_2_approved_20261115_1539",
  "data/rule_sets/studies_18_approved_REVIEWED",
] as const;

const DEFAULT_CORPUS_ROOTS = ["data/trials", "data/fixtures"] as const;

export function parseBuildOptions(
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): BuildOptions {
  const corpusRoots: string[] = [];
  let indexPath = "data/index/rag.sqlite";
  let indexPathExplicit = false;
  let estimateOnly = false;
  let confirmLarge = false;

  for (let index = 0; index < args.length; index += 1) {
    const [flag, inlineValue] = args[index]!.split("=", 2);
    if (flag === "--") {
      continue;
    } else if (flag === "--corpus-root") {
      const value = inlineValue ?? args[++index];
      if (!value?.trim())
        throw new Error("--corpus-root zahteva putanju direktorijuma.");
      corpusRoots.push(value);
    } else if (flag === "--index-path") {
      const value = inlineValue ?? args[++index];
      if (!value?.trim())
        throw new Error("--index-path zahteva putanju SQLite indeksa.");
      indexPath = value;
      indexPathExplicit = true;
    } else if (flag === "--estimate-only") {
      estimateOnly = true;
    } else if (flag === "--confirm-large") {
      confirmLarge = true;
    } else {
      throw new Error(`Nepoznata opcija index:build: ${flag}`);
    }
  }

  if (corpusRoots.length > 0 && !indexPathExplicit)
    throw new Error(
      "Izbor korpusa zahteva eksplicitnu --index-path putanju indeksa.",
    );

  const defaultCorpusRoots =
    env.DATASET_PROFILE === "clinicaltrials-20"
      ? [...CLINICALTRIALS_20_CORPUS_ROOTS]
      : [...DEFAULT_CORPUS_ROOTS];

  return {
    corpusRoots:
      corpusRoots.length > 0
        ? corpusRoots
        : defaultCorpusRoots,
    indexPath:
      indexPathExplicit || !env.RAG_INDEX_PATH?.trim()
        ? indexPath
        : env.RAG_INDEX_PATH.trim(),
    indexPathExplicit,
    estimateOnly,
    confirmLarge,
  };
}

async function main(): Promise<void> {
  const options = parseBuildOptions(process.argv.slice(2));
  const corpus = await loadRagCorpus(options.corpusRoots);
  const documents = buildRagDocuments(corpus.trials);
  const databasePath = resolve(options.indexPath);
  if (options.estimateOnly) {
    const estimate = estimatePendingEmbeddings(
      corpus,
      new InMemoryVectorStore(),
      DEFAULT_EMBEDDING_MODEL,
    );
    console.log(
      JSON.stringify(
        {
          mode: "estimate-only",
          indexBuildExecuted: false,
          corpusRoots: options.corpusRoots,
          corpusVersion: corpus.version,
          corpusHash: corpus.sha256,
          sources: corpus.sources,
          studies: corpus.trials.length,
          documents: documents.length,
          chunks: documents.length,
          uniqueTexts: estimate.uniqueTexts,
          rawEstimatedTokens: estimate.rawTokens,
          estimatedTokens: estimate.tokens,
          calibrationFactor: INDEX_TOKEN_ESTIMATE_CALIBRATION_FACTOR,
          estimatedCostUsd: null,
          costFormula:
            "estimatedTokens × verifiedPriceUsdPerMillion / 1,000,000",
          costReason:
            "Nema verifikovanog cenovnika i datuma cene u repozitorijumu.",
          model: DEFAULT_EMBEDDING_MODEL,
          indexPath: databasePath,
          skippedSources: corpus.skipped,
        },
        null,
        2,
      ),
    );
    return;
  }
  if (options.indexPathExplicit) {
    let indexPathExists = false;
    try {
      await stat(databasePath);
      indexPathExists = true;
    } catch (error) {
      if (
        typeof error !== "object" ||
        error === null ||
        !("code" in error) ||
        error.code !== "ENOENT"
      )
        throw error;
    }
    if (indexPathExists)
      throw new Error(
        `Eksplicitna putanja indeksa već postoji; odbijam prepisivanje: ${databasePath}`,
      );
  }
  const client = createOpenAIEmbeddingClient();
  const store = await openSQLiteVectorStore(databasePath);
  try {
    const estimate = estimatePendingEmbeddings(corpus, store, client.model);
    console.log(
      `Korpus: ${corpus.trials.length} studija, ${documents.length} teksta; ` +
        `${estimate.uniqueTexts} novih jedinstvenih tekstova; ` +
        `sirova procena ${estimate.rawTokens}, kalibrisana procena ${estimate.tokens} tokena.`,
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
      if (options.confirmLarge) {
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
        corpusRoots: options.corpusRoots,
        model: result.manifest.embeddingModel,
        dimensions: result.manifest.dimensions,
        corpusVersion: result.manifest.corpusVersion,
        corpusHash: result.manifest.corpusHash,
        embeddedTexts: result.embeddedTexts,
        reusedTexts: result.reusedTexts,
        rawEstimatedTokens: result.rawEstimatedTokens,
        estimatedTokens: result.estimatedTokens,
        calibrationFactor: INDEX_TOKEN_ESTIMATE_CALIBRATION_FACTOR,
        embeddingCalls: result.embeddingCalls,
        tokensUsed: result.tokensUsed,
      }),
    );
  } finally {
    store.close();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main().catch((error: unknown) => {
    console.error(
      error instanceof Error
        ? error.message
        : "Neuspešna izgradnja RAG indeksa.",
    );
    process.exitCode = 1;
  });
}
