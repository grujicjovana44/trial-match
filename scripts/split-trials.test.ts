import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { prepareRaw } from "./prepare-trials.js";
import { parseSplitArgs, splitTrials } from "./split-trials.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "trialmatch-split-"));
  tempDirs.push(directory);
  return directory;
}

function study(nctId: string, eligibilityCriteria: string) {
  return {
    protocolSection: {
      identificationModule: { nctId, briefTitle: `Synthetic title ${nctId}` },
      statusModule: { overallStatus: "RECRUITING" },
      conditionsModule: { conditions: ["Type 2 diabetes"] },
      designModule: { phases: ["PHASE2"] },
      eligibilityModule: {
        eligibilityCriteria,
        minimumAge: "18 Years",
        maximumAge: "N/A",
        sex: "ALL",
      },
      contactsLocationsModule: {
        locations: [
          { facility: "Site A", city: "Boston", country: "United States" },
        ],
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

describe("data:split", () => {
  it("čuva original i izdvaja numerisane/označene višelinijske stavke kao ručni nacrt", async () => {
    const directory = await makeTempDir();
    const original =
      "Inclusion Criteria:\r\n\r\n1. Age: 18 years or older\r\n   and able to provide consent.\r\n2. BMI: 25.0-34.9 kg/m2\r\n\r\nOphthalmic Exclusion Criteria (only in surgical eye):\r\n\r\n* Current pregnancy\r\n* History of pancreatitis";
    const input = join(directory, "raw.json");
    const output = join(directory, "review.json");
    await writeFile(
      input,
      JSON.stringify({ studies: [study("NCT00000001", original)] }),
    );

    const draft = await splitTrials({ input, output, selection: "first" });
    const trial = draft.trials[0]!;

    expect(trial).toMatchObject({
      trialId: "NCT00000001",
      title: "Synthetic title NCT00000001",
      overallStatus: "RECRUITING",
      phase: "PHASE2",
      phases: ["PHASE2"],
      locations: ["Site A, Boston, United States"],
      eligibilityText: original,
      reviewStatus: "pending_review",
      splitStatus: "complete",
    });
    expect(trial.criteria.map((criterion) => criterion.id)).toEqual([
      "NCT00000001#inc-1",
      "NCT00000001#inc-2",
      "NCT00000001#exc-1",
      "NCT00000001#exc-2",
    ]);
    expect(trial.criteria[0]?.sourceQuote).toBe(
      "1. Age: 18 years or older\r\n   and able to provide consent.",
    );
    expect(trial.criteria[1]?.sourceQuote).toBe("2. BMI: 25.0-34.9 kg/m2");
    for (const criterion of trial.criteria) {
      expect(criterion.checkability).toBe("manual_review");
      expect(criterion.origin).toBe("raw_extracted");
      expect(criterion.sourceId).toBe("NCT00000001#unsplit-1");
      expect(trial.eligibilityText.includes(criterion.sourceQuote)).toBe(true);
      expect(criterion).not.toHaveProperty("field");
      expect(criterion).not.toHaveProperty("operator");
      expect(criterion).not.toHaveProperty("value");
    }
    expect(draft.sources[0]?.text).toBe(original);
    expect(draft.report.processedTrialIds).toEqual(["NCT00000001"]);
    expect(await readFile(input, "utf8")).toBe(
      JSON.stringify({ studies: [study("NCT00000001", original)] }),
    );
  });

  it("prihvata postojeći trialmatch-import-v2 i zadržava nedovoljno jasan tekst za ručnu podelu", async () => {
    const directory = await makeTempDir();
    const original =
      "Eligible participants must be adults.\n1. Age 18 years or older";
    const imported = prepareRaw({ studies: [study("NCT00000002", original)] });
    const input = join(directory, "import.json");
    const output = join(directory, "review.json");
    await writeFile(input, JSON.stringify(imported));

    const draft = await splitTrials({ input, output, selection: "first" });
    expect(draft.inputFormat).toBe("trialmatch-import-v2");
    expect(draft.trials[0]).toMatchObject({
      eligibilityText: original,
      reviewStatus: "pending_review",
      splitStatus: "needs_manual_split",
    });
    expect(draft.trials[0]?.criteria).toHaveLength(0);
    expect(draft.report.needsManualSplit[0]?.reason).toContain(
      "prethodi jasnom Inclusion/Exclusion naslovu",
    );
    expect(draft.trials[0]?.criteria).toEqual([]);
  });

  it("razdvaja uzastopne inline brojeve, a pojedinačni broj u zagradi čuva kao deo citata", async () => {
    const directory = await makeTempDir();
    const original =
      "Inclusion Criteria:\n(1) Age 18 to 65 years. (2) Stable treatment for 8 weeks.\n* No prescription changes in the last month. (14)";
    const input = join(directory, "raw.json");
    const output = join(directory, "review.json");
    await writeFile(
      input,
      JSON.stringify({ studies: [study("NCT00000003", original)] }),
    );

    const draft = await splitTrials({ input, output, selection: "first" });
    expect(
      draft.trials[0]?.criteria.map((criterion) => criterion.sourceQuote),
    ).toEqual([
      "(1) Age 18 to 65 years.",
      "(2) Stable treatment for 8 weeks.",
      "* No prescription changes in the last month. (14)",
    ]);
    expect(draft.trials[0]?.splitStatus).toBe("complete");
  });

  it("ne pripisuje nepoznati podnaslov inclusion odeljku", async () => {
    const directory = await makeTempDir();
    const original =
      "Inclusion Criteria:\n1. Age 18 years or older\nOther Criteria\n* A further condition";
    const input = join(directory, "raw.json");
    const output = join(directory, "review.json");
    await writeFile(
      input,
      JSON.stringify({ studies: [study("NCT00000004", original)] }),
    );

    const draft = await splitTrials({ input, output, selection: "first" });
    expect(draft.trials[0]?.criteria).toHaveLength(1);
    expect(draft.trials[0]?.splitStatus).toBe("needs_manual_split");
    expect(draft.report.needsManualSplit[0]?.reason).toContain(
      "Neprepoznat podnaslov",
    );
    expect(draft.trials[0]?.eligibilityText).toBe(original);
  });

  it("nasumični izbor je ponovljiv sa istim seed-om", async () => {
    const directory = await makeTempDir();
    const input = join(directory, "raw.json");
    await writeFile(
      input,
      JSON.stringify({
        studies: [
          study("NCT00000011", "Inclusion Criteria:\n1. First."),
          study("NCT00000012", "Inclusion Criteria:\n1. Second."),
          study("NCT00000013", "Inclusion Criteria:\n1. Third."),
          study("NCT00000014", "Inclusion Criteria:\n1. Fourth."),
        ],
      }),
    );

    const first = await splitTrials({
      input,
      output: join(directory, "random-a.json"),
      limit: 2,
      selection: "random",
      seed: "42",
    });
    const second = await splitTrials({
      input,
      output: join(directory, "random-b.json"),
      limit: 2,
      selection: "random",
      seed: "42",
    });
    expect(second.selection.selectedIds).toEqual(first.selection.selectedIds);
  });

  it("prijavljuje problematične ulazne redove i odbija duplikate", async () => {
    const directory = await makeTempDir();
    const duplicate = study("NCT00000021", "Inclusion Criteria:\n1. First.");
    const input = join(directory, "raw.json");
    await writeFile(input, JSON.stringify({ studies: [duplicate, duplicate] }));

    await expect(
      splitTrials({
        input,
        output: join(directory, "review.json"),
        selection: "first",
      }),
    ).rejects.toThrow("duplikat");
  });

  it("ne preskače tiho neispravan red i uključuje ga u izveštaj", async () => {
    const directory = await makeTempDir();
    const input = join(directory, "raw.json");
    await writeFile(
      input,
      JSON.stringify({
        studies: [
          { protocolSection: {} },
          study("NCT00000031", "Inclusion Criteria:\n1. Age 18 years or older"),
        ],
      }),
    );

    const draft = await splitTrials({
      input,
      output: join(directory, "review.json"),
      selection: "first",
    });
    expect(draft.report.totalStudyCount).toBe(2);
    expect(draft.report.availableStudyCount).toBe(1);
    expect(draft.report.problems).toHaveLength(1);
    expect(draft.report.problems[0]?.index).toBe(0);
    expect(draft.report.processedTrialIds).toEqual(["NCT00000031"]);
  });

  it("odbija postojeći izlaz bez izmene", async () => {
    const directory = await makeTempDir();
    const input = join(directory, "raw.json");
    const output = join(directory, "review.json");
    await writeFile(
      input,
      JSON.stringify({ studies: [study("NCT00000041", "")] }),
    );
    await writeFile(output, "keep this file\n");

    await expect(
      splitTrials({ input, output, selection: "first" }),
    ).rejects.toThrow("već postoji");
    expect(await readFile(output, "utf8")).toBe("keep this file\n");
  });

  it("odbija neispravan JSON pre upisa izlaza", async () => {
    const directory = await makeTempDir();
    const input = join(directory, "broken.json");
    await writeFile(input, '{"studies":[');

    await expect(
      splitTrials({
        input,
        output: join(directory, "review.json"),
        selection: "first",
      }),
    ).rejects.toThrow("Ulaz nije ispravan JSON");
  });

  it("validira CLI limit i obavezni seed", () => {
    expect(() =>
      parseSplitArgs([
        "--input",
        "in.json",
        "--output",
        "out.json",
        "--limit",
        "0",
      ]),
    ).toThrow("pozitivan");
    expect(() =>
      parseSplitArgs([
        "--input",
        "in.json",
        "--output",
        "out.json",
        "--selection",
        "random",
      ]),
    ).toThrow("--seed je obavezan");
    expect(
      parseSplitArgs(["--input", "in.json", "--output", "out.json"]).selection,
    ).toBe("first");
  });
});
