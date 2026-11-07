import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { TrialSchema } from "../packages/shared/src/index.js";

export function validateTrials(raw: unknown) {
  const trials = TrialSchema.array().parse(raw);
  const trialIds = new Set(trials.map((trial) => trial.trialId));
  if (trialIds.size !== trials.length)
    throw new Error("Ulaz sadrži ponovljene identifikatore studija.");

  for (const trial of trials) {
    if (
      trial.criteria.some((criterion) => criterion.trialId !== trial.trialId)
    ) {
      throw new Error(
        `Kriterijum studije ${trial.trialId} ima neusaglašen trialId.`,
      );
    }
  }

  return trials;
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  const inputPath = resolve(process.argv[2] ?? "data/raw/trials.json");
  const outputPath = resolve(process.argv[3] ?? "data/trials/trials.json");
  const raw: unknown = JSON.parse(await readFile(inputPath, "utf8"));
  const trials = validateTrials(raw);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(trials, null, 2)}\n`, "utf8");
  console.log(
    `Validirano ${trials.length} zapisa; lokalna izlazna datoteka: ${outputPath}`,
  );
}
