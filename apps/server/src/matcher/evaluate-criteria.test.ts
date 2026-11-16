import { describe, expect, it } from "vitest";
import {
  CriterionSchema,
  TrialSchema,
} from "../../../../packages/shared/src/index.js";
import fixtureData from "../../../../data/fixtures/trials.json" with { type: "json" };
import preparedStudies from "../../../../data/trials/studies_2_prepared.json" with { type: "json" };
import studies2Draft from "../../../../data/trials/studies_2_rules_draft.json" with { type: "json" };
import { evaluateCriteria } from "./evaluate-criteria.js";

const trials = TrialSchema.array().parse(fixtureData);
const preparedById = new Map(
  preparedStudies.trials.map((trial) => [trial.trialId, trial]),
);
const draftById = new Map(studies2Draft.map((trial) => [trial.trialId, trial]));

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
    const results = [9, 10, 11].map(
      (age) => evaluateCriteria({ age }, [trial])[0]!.criteria[0]!.status,
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
    const results = [9, 10, 11].map(
      (age) => evaluateCriteria({ age }, [trial])[0]!.criteria[0]!.status,
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
    const results = [9, 10, 11].map(
      (age) => evaluateCriteria({ age }, [trial])[0]!.criteria[0]!.status,
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
    const results = [9, 10, 11].map(
      (age) => evaluateCriteria({ age }, [trial])[0]!.criteria[0]!.status,
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

  it.each([
    ["lt", 10, [9, 10, 11], ["met", "not_met", "not_met"]],
    ["lte", 10, [9, 10, 11], ["met", "met", "not_met"]],
    ["gt", 30, [29, 30, 31], ["not_met", "not_met", "met"]],
    ["gte", 30, [29, 30, 31], ["not_met", "met", "met"]],
  ] as const)(
    "primenjuje %s na granici za inclusion i exclusion",
    (operator, threshold, values, inclusionExpected) => {
      for (const kind of ["inclusion", "exclusion"] as const) {
        const trial = TrialSchema.parse({
          ...trials[0],
          criteria: [
            {
              ...trials[0]!.criteria[0],
              kind,
              operator,
              value: threshold,
            },
          ],
        });
        const actual = values.map(
          (age) => evaluateCriteria({ age }, [trial])[0]!.criteria[0]!.status,
        );
        const expected =
          kind === "inclusion"
            ? inclusionExpected
            : inclusionExpected.map((status) =>
                status === "met" ? "not_met" : "met",
              );
        expect(actual).toEqual(expected);
      }
    },
  );

  it("proverava stvarne stroge pragove i citate u dve studije", () => {
    const cases: {
      trialId: string;
      criterionId: string;
      field: "hba1c" | "bmi" | "egfr";
      kind: "inclusion" | "exclusion";
      values: number[];
      unit: string;
      derivedName?: "BMI" | "eGFR";
      expected: string[];
    }[] = [
      {
        trialId: "NCT07409714",
        criterionId: "NCT07409714#inc-4",
        field: "hba1c",
        kind: "inclusion",
        values: [9.99, 10, 10.01],
        unit: "%",
        expected: ["met", "not_met", "not_met"],
      },
      {
        trialId: "NCT07409714",
        criterionId: "NCT07409714#inc-7",
        field: "bmi",
        kind: "inclusion",
        values: [39.99, 40, 40.01],
        unit: "kg/m²",
        derivedName: "BMI",
        expected: ["met", "not_met", "not_met"],
      },
      {
        trialId: "NCT07409714",
        criterionId: "NCT07409714#exc-4",
        field: "egfr",
        kind: "exclusion",
        values: [29.99, 30, 30.01],
        unit: "mL/min/1.73 m²",
        derivedName: "eGFR",
        expected: ["not_met", "met", "met"],
      },
    ];

    for (const testCase of cases) {
      const prepared = preparedById.get(testCase.trialId)!;
      const criterion = draftById
        .get(testCase.trialId)!
        .criteria.find((item) => item.id === testCase.criterionId)!;
      expect(criterion).toMatchObject({
        field: testCase.field,
        kind: testCase.kind,
        operator: "lt",
      });
      expect(prepared.eligibilityText).toContain(criterion.sourceQuote);
      const trial = TrialSchema.parse({
        ...prepared,
        criteria: [criterion],
      });
      const statuses = testCase.values.map((value) => {
        const derived = testCase.derivedName
          ? [
              {
                name: testCase.derivedName,
                value,
                unit: testCase.unit,
                formulaName: "synthetic boundary test",
                sourceReference: "synthetic boundary test",
              },
            ]
          : undefined;
        const profile =
          testCase.field === "hba1c"
            ? { age: 20, hba1c: { value, unit: "%" } }
            : { age: 20 };
        const [result] = evaluateCriteria(profile, [trial], derived);
        return result!.criteria[0]!.status;
      });
      expect(statuses).toEqual(testCase.expected);
    }
  });

  it("proverava citate i ostavlja dopunjene ručne uslove nepoznatim", () => {
    const manualCriteria = [
      {
        trialId: "NCT07924436",
        criterionId: "NCT07924436#inc-4",
      },
      {
        trialId: "NCT07924436",
        criterionId: "NCT07924436#inc-5",
      },
      {
        trialId: "NCT07409714",
        criterionId: "NCT07409714#inc-9",
      },
      {
        trialId: "NCT07409714",
        criterionId: "NCT07409714#exc-1",
      },
    ];
    for (const { trialId, criterionId } of manualCriteria) {
      const prepared = preparedById.get(trialId)!;
      const criterion = draftById
        .get(trialId)!
        .criteria.find((item) => item.id === criterionId)!;
      expect(criterion.checkability).toBe("manual_review");
      expect(prepared.eligibilityText).toContain(criterion.sourceQuote);
      expect(CriterionSchema.safeParse(criterion).success).toBe(true);
      const trial = TrialSchema.parse({
        ...prepared,
        criteria: [criterion],
      });
      const [result] = evaluateCriteria({}, [trial]);
      expect(result!.criteria[0]!.status).toBe("unknown");
      expect(result!.verdict).toBe("pending");
    }

    const groupCriterion = draftById
      .get("NCT07924436")!
      .criteria.find((item) => item.id === "NCT07924436#inc-5")!;
    expect(groupCriterion).toMatchObject({
      checkability: "manual_review",
      kind: "inclusion",
      sourceQuote:
        "* For Group 1: Presence of type 2 diabetes mellitus.\n* For Group 2: Absence of type 2 diabetes mellitus.",
    });
    const groupTrial = TrialSchema.parse({
      ...preparedById.get("NCT07924436")!,
      criteria: [groupCriterion],
    });
    for (const stated_diagnoses of [
      ["Type 2 diabetes mellitus"],
      ["No type 2 diabetes mellitus"],
    ]) {
      const [result] = evaluateCriteria({ stated_diagnoses }, [groupTrial]);
      expect(result!.criteria[0]!.status).toBe("unknown");
      expect(result!.verdict).toBe("pending");
    }
  });
});
