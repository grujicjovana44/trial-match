import { ProfileSchema } from "../packages/shared/src/index.js";
import { createOpenAIEmbeddingClient } from "../apps/server/src/retrieval/embeddings.js";
import { buildRetrievalQuery } from "../apps/server/src/retrieval/query.js";

async function main(): Promise<void> {
  const client = createOpenAIEmbeddingClient(process.env, { maxRetries: 0 });
  const profile = ProfileSchema.parse({
    stated_diagnoses: ["type 2 diabetes"],
  });
  const query = buildRetrievalQuery(profile);
  const result = await client.embed([query]);
  console.log(
    JSON.stringify({
      model: client.model,
      dimensions: result.dimensions,
      tokens: result.tokens,
    }),
  );
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : "Neuspešna provera OpenAI embeddings.",
  );
  process.exitCode = 1;
});
