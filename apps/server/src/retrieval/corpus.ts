import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import {
  DatasetManifestSchema,
  TrialSchema,
  type Trial,
} from "../../../../packages/shared/src/index.js";
import { z } from "zod";

const ImportEnvelopeSchema = z
  .object({
    format: z.literal("trialmatch-import-v2"),
    sourceHash: z.string().min(1),
    manifest: DatasetManifestSchema,
    trials: TrialSchema.array(),
  })
  .passthrough();

export type CorpusSource = {
  path: string;
  version: string;
  sha256: string;
};

export type RagCorpus = {
  trials: Trial[];
  sources: CorpusSource[];
  skipped: Array<{ path: string; reason: string }>;
  version: string;
  sha256: string;
};

type CandidateTrial = {
  trial: Trial;
  source: CorpusSource;
  modifiedAt: number;
  contentHash: string;
};

async function jsonFiles(directory: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    )
      return [];
    throw error;
  }
  const paths: string[] = [];
  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name, "en"),
  )) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) paths.push(...(await jsonFiles(path)));
    else if (entry.isFile() && entry.name.endsWith(".json")) paths.push(path);
  }
  return paths;
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function isUnconfirmedLicense(license: string): boolean {
  return /nepotvrđeno|unconfirmed|unverified/iu.test(license);
}

export async function loadRagCorpus(
  roots: readonly string[] = ["data/trials", "data/fixtures"],
  workingDirectory = process.cwd(),
): Promise<RagCorpus> {
  const candidateTrials = new Map<string, CandidateTrial>();
  const sources: CorpusSource[] = [];
  const skipped: RagCorpus["skipped"] = [];

  for (const root of roots) {
    const absoluteRoot = resolve(workingDirectory, root);
    for (const path of await jsonFiles(absoluteRoot)) {
      const contents = await readFile(path);
      let raw: unknown;
      try {
        raw = JSON.parse(contents.toString("utf8"));
      } catch {
        skipped.push({
          path: relative(workingDirectory, path).split(sep).join("/"),
          reason: "JSON nije validan",
        });
        continue;
      }

      let trials: Trial[] | undefined;
      let version: string | undefined;
      let modifiedAt = 0;
      if (Array.isArray(raw)) {
        const parsed = TrialSchema.array().safeParse(raw);
        if (parsed.success) {
          trials = parsed.data;
          version = [...new Set(trials.map((trial) => trial.dataVersion))]
            .sort((left, right) => left.localeCompare(right, "en"))
            .join("+");
        }
      } else {
        const envelope = ImportEnvelopeSchema.safeParse(raw);
        if (envelope.success) {
          const manifest = envelope.data.manifest;
          if (isUnconfirmedLicense(manifest.license)) {
            skipped.push({
              path: relative(workingDirectory, path).split(sep).join("/"),
              reason: "licenca u manifestu nije potvrđena",
            });
            continue;
          }
          trials = envelope.data.trials;
          version = manifest.version;
          modifiedAt = Date.parse(
            manifest.downloadDate ??
              `${manifest.date ?? "1970-01-01"}T00:00:00Z`,
          );
        } else if (
          typeof raw === "object" &&
          raw !== null &&
          "format" in raw &&
          raw.format === "trialmatch-import-v2"
        ) {
          throw new Error(
            `Import ${relative(workingDirectory, path)} nema validan manifest ili TrialSchema podatke.`,
            { cause: envelope.error },
          );
        }
      }

      if (!trials || !version) {
        skipped.push({
          path: relative(workingDirectory, path).split(sep).join("/"),
          reason: "nije podržan normalizovan skup Trial zapisa",
        });
        continue;
      }

      const source: CorpusSource = {
        path: relative(workingDirectory, path).split(sep).join("/"),
        version,
        sha256: sha256(contents),
      };
      sources.push(source);
      for (const trial of trials) {
        const contentHash = sha256(JSON.stringify(trial));
        const candidate: CandidateTrial = {
          trial,
          source,
          modifiedAt,
          contentHash,
        };
        const existing = candidateTrials.get(trial.trialId);
        if (!existing || candidate.modifiedAt > existing.modifiedAt) {
          candidateTrials.set(trial.trialId, candidate);
          continue;
        }
        if (
          candidate.modifiedAt === existing.modifiedAt &&
          candidate.contentHash !== existing.contentHash
        )
          throw new Error(
            `Studija ${trial.trialId} ima različit sadržaj u izvorima ${existing.source.path} i ${source.path} sa istim vremenom verzije.`,
          );
      }
    }
  }

  if (candidateTrials.size === 0)
    throw new Error(
      "Nema validiranih Trial zapisa u data/trials/ ili data/fixtures/.",
    );
  const orderedSources = sources.sort((left, right) =>
    left.path.localeCompare(right.path, "en"),
  );
  const corpusHash = sha256(
    orderedSources
      .map((source) => `${source.path}\t${source.version}\t${source.sha256}`)
      .join("\n"),
  );
  const versions = [...new Set(orderedSources.map((source) => source.version))]
    .sort((left, right) => left.localeCompare(right, "en"))
    .join("+");

  return {
    trials: [...candidateTrials.values()]
      .map(({ trial }) => trial)
      .sort((left, right) => left.trialId.localeCompare(right.trialId, "en")),
    sources: orderedSources,
    skipped,
    version: versions,
    sha256: corpusHash,
  };
}
