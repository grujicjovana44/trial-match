import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import fixtureData from "../../../../data/fixtures/trials.json" with { type: "json" };
import sourceProvenance from "../../../../data/raw/studies_20_api_provenance_2026-11-16.json" with { type: "json" };
import {
  DatasetManifestSchema,
  TrialSchema,
  type Trial,
} from "../../../../packages/shared/src/index.js";
import { hashRagSourceContent, loadRagCorpus } from "./corpus.js";
import { buildRagDocuments } from "./documents.js";
import { retrieveTrials } from "./retrieve.js";

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
  vi.restoreAllMocks();
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("RAG corpus loader", () => {
  it("uses the same source hash for LF and Windows CRLF checkouts", () => {
    const lf = Buffer.from('{"synthetic":true}\n', "utf8");
    const crlf = Buffer.from('{"synthetic":true}\r\n', "utf8");
    expect(hashRagSourceContent(crlf)).toBe(hashRagSourceContent(lf));
  });

  it("spaja izabrane korene i preskače nepotvrđenu licencu", async () => {
    const root = await createRoot();
    const importedTrial = trial("T-D", "Imported title", "new-v1");
    const older = trial("T-E", "Other imported title", "old-v1");
    const unconfirmed = trial("T-F", "Unconfirmed title", "draft-v1");
    const imported = {
      format: "trialmatch-import-v2",
      sourceHash: "source-new",
      manifest: manifest("new-v1", "2026-11-15"),
      trials: [importedTrial],
    };
    const oldImport = {
      format: "trialmatch-import-v2",
      sourceHash: "source-old",
      manifest: manifest("old-v1", "2026-11-14"),
      trials: [older],
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
      JSON.stringify(oldImport),
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
      "T-D",
      "T-E",
    ]);
    expect(corpus.trials.find((item) => item.trialId === "T-D")?.title).toBe(
      "Imported title",
    );
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

  it("odbija isti trial ID sa različitim sadržajem i navodi oba izvora", async () => {
    const root = await createRoot();
    const importPath = "data/trials/conflicting.json";
    await writeFile(
      join(root, "data", "fixtures", "trials.json"),
      JSON.stringify(fixtureData),
    );
    await writeFile(
      join(root, importPath),
      JSON.stringify({
        format: "trialmatch-import-v2",
        sourceHash: "conflicting-source",
        manifest: manifest("newer-v1", "2026-11-16"),
        trials: [trial("T-A", "Conflicting title", "newer-v1")],
      }),
    );
    const sourceTrials = TrialSchema.array().parse(
      JSON.parse(
        await readFile(join(root, "data", "fixtures", "trials.json"), "utf8"),
      ),
    );
    const imported = JSON.parse(
      await readFile(join(root, importPath), "utf8"),
    ) as { trials: unknown };
    const conflictingTrials = TrialSchema.array().parse(imported.trials);

    expect(sourceTrials.map((item) => item.trialId)).toContain("T-A");
    expect(conflictingTrials.map((item) => item.trialId)).toEqual(["T-A"]);

    await expect(
      loadRagCorpus(["data/trials", "data/fixtures"], root),
    ).rejects.toThrow(
      /T-A.*različit sadržaj(?=.*data\/fixtures\/trials\.json)(?=.*data\/trials\/conflicting\.json)/s,
    );
  });

  it("dopušta identičan duplikat jednom i beleži oba izvora", async () => {
    const root = await createRoot();
    const fixtureTrials = TrialSchema.array().parse(fixtureData);
    await writeFile(
      join(root, "data", "fixtures", "trials.json"),
      JSON.stringify(fixtureTrials),
    );
    await writeFile(
      join(root, "data", "trials", "identical.json"),
      JSON.stringify({
        format: "trialmatch-import-v2",
        sourceHash: "identical-source",
        manifest: manifest("same-v1", "2026-11-16"),
        trials: [fixtureTrials[0]],
      }),
    );
    const log = vi.spyOn(console, "info").mockImplementation(() => {});

    const corpus = await loadRagCorpus(["data/fixtures", "data/trials"], root);

    expect(corpus.trials.filter((item) => item.trialId === "T-A")).toHaveLength(
      1,
    );
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining(
        "data/fixtures/trials.json i data/trials/identical.json",
      ),
    );
  });

  it("učitava samo eksplicitno izabrane korene korpusa", async () => {
    const root = await createRoot();
    const approvedRoot = join(root, "data", "rule_sets", "approved");
    await mkdir(approvedRoot, { recursive: true });
    await mkdir(join(root, "data", "trials"), { recursive: true });
    await writeFile(
      join(root, "data", "fixtures", "trials.json"),
      JSON.stringify(fixtureData),
    );
    await writeFile(
      join(approvedRoot, "trials.json"),
      JSON.stringify([trial("NCT00000001", "Approved title", "approved-v1")]),
    );
    await writeFile(
      join(root, "data", "trials", "raw.json"),
      JSON.stringify({
        format: "trialmatch-import-v2",
        sourceHash: "raw-source",
        manifest: manifest("raw-v1", "2026-11-16"),
        trials: [trial("NCT00000002", "Raw title", "raw-v1")],
      }),
    );

    const corpus = await loadRagCorpus(
      ["data/fixtures", "data/rule_sets/approved"],
      root,
    );

    expect(corpus.trials.map((item) => item.trialId)).toEqual([
      "NCT00000001",
      "T-A",
      "T-B",
      "T-C",
    ]);
    expect(corpus.sources.map((source) => source.path)).toEqual([
      "data/fixtures/trials.json",
      "data/rule_sets/approved/trials.json",
    ]);
  });

  it("učitava tačno 20 studija i 10 odobrenih auto pravila iz hash-pinned paketa", async () => {
    const corpus = await loadRagCorpus([
      "data/rule_sets/studies_2_approved_20261115_1539",
      "data/rule_sets/studies_18_approved_20261118",
    ]);
    const trialIds = corpus.trials.map((item) => item.trialId);
    const documents = buildRagDocuments(corpus.trials);

    expect(trialIds).toEqual(
      sourceProvenance.records
        .map((record) => record.nctId)
        .sort((left, right) => left.localeCompare(right, "en")),
    );
    expect(new Set(trialIds)).toHaveLength(20);
    expect(
      documents.filter((document) => document.kind === "study"),
    ).toHaveLength(20);
    expect(
      documents.filter((document) => document.kind === "passage"),
    ).toHaveLength(
      corpus.trials.reduce((count, item) => count + item.criteria.length, 0),
    );
    expect(
      documents.filter((document) => document.kind === "passage").length,
    ).toBeGreaterThanOrEqual(300);
    const newStudies = corpus.trials.filter(
      (item) =>
        item.trialId.startsWith("NCT") &&
        !["NCT07409714", "NCT07924436"].includes(item.trialId),
    );
    expect(
      newStudies.reduce(
        (count, item) =>
          count +
          item.criteria.filter((criterion) => criterion.checkability === "auto")
            .length,
        0,
      ),
    ).toBe(10);
    expect(
      newStudies.reduce(
        (count, item) =>
          count +
          item.criteria.filter(
            (criterion) => criterion.checkability === "manual_review",
          ).length,
        0,
      ),
    ).toBe(290);
    const unavailable: string[] = [];
    for (const item of corpus.trials) {
      const retrieval = retrieveTrials(
        {
          stated_diagnoses: [
            item.trialId === "NCT06251323" ? "iPATH" : item.title,
          ],
        },
        corpus.trials,
        { maxCandidates: 10, maxSnippets: 5, maxContextChars: 12000 },
      );
      if (
        !retrieval.trials.some(
          (candidate) => candidate.trialId === item.trialId,
        )
      )
        unavailable.push(item.trialId);
    }
    expect(unavailable).toEqual([]);
  });
});
