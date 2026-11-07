import { describe, expect, it } from "vitest";
import fixtureData from "../../../../data/fixtures/trials.json" with { type: "json" };
import { TrialSchema } from "../../../../packages/shared/src/index.js";
import { evaluateCriteria } from "../matcher/evaluate-criteria.js";
import { selectNextQuestion } from "./select-next-question.js";

const trials = TrialSchema.array().parse(fixtureData);

describe("izbor jednog pitanja", () => {
  it("bira najkorisniju nepoznanicu i stabilno razrešava izjednačenja", () => {
    const profile = { age: 62, hba1c: { value: 8.1, unit: "%" } };
    const results = evaluateCriteria(profile, trials);
    expect(selectNextQuestion(profile, trials, results)?.field).toBe(
      "creatinine",
    );
  });

  it("pita za insulin kada je to jedina nepoznanica studije T-A", () => {
    const profile = {
      age: 62,
      sex: "male" as const,
      hba1c: { value: 8.1, unit: "%" },
      creatinine: { value: 1.3, unit: "mg/dL" },
      height: { value: 178, unit: "cm" },
      weight: { value: 92, unit: "kg" },
    };
    const results = evaluateCriteria(profile, trials);
    expect(selectNextQuestion(profile, trials, results)?.field).toBe(
      "insulin_last_3_months",
    );
  });
});
