import { describe, expect, it } from "vitest";
import { computeEgfr } from "./egfr.js";

describe("eGFR CKD-EPI 2021", () => {
  it("prolazi potvrđene kontrolne vrednosti sa tolerancijom 0,01", () => {
    expect(
      computeEgfr({
        age: 62,
        sex: "male",
        creatinine: { value: 1.3, unit: "mg/dL" },
      }),
    ).toBeCloseTo(62.11, 2);
    expect(
      computeEgfr({
        age: 70,
        sex: "female",
        creatinine: { value: 1, unit: "mg/dL" },
      }),
    ).toBeCloseTo(60.61, 2);
  });

  it("ne računa bez svakog potrebnog polja", () => {
    expect(
      computeEgfr({ age: 62, creatinine: { value: 1.3, unit: "mg/dL" } }),
    ).toBeUndefined();
  });
});
