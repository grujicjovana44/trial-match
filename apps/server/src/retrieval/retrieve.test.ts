import { describe, expect, it } from "vitest";
import fixtureData from "../../../../data/fixtures/trials.json" with { type: "json" };
import studiesData from "../../../../data/rule_sets/studies_2/trials.json" with { type: "json" };
import {
  CitationSchema,
  TrialSchema,
} from "../../../../packages/shared/src/index.js";
import { verifyCitation } from "../citations/verify.js";
import { retrieveTrials } from "./retrieve.js";

describe("offline pronalaženje", () => {
  it("vraća najviše pet relevantnih izvora iz konteksta tekućeg izvršavanja", () => {
    const trials = TrialSchema.array().parse(fixtureData);
    const result = retrieveTrials(
      { stated_diagnoses: ["dijabetes tip 2"] },
      trials,
      { maxCandidates: 10, maxSnippets: 5, maxContextChars: 12000 },
    );
    expect(result.trials).toHaveLength(3);
    expect(result.sourceIds.length).toBeLessThanOrEqual(5);
    for (const sourceId of result.sourceIds)
      expect(result.contextText).toContain(sourceId);
  });

  it("rangira po upitu, a matcher dobija sva pravila izabrane studije", () => {
    const trials = TrialSchema.array().parse(fixtureData);
    const result = retrieveTrials(
      {
        age: 62,
        sex: "male",
        hba1c: { value: 8.1, unit: "%" },
        creatinine: { value: 1.3, unit: "mg/dL" },
        insulin_last_3_months: false,
        stated_diagnoses: ["dijabetes tip 2"],
      },
      trials,
      { maxCandidates: 3, maxSnippets: 5, maxContextChars: 12000 },
    );
    const trial = result.trials.find((candidate) => candidate.trialId === "T-A");
    expect(trial?.criteria).toHaveLength(4);
  });

  it("koristi poznata laboratorijska polja kada dijagnoza nije uneta", () => {
    const trials = TrialSchema.array().parse(fixtureData);
    const result = retrieveTrials(
      {
        age: 62,
        hba1c: { value: 8.1, unit: "%" },
        stated_diagnoses: [],
      },
      trials,
      { maxCandidates: 10, maxSnippets: 5, maxContextChars: 12000 },
    );
    expect(result.trials.length).toBeGreaterThan(0);
  });

  it("proverava različite citate istog izvora prema originalnom eligibility tekstu", () => {
    const trials = TrialSchema.array().parse(studiesData);
    const retrieved = retrieveTrials(
      { stated_diagnoses: ["type 2 diabetes"] },
      trials,
      { maxCandidates: 10, maxSnippets: 10, maxContextChars: 12000 },
    );
    const trial = retrieved.trials.find(
      (candidate) => candidate.trialId === "NCT07924436",
    );
    expect(trial).toBeDefined();

    const criteria = trial!.criteria.filter(
      (criterion) =>
        criterion.sourceId === `${trial!.trialId}#unsplit-1`,
    );
    expect(criteria.length).toBeGreaterThan(1);
    expect(retrieved.sourceTexts.get(criteria[0]!.sourceId)).toBe(
      trial!.eligibilityText,
    );
    for (const criterion of criteria.slice(0, 2)) {
      expect(
        verifyCitation(
          CitationSchema.parse({
            sourceId: criterion.sourceId,
            quote: criterion.sourceQuote,
          }),
          retrieved.sourceTexts,
        ),
      ).toBe(true);
    }
  });
});
