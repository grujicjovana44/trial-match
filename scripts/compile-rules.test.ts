import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { compileRules } from "./compile-rules.js";
import { createRuleDraft } from "./create-rule-draft.js";
import { prepareRaw } from "./prepare-trials.js";
import { writeReviewTemplate } from "./rule-review-template.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "trialmatch-compile-rules-"));
  tempDirs.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    tempDirs
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe.each(["lt", "gt"] as const)(
  "compile:rules %s standard JSON workflow",
  (operator) => {
    it("retains strict schemas and existing approval/hash checks", async () => {
    const directory = await makeTempDir();
    const input = join(directory, "import.json");
    const draftPath = join(directory, "rules-draft.json");
    const reviewPath = join(directory, "reviews.json");
    const pendingOutput = join(directory, "pending-package");
    const output = join(directory, "approved-package");
    const imported = prepareRaw({
      studies: [
        {
          protocolSection: {
            identificationModule: {
              nctId: "NCT00000061",
              briefTitle: "Synthetic compile fixture",
            },
            eligibilityModule: {
              eligibilityCriteria: "Minimum age: 18 years.",
              minimumAge: "18 Years",
            },
          },
        },
      ],
    });
    await writeFile(input, `${JSON.stringify(imported, null, 2)}\n`);
    await createRuleDraft(input, draftPath);
    const drafts = JSON.parse(await readFile(draftPath, "utf8")) as Array<{
      trialId: string;
      criteria: Array<Record<string, unknown>>;
    }>;
    const trialId = drafts[0]!.trialId;
    const source = imported.sources.find(
      (item) =>
        item.trialId === trialId && item.sourceId === `${trialId}#unsplit-1`,
    )!;
    drafts[0]!.criteria = [
      {
        id: `${trialId}#inc-1`,
        trialId,
        kind: "inclusion",
        field: "age",
        operator,
        value: 18,
        unit: "years",
        checkability: "auto",
        origin: "compiled_reviewed",
        text: "Age less than 18 years.",
        sourceId: source.sourceId,
        sourceQuote: source.text,
      },
    ];
    await writeFile(draftPath, `${JSON.stringify(drafts, null, 2)}\n`);
    await writeReviewTemplate(input, draftPath, reviewPath);

    const draftText = await readFile(draftPath, "utf8");
    expect(JSON.parse(draftText)).toHaveLength(1);
    expect(draftText).not.toContain("//");
    const reviewText = await readFile(reviewPath, "utf8");
    expect(JSON.parse(reviewText)).toMatchObject([
      {
        status: "pending_review",
        reviewer: "",
        reviewedAt: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        ),
      },
    ]);
    expect(reviewText).not.toContain("//");
    await expect(
      compileRules(input, draftPath, reviewPath, pendingOutput),
    ).rejects.toThrow();

    const pendingWithReviewer = JSON.parse(reviewText) as Array<
      Record<string, unknown>
    >;
    pendingWithReviewer[0]!.reviewer = "Synthetic reviewer";
    await writeFile(
      reviewPath,
      `${JSON.stringify(pendingWithReviewer, null, 2)}\n`,
    );
    await expect(
      compileRules(input, draftPath, reviewPath, pendingOutput),
    ).rejects.toThrow("Nema odobrenih studija");

    const manuallyApproved = JSON.parse(reviewText) as Array<
      Record<string, unknown>
    >;
    manuallyApproved[0]!.status = "approved";
    manuallyApproved[0]!.reviewer = "Synthetic reviewer";
    manuallyApproved[0]!.reviewedAt = "2026-11-13T14:25:30+01:00";
    await writeFile(
      reviewPath,
      `${JSON.stringify(manuallyApproved, null, 2)}\n`,
    );

    const staleDraft = draftText.replace('"value": 18', '"value": 19');
    await writeFile(draftPath, staleDraft);
    await expect(
      compileRules(input, draftPath, reviewPath, pendingOutput),
    ).rejects.toThrow("Nema odobrenih studija");

    await writeFile(draftPath, draftText);
    await compileRules(input, draftPath, reviewPath, output);
    const compiledTrials: unknown = JSON.parse(
      await readFile(join(output, "trials.json"), "utf8"),
    );
    const report: unknown = JSON.parse(
      await readFile(join(output, "review-report.json"), "utf8"),
    );
    expect(compiledTrials).toMatchObject([
      {
        trialId: "NCT00000061",
        criteria: [{ field: "age", operator, value: 18 }],
      },
    ]);
    expect(report).toMatchObject({
      included: [
        { reviewer: "Synthetic reviewer", sourceHash: expect.any(String) },
      ],
      excluded: [],
      });
    },
  );
});
