import { readFile } from "node:fs/promises";
import { ExtractionSchema } from "../../packages/shared/src/index.js";
import { MockLlmAdapter } from "../../apps/server/src/llm/mock-adapter.js";
import { calculateGoldMetrics, parseGoldSet } from "./gold-set.js";

async function main(): Promise<void> {
  const cases = parseGoldSet(await readFile("eval/gold-set.jsonl", "utf8"));
  const adapter = new MockLlmAdapter();
  const metrics = calculateGoldMetrics(
    cases,
    (input) => ExtractionSchema.parse(adapter.extract(input)).profile,
  );
  console.log(JSON.stringify(metrics, null, 2));
}

await main();
