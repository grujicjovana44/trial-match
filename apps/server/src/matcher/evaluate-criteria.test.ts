import { describe, expect, it } from "vitest";
import {
  CriterionSchema,
  TrialSchema,
} from "../../../../packages/shared/src/index.js";
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

  it("primenjuje strogi lt prag za inclusion kriterijum", () => {
    const trial = TrialSchema.parse({
      ...trials[0],
      criteria: [
        {
          ...trials[0]!.criteria[0],
          operator: "lt",
          value: 10,
        },
      ],
    });
    const results = [9, 10, 11].map((age) =>
      evaluateCriteria({ age }, [trial])[0]!.criteria[0]!.status,
    );

    expect(results).toEqual(["met", "not_met", "not_met"]);
  });

  it("primenjuje strogi lt prag za exclusion kriterijum", () => {
    const trial = TrialSchema.parse({
      ...trials[0],
      criteria: [
        {
          ...trials[0]!.criteria[0],
          kind: "exclusion",
          operator: "lt",
          value: 10,
        },
      ],
    });
    const results = [9, 10, 11].map((age) =>
      evaluateCriteria({ age }, [trial])[0]!.criteria[0]!.status,
    );

    expect(results).toEqual(["not_met", "met", "met"]);
  });

  it("primenjuje strogi gt prag za inclusion kriterijum", () => {
    const trial = TrialSchema.parse({
      ...trials[0],
      criteria: [
        {
          ...trials[0]!.criteria[0],
          operator: "gt",
          value: 10,
        },
      ],
    });
    const results = [9, 10, 11].map((age) =>
      evaluateCriteria({ age }, [trial])[0]!.criteria[0]!.status,
    );

    expect(results).toEqual(["not_met", "not_met", "met"]);
  });

  it("primenjuje strogi gt prag za exclusion kriterijum", () => {
    const trial = TrialSchema.parse({
      ...trials[0],
      criteria: [
        {
          ...trials[0]!.criteria[0],
          kind: "exclusion",
          operator: "gt",
          value: 10,
        },
      ],
    });
    const results = [9, 10, 11].map((age) =>
      evaluateCriteria({ age }, [trial])[0]!.criteria[0]!.status,
    );

    expect(results).toEqual(["met", "met", "not_met"]);
  });

  it("Zod prihvata lt sa brojem i odbija nebrojčanu vrednost", () => {
    const criterion = {
      ...trials[0]!.criteria[0],
      operator: "lt",
      value: 10,
    };

    expect(CriterionSchema.safeParse(criterion).success).toBe(true);
    expect(
      CriterionSchema.safeParse({ ...criterion, value: "10" }).success,
    ).toBe(false);
  });

  it("Zod prihvata gt sa brojem i odbija nebrojčanu vrednost", () => {
    const criterion = {
      ...trials[0]!.criteria[0],
      operator: "gt",
      value: 10,
    };

    expect(CriterionSchema.safeParse(criterion).success).toBe(true);
    expect(
      CriterionSchema.safeParse({ ...criterion, value: "10" }).success,
    ).toBe(false);
  });

  it("čuva uključive granice za gte, lte i between", () => {
    const criterion = trials[0]!.criteria[0]!;
    const cases = [
      { operator: "gte", value: 10, ages: [9, 10, 11] },
      { operator: "lte", value: 10, ages: [9, 10, 11] },
      { operator: "between", value: [10, 12], ages: [9, 10, 12, 13] },
    ] as const;

    for (const testCase of cases) {
      const trial = TrialSchema.parse({
        ...trials[0],
        criteria: [
          {
            ...criterion,
            operator: testCase.operator,
            value: testCase.value,
          },
        ],
      });
      const statuses = testCase.ages.map(
        (age) => evaluateCriteria({ age }, [trial])[0]!.criteria[0]!.status,
      );
      const expected =
        testCase.operator === "gte"
          ? ["not_met", "met", "met"]
          : testCase.operator === "lte"
            ? ["met", "met", "not_met"]
            : ["not_met", "met", "met", "not_met"];

      expect(statuses).toEqual(expected);
    }
  });
});
