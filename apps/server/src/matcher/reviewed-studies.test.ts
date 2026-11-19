import { describe, expect, it } from "vitest";
import reviewedStudiesData from "../../../../data/rule_sets/studies_18_approved_REVIEWED/trials.json" with { type: "json" };
import {
  TrialSchema,
  type DerivedValue,
  type Profile,
} from "../../../../packages/shared/src/index.js";
import { evaluateCriteria } from "./evaluate-criteria.js";

const reviewedStudies = TrialSchema.array().parse(reviewedStudiesData);
const allCriteria = reviewedStudies.flatMap((trial) => trial.criteria);
const autoCriteria = allCriteria.filter(
  (criterion) => criterion.checkability === "auto",
);

function criterion(id: string) {
  const found = autoCriteria.find((item) => item.id === id);
  if (!found) throw new Error(`Nedostaje odobreni auto kriterijum ${id}.`);
  return found;
}

function status(
  id: string,
  profile: Profile,
  derived?: DerivedValue[],
): string {
  const target = criterion(id);
  const trial = reviewedStudies.find((item) => item.trialId === target.trialId);
  if (!trial) throw new Error(`Nedostaje studija ${target.trialId}.`);
  const result = evaluateCriteria(profile, [trial], derived)[0];
  const evaluated = result?.criteria.find((item) => item.id === id);
  if (!evaluated) throw new Error(`Matcher nije vratio ${id}.`);
  return evaluated.status;
}

function derivedValue(
  name: "BMI" | "eGFR",
  value: number,
  unit: string,
): DerivedValue[] {
  return [
    {
      name,
      value,
      unit,
      formulaName: "approved rule boundary test",
      sourceReference: "Approved matcher rule; derived value injected for boundary test.",
    },
  ];
}

describe("odobrena matcher pravila za 18 studija", () => {
  it("sadrži samo očekivanih 10 auto pravila", () => {
    expect(autoCriteria.map(({ id, field, operator, value, unit }) => ({
      id,
      field,
      operator,
      value,
      unit,
    }))).toEqual([
      { id: "NCT05838287#inc-7", field: "egfr", operator: "gt", value: 45, unit: "mL/min/1.73 m²" },
      { id: "NCT06118931#inc-1", field: "age", operator: "gte", value: 40, unit: "years" },
      { id: "NCT06118931#inc-2", field: "bmi", operator: "lt", value: 50, unit: "kg/m²" },
      { id: "NCT06271382#inc-2", field: "age", operator: "gte", value: 18, unit: "years" },
      { id: "NCT06296485#inc-1", field: "age", operator: "gte", value: 75, unit: "years" },
      { id: "NCT07121504#inc-1", field: "age", operator: "gte", value: 18, unit: "years" },
      { id: "NCT07775846#inc-3", field: "bmi", operator: "gte", value: 24, unit: "kg/m²" },
      { id: "NCT07919236#inc-3", field: "bmi", operator: "gte", value: 25, unit: "kg/m²" },
      { id: "NCT07919236#inc-6", field: "hba1c", operator: "between", value: [7.5, 10], unit: "%" },
      { id: "NCT07919236#exc-2", field: "hba1c", operator: "gt", value: 10, unit: "%" },
    ]);
    expect(allCriteria).toHaveLength(300);
    expect(allCriteria.filter((item) => item.checkability === "manual_review")).toHaveLength(290);
  });

  it("proverava stroge i uključive granice nad stvarnim odobrenim pravilima", () => {
    expect([44.99, 45, 45.01].map((value) =>
      status("NCT05838287#inc-7", {}, derivedValue("eGFR", value, "mL/min/1.73 m²")),
    )).toEqual(["not_met", "not_met", "met"]);

    for (const [id, values, expected] of [
      ["NCT06118931#inc-1", [39, 40, 41], ["not_met", "met", "met"]],
      ["NCT06271382#inc-2", [17, 18, 19], ["not_met", "met", "met"]],
      ["NCT06296485#inc-1", [74, 75, 76], ["not_met", "met", "met"]],
      ["NCT07121504#inc-1", [17, 18, 19], ["not_met", "met", "met"]],
    ] as const) {
      expect(values.map((age) => status(id, { age }))).toEqual(expected);
    }

    expect([49.99, 50, 50.01].map((value) =>
      status("NCT06118931#inc-2", {}, derivedValue("BMI", value, "kg/m²")),
    )).toEqual(["met", "not_met", "not_met"]);
    expect([23.99, 24, 24.01].map((value) =>
      status("NCT07775846#inc-3", {}, derivedValue("BMI", value, "kg/m²")),
    )).toEqual(["not_met", "met", "met"]);
    expect([24.99, 25, 25.01].map((value) =>
      status("NCT07919236#inc-3", {}, derivedValue("BMI", value, "kg/m²")),
    )).toEqual(["not_met", "met", "met"]);

    expect([7.49, 7.5, 10, 10.01].map((value) =>
      status("NCT07919236#inc-6", { hba1c: { value, unit: "%" } }),
    )).toEqual(["not_met", "met", "met", "not_met"]);
    expect([10, 10.01].map((value) =>
      status("NCT07919236#exc-2", { hba1c: { value, unit: "%" } }),
    )).toEqual(["met", "not_met"]);
  });

  it("vraća unknown za nedostajuće vrednosti i manual exclusion", () => {
    const missing = [
      status("NCT05838287#inc-7", {}),
      status("NCT06118931#inc-1", {}),
      status("NCT06118931#inc-2", {}),
      status("NCT07919236#inc-6", {}),
      status("NCT07919236#exc-2", {}),
    ];
    expect(missing).toEqual(["unknown", "unknown", "unknown", "unknown", "unknown"]);

    const manual = reviewedStudies
      .find((trial) => trial.trialId === "NCT07919236")!
      .criteria.find((item) => item.id === "NCT07919236#exc-5")!;
    expect(manual.checkability).toBe("manual_review");
    const result = evaluateCriteria(
      { age: 60, hba1c: { value: 8, unit: "%" } },
      [reviewedStudies.find((trial) => trial.trialId === "NCT07919236")!],
      derivedValue("eGFR", 90, "mL/min/1.73 m²"),
    )[0]!;
    expect(result.criteria.find((item) => item.id === manual.id)?.status).toBe("unknown");
  });
});
