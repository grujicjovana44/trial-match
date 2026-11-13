import { readFile, writeFile } from "node:fs/promises";
import { scoreCriteria } from "./gold-criteria.js";
const [annotationsPath, predictionsPath, version, outputPath] =
  process.argv.slice(2);
if (!annotationsPath || !predictionsPath || !version || !outputPath)
  throw new Error(
    "Upotreba: gold:criteria <annotations.json> <predictions.json> <datasetVersion> <new-output.json>",
  );
const annotations: unknown = JSON.parse(
  await readFile(annotationsPath, "utf8"),
);
const predictions: unknown = JSON.parse(
  await readFile(predictionsPath, "utf8"),
);
await writeFile(
  outputPath,
  JSON.stringify(scoreCriteria(annotations, predictions, version), null, 2),
  { flag: "wx" },
);
