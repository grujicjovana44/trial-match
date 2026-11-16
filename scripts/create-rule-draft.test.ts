import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createRuleDraft, parseRuleDraftArgs } from "./create-rule-draft.js";
import { prepareRaw } from "./prepare-trials.js";
import { writeReviewTemplate } from "./rule-review-template.js";
import { ReviewDraftSchema, splitTrials } from "./split-trials.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "trialmatch-rules-draft-"));
  tempDirs.push(directory);
  return directory;
}

function study(nctId: string, eligibilityCriteria: string, minimumAge = "N/A") {
  return {
    protocolSection: {
      identificationModule: { nctId, briefTitle: `Synthetic ${nctId}` },
      eligibilityModule: {
        eligibilityCriteria,
        minimumAge,
        maximumAge: "N/A",
        sex: "ALL",
      },
    },
  };
}

async function writeJson(path: string, data: unknown): Promise<string> {
  const serialized = `${JSON.stringify(data, null, 2)}\n`;
  await writeFile(path, serialized);
  return serialized;
}

afterEach(async () => {
  await Promise.all(
    tempDirs
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("rules:draft", () => {
  it("prenosi postojeće trialmatch-import-v2 kriterijume i prijavljuje prazne studije", async () => {
    const directory = await makeTempDir();
    const input = join(directory, "import.json");
    const output = join(directory, "nested", "rules-draft.json");
    const imported = prepareRaw({
      studies: [
        study("NCT00000001", "No structured criteria."),
        study("NCT00000002", "Structured minimum age.", "18 Years"),
      ],
    });
    const originalInput = await writeJson(input, imported);

    const result = await createRuleDraft(input, output);
    const saved = await readFile(output, "utf8");

    expect(result.omittedTrialIds).toEqual(["NCT00000001"]);
    expect(result.drafts.map((draft) => draft.trialId)).toEqual([
      "NCT00000002",
    ]);
    expect(result.drafts[0]?.criteria).toEqual(imported.trials[1]?.criteria);
    expect(JSON.parse(saved)).toEqual(result.drafts);
    expect(saved.endsWith("\n")).toBe(true);
    expect(saved).toContain('\n  {\n    "trialId"');
    expect(saved).toContain('"field": "age"');
    expect(saved).not.toContain("//");
    expect(await readFile(input, "utf8")).toBe(originalInput);
  });

  it("dodaje polja za ručno popunjavanje i prihvata ih u review-template nakon strukturiranja", async () => {
    const directory = await makeTempDir();
    const input = join(directory, "import.json");
    const splitPath = join(directory, "split.json");
    const output = join(directory, "rules-draft.json");
    const reviews = join(directory, "reviews.json");
    const imported = prepareRaw({
      studies: [
        study(
          "NCT00000003",
          "Inclusion Criteria:\n* Be willing to attend visits.\n* Provide consent.",
        ),
        study(
          "NCT00000009",
          "Inclusion Criteria:\n1. Synthetic second criterion.",
        ),
      ],
    });
    await writeJson(input, imported);
    const split = await splitTrials({
      input,
      output: splitPath,
      selection: "first",
    });

    const result = await createRuleDraft(splitPath, output);
    const draft = result.drafts[0];
    expect(draft?.criteria[0]).toMatchObject({
      ...(split.trials[0]?.criteria[0] ?? {}),
      field: "",
      operator: "",
      value: null,
      unit: "",
    });
    expect(
      (draft?.criteria[0] as { origin?: string } | undefined)?.origin,
    ).toBe("raw_extracted");
    const savedDraft = await readFile(output, "utf8");
    expect(savedDraft).not.toContain("//");
    expect(JSON.parse(savedDraft)).toEqual(result.drafts);
    await expect(writeReviewTemplate(input, output, reviews)).rejects.toThrow();

    const editableDraft = JSON.parse(savedDraft) as Array<{
      trialId: string;
      criteria: Array<Record<string, unknown>>;
    }>;
    for (const record of editableDraft)
      for (const criterion of record.criteria) {
        criterion.field = "age";
        criterion.operator = "gte";
        criterion.value = 18;
        criterion.unit = "years";
      }
    await writeJson(output, editableDraft);

    await writeReviewTemplate(input, output, reviews);
    const reviewText = await readFile(reviews, "utf8");
    const reviewTemplate = JSON.parse(reviewText) as Array<{
      trialId: string;
      status: string;
      reviewer: string;
      reviewedAt: string;
    }>;
    expect(reviewTemplate).toMatchObject([
      {
        trialId: "NCT00000003",
        status: "pending_review",
        reviewer: "",
        reviewedAt: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        ),
      },
      {
        trialId: "NCT00000009",
        status: "pending_review",
        reviewer: "",
        reviewedAt: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        ),
      },
    ]);
    expect(new Set(reviewTemplate.map((entry) => entry.reviewedAt)).size).toBe(
      1,
    );
    expect(reviewText).not.toContain("//");
  });

  it("odbija prazan skup kriterijuma i navodi izostavljene ID-jeve", async () => {
    const directory = await makeTempDir();
    const input = join(directory, "empty-import.json");
    const output = join(directory, "rules-draft.json");
    await writeJson(
      input,
      prepareRaw({
        studies: [study("NCT00000004", "No criteria in source.")],
      }),
    );

    await expect(createRuleDraft(input, output)).rejects.toThrow(
      "Nijedna studija nema kriterijume; rules:draft nije napravio izlaz. Izostavljeno 1: NCT00000004.",
    );
  });

  it("odbija citat koji nije doslovni podniz izvora", async () => {
    const directory = await makeTempDir();
    const input = join(directory, "import.json");
    const splitPath = join(directory, "split.json");
    const invalidSplitPath = join(directory, "invalid-split.json");
    const output = join(directory, "rules-draft.json");
    await writeJson(
      input,
      prepareRaw({
        studies: [
          study("NCT00000005", "Inclusion Criteria:\n* Synthetic criterion."),
        ],
      }),
    );
    await splitTrials({
      input,
      output: splitPath,
      selection: "first",
    });
    const split = ReviewDraftSchema.parse(
      JSON.parse(await readFile(splitPath, "utf8")),
    );
    const invalidSplit = structuredClone(split);
    invalidSplit.trials[0]!.criteria[0]!.sourceQuote =
      "Not present in the source.";
    await writeJson(invalidSplitPath, invalidSplit);

    await expect(createRuleDraft(invalidSplitPath, output)).rejects.toThrow(
      "nije doslovni podniz izvora",
    );
  });

  it("odbija duplirane studije i kriterijum vezan za drugi trialId", async () => {
    const directory = await makeTempDir();
    const input = join(directory, "import.json");
    const output = join(directory, "rules-draft.json");
    const imported = prepareRaw({
      studies: [
        study("NCT00000006", "First.", "18 Years"),
        study("NCT00000007", "Second.", "21 Years"),
      ],
    });

    const duplicate = structuredClone(imported);
    duplicate.trials.push(structuredClone(duplicate.trials[0]!));
    await writeJson(input, duplicate);
    await expect(createRuleDraft(input, output)).rejects.toThrow(
      "duplikat trialId",
    );

    const wrongOwner = structuredClone(imported);
    wrongOwner.trials[0]!.criteria[0]!.trialId = "NCT00000007";
    await writeJson(input, wrongOwner);
    await expect(createRuleDraft(input, output)).rejects.toThrow(
      "nema isti trialId kao studija NCT00000006",
    );

    const wrongSource = structuredClone(imported);
    wrongSource.trials[0]!.criteria[0]!.sourceId =
      wrongSource.trials[1]!.criteria[0]!.sourceId;
    wrongSource.trials[0]!.criteria[0]!.sourceQuote =
      wrongSource.trials[1]!.criteria[0]!.sourceQuote;
    await writeJson(input, wrongSource);
    await expect(createRuleDraft(input, output)).rejects.toThrow(
      "ne pripada studiji NCT00000006",
    );
  });

  it("odbija prepisivanje izlaza i čuva postojeći sadržaj", async () => {
    const directory = await makeTempDir();
    const input = join(directory, "import.json");
    const output = join(directory, "rules-draft.json");
    await writeJson(
      input,
      prepareRaw({
        studies: [study("NCT00000008", "Synthetic criterion.", "18 Years")],
      }),
    );
    await writeFile(output, "keep this file\n");

    await expect(createRuleDraft(input, output)).rejects.toThrow(
      "Izlazna putanja već postoji; ne prepisujem fajl.",
    );
    expect(await readFile(output, "utf8")).toBe("keep this file\n");
  });

  it("daje jasnu upotrebu za nedostajuće, nepoznate i duplirane argumente", () => {
    const usage = "Upotreba: pnpm rules:draft";
    expect(() => parseRuleDraftArgs([])).toThrow(usage);
    expect(() =>
      parseRuleDraftArgs([
        "--input",
        "in.json",
        "--input",
        "again.json",
        "--output",
        "out.json",
      ]),
    ).toThrow(usage);
    expect(() =>
      parseRuleDraftArgs([
        "--input",
        "in.json",
        "--output",
        "out.json",
        "--extra",
        "value",
      ]),
    ).toThrow(usage);
  });

  it("odbija nepoznat format ulaza", async () => {
    const directory = await makeTempDir();
    const input = join(directory, "unknown.json");
    const output = join(directory, "rules-draft.json");
    await writeJson(input, { format: "trialmatch-future-v9", trials: [] });

    await expect(createRuleDraft(input, output)).rejects.toThrow(
      "Nepodržan ulazni format: trialmatch-future-v9.",
    );
  });
});
