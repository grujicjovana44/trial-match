import { describe, expect, it } from "vitest";
import { TrialSchema } from "../../../../packages/shared/src/index.js";
import fixtureData from "../../../../data/fixtures/trials.json" with { type: "json" };
import { evaluateCriteria } from "./evaluate-criteria.js";

const trials = TrialSchema.array().parse(fixtureData);

describe("deterministički matcher", () => {
  it("zadržava nepoznato i nikada ga ne pretvara u ispunjen uslov", () => {
    const [result] = evaluateCriteria(
      { age: 62, hba1c: { value: 8.1, unit: "%" } },
      [trials[0]!],
    );
    expect(result?.verdict).toBe("pending");
    expect(
      result?.criteria.find((item) => item.id.endsWith("inc-4"))?.status,
    ).toBe("unknown");
  });

  it("razlikuje kandidate od studija sa neispunjenim uslovima", () => {
    const profile = {
      age: 62,
      sex: "male" as const,
      hba1c: { value: 8.1, unit: "%" },
      creatinine: { value: 1.3, unit: "mg/dL" },
      height: { value: 178, unit: "cm" },
      weight: { value: 92, unit: "kg" },
      insulin_last_3_months: false,
    };
    const result = evaluateCriteria(profile, trials);
    expect(result.find((item) => item.trialId === "T-A")?.verdict).toBe(
      "candidate",
    );
    expect(result.find((item) => item.trialId === "T-B")?.verdict).toBe(
      "excluded",
    );
    expect(result.find((item) => item.trialId === "T-C")?.verdict).toBe(
      "candidate",
    );
  });
});
