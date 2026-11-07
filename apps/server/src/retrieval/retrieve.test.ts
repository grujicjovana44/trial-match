import { describe, expect, it } from "vitest";
import fixtureData from "../../../../data/fixtures/trials.json" with { type: "json" };
import { TrialSchema } from "../../../../packages/shared/src/index.js";
import { retrieveTrials } from "./retrieve.js";

describe("offline pronalaženje", () => {
  it("vraća samo izvore koji su stavljeni u kontekst tekućeg izvršavanja", () => {
    const trials = TrialSchema.array().parse(fixtureData);
    const result = retrieveTrials(
      { stated_diagnoses: ["dijabetes tip 2"] },
      trials,
      { maxCandidates: 10, maxSnippets: 5, maxContextChars: 12000 },
    );
    expect(result.trials).toHaveLength(3);
    expect(result.sourceIds).toHaveLength(5);
    expect(result.contextText).toContain(result.sourceIds[0]);
  });

  it("rerangira studije po broju kriterijuma koje profil može trenutno da proveri", () => {
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
    expect(result.trials[0]?.trialId).toBe("T-A");
  });
});
