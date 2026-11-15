import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import fixtureData from "../../../../data/fixtures/trials.json" with { type: "json" };
import {
  DatasetManifestSchema,
  TrialSchema,
  type Trial,
} from "../../../../packages/shared/src/index.js";
import { loadRagCorpus } from "./corpus.js";

const temporaryDirectories: string[] = [];

async function createRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "trialmatch-rag-corpus-"));
  temporaryDirectories.push(root);
  await mkdir(join(root, "data", "trials"), { recursive: true });
  await mkdir(join(root, "data", "fixtures"), { recursive: true });
  return root;
}

function manifest(
  version: string,
  date: string,
  license = "Synthetic fixture",
) {
  return DatasetManifestSchema.parse({
    name: "Synthetic test corpus",
    version,
    date,
    origin: "Test-only synthetic data",
    synthetic: true,
    license,
    transformations: "None",
    limitations: [],
    includedCount: 1,
  });
}

function trial(trialId: string, title: string, dataVersion: string): Trial {
  const template = TrialSchema.parse(fixtureData[0]);
  return {
    ...template,
    trialId,
    title,
    dataVersion,
    criteria: template.criteria.map((criterion) => ({
      ...criterion,
      id: criterion.id.replace(template.trialId, trialId),
      trialId,
      sourceId: criterion.sourceId.replace(template.trialId, trialId),
    })),
  };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("RAG corpus loader", () => {
  it("spaja data/trials i fixtures, bira najnoviju verziju i preskače nepotvrđenu licencu", async () => {
    const root = await createRoot();
    const old = trial("T-A", "Old title", "old-v1");
    const newest = trial("T-A", "Newest title", "new-v1");
    const unconfirmed = trial("T-B", "Unconfirmed title", "draft-v1");
    const imported = {
      format: "trialmatch-import-v2",
      sourceHash: "source-new",
      manifest: manifest("new-v1", "2026-11-15"),
      trials: [newest],
    };
    const older = {
      format: "trialmatch-import-v2",
      sourceHash: "source-old",
      manifest: manifest("old-v1", "2026-11-14"),
      trials: [old],
    };
    const draft = {
      format: "trialmatch-import-v2",
      sourceHash: "source-draft",
      manifest: manifest(
        "draft-v1",
        "2026-11-15",
        "NEPOTVRĐENO — čeka pregled",
      ),
      trials: [unconfirmed],
    };
    await writeFile(
      join(root, "data", "fixtures", "trials.json"),
      JSON.stringify(fixtureData),
    );
    await writeFile(
      join(root, "data", "trials", "old.json"),
      JSON.stringify(older),
    );
    await writeFile(
      join(root, "data", "trials", "new.json"),
      JSON.stringify(imported),
    );
    await writeFile(
      join(root, "data", "trials", "draft.json"),
      JSON.stringify(draft),
    );
    await writeFile(
      join(root, "data", "trials", "notes.json"),
      JSON.stringify([{ reviewStatus: "pending_review" }]),
    );

    const corpus = await loadRagCorpus(["data/trials", "data/fixtures"], root);

    expect(corpus.trials.map((item) => item.trialId)).toEqual([
      "T-A",
      "T-B",
      "T-C",
    ]);
    expect(corpus.trials[0]?.title).toBe("Newest title");
    expect(corpus.skipped).toHaveLength(2);
    expect(corpus.skipped.some((item) => item.reason.includes("licenca"))).toBe(
      true,
    );
    expect(corpus.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(corpus.sources).toHaveLength(3);

    const diskContents = await readFile(
      join(root, "data", "trials", "new.json"),
      "utf8",
    );
    expect(JSON.parse(diskContents)).toEqual(imported);
  });

  it("odbija različite verzije istog trial ID-ja sa jednakim datumom", async () => {
    const root = await createRoot();
    for (const { file, title } of [
      { file: "first.json", title: "First" },
      { file: "second.json", title: "Second" },
    ]) {
      await writeFile(
        join(root, "data", "trials", file),
        JSON.stringify({
          format: "trialmatch-import-v2",
          sourceHash: file,
          manifest: manifest(file, "2026-11-15"),
          trials: [trial("T-A", title, file)],
        }),
      );
    }

    await expect(loadRagCorpus(["data/trials"], root)).rejects.toThrow(
      /različit sadržaj.*istim vremenom verzije/,
    );
  });
});
