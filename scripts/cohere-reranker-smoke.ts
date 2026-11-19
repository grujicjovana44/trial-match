import { loadRagCorpus } from "../apps/server/src/retrieval/corpus.js";
import { buildRagDocuments } from "../apps/server/src/retrieval/documents.js";
import { CohereCandidateReranker } from "../apps/server/src/retrieval/cohere-reranker.js";

async function main(): Promise<void> {
  const apiKey = process.env.COHERE_API_KEY;
  if (!apiKey) {
    console.log("COHERE_API_KEY nije postavljen; smoke test nije pokrenut.");
    return;
  }
  const corpus = await loadRagCorpus([
    "data/rule_sets/studies_2_approved_20261115_1539",
    "data/rule_sets/studies_18_approved_REVIEWED",
  ]);
  const documents = buildRagDocuments(corpus.trials)
    .filter((document) => /diabetes/iu.test(document.text))
    .slice(0, 5);
  if (documents.length === 0) throw new Error("Lokalni korpus nema kandidate za smoke test.");
  const query = "type 2 diabetes recruiting clinical trial";
  const reranker = new CohereCandidateReranker(apiKey);
  const before = documents.map(({ id }) => id);
  const started = performance.now();
  const ranking = await reranker.rerank(query, documents);
  const durationMs = Math.round(performance.now() - started);
  console.log(JSON.stringify({
    appliedReranker: reranker.id,
    before,
    after: ranking.map(({ id, score }) => ({ id, score })),
    durationMs,
    candidateCount: documents.length,
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Cohere smoke test nije uspeo.");
  process.exitCode = 1;
});
