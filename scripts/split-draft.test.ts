import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseSplitDraftArgs, splitAndCreateRuleDraft } from "./split-draft.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "trialmatch-split-draft-"));
  tempDirs.push(directory);
  return directory;
}

function study(nctId: string) {
  return {
    protocolSection: {
      identificationModule: { nctId, briefTitle: `Synthetic ${nctId}` },
      eligibilityModule: {
        eligibilityCriteria: "Inclusion Criteria:\n* Be able to attend visits.",
      },
    },
  };
}

afterEach(async () => {
  await Promise.all(
    tempDirs
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("data:split-draft", () => {
  it("creates both outputs and passes selection options through data:split", async () => {
    const directory = await makeTempDir();
    const input = join(directory, "raw.json");
    const splitOutput = join(directory, "split.json");
    const output = join(directory, "rules-draft.json");
    await writeFile(input, JSON.stringify({ studies: [study("NCT00000051")] }));

    const options = parseSplitDraftArgs([
      "--input",
      input,
      "--split-output",
      splitOutput,
      "--output",
      output,
      "--limit",
      "1",
    ]);
    const result = await splitAndCreateRuleDraft(options);

    expect(result.split.selection).toMatchObject({
      method: "first",
      limit: 1,
      selectedIds: ["NCT00000051"],
    });
    expect(result.ruleDraft.drafts.map((draft) => draft.trialId)).toEqual([
      "NCT00000051",
    ]);
    expect(JSON.parse(await readFile(splitOutput, "utf8"))).toMatchObject({
      format: "trialmatch-review-draft-v1",
    });
    const savedDraft = await readFile(output, "utf8");
    const parsedDraft = JSON.parse(savedDraft) as Array<{
      trialId: string;
      criteria: Array<Record<string, unknown>>;
    }>;
    expect(parsedDraft).toEqual(result.ruleDraft.drafts);
    expect(parsedDraft[0]?.criteria[0]).toMatchObject({
      field: "",
      operator: "",
      value: null,
      unit: "",
    });
    expect(savedDraft).not.toContain("//");
  });

  it("preserves seeded random selection in the combined command", async () => {
    const directory = await makeTempDir();
    const input = join(directory, "raw.json");
    await writeFile(
      input,
      JSON.stringify({
        studies: [
          study("NCT00000053"),
          study("NCT00000054"),
          study("NCT00000055"),
          study("NCT00000056"),
        ],
      }),
    );
    const options = parseSplitDraftArgs([
      "--input",
      input,
      "--split-output",
      join(directory, "split-a.json"),
      "--output",
      join(directory, "rules-a.json"),
      "--limit",
      "2",
      "--selection",
      "random",
      "--seed",
      "42",
    ]);
    const first = await splitAndCreateRuleDraft(options);
    const second = await splitAndCreateRuleDraft({
      ...options,
      splitOutput: join(directory, "split-b.json"),
      output: join(directory, "rules-b.json"),
    });

    expect(second.split.selection.selectedIds).toEqual(
      first.split.selection.selectedIds,
    );
  });

  it("validates arguments, distinct outputs, and both no-overwrite protections", async () => {
    expect(() => parseSplitDraftArgs([])).toThrow("Upotreba:");
    expect(() =>
      parseSplitDraftArgs([
        "--input",
        "in.json",
        "--split-output",
        "same.json",
        "--output",
        "same.json",
      ]),
    ).toThrow("različite izlazne putanje");
    expect(() =>
      parseSplitDraftArgs([
        "--input",
        "in.json",
        "--split-output",
        "split.json",
        "--output",
        "draft.json",
        "--selection",
        "random",
      ]),
    ).toThrow("--seed je obavezan");

    const directory = await makeTempDir();
    const input = join(directory, "raw.json");
    const splitOutput = join(directory, "split.json");
    const output = join(directory, "rules-draft.json");
    await writeFile(input, JSON.stringify({ studies: [study("NCT00000052")] }));
    await writeFile(output, "keep this file\n");

    await expect(
      splitAndCreateRuleDraft({
        input,
        splitOutput,
        output,
        selection: "first",
      }),
    ).rejects.toThrow("već postoji");
    expect(await readFile(splitOutput).catch(() => undefined)).toBeUndefined();
    expect(await readFile(output, "utf8")).toBe("keep this file\n");
  });
});
