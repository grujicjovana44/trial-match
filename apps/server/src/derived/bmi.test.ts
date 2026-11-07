import { describe, expect, it } from "vitest";
import { computeBmi } from "./bmi.js";

describe("BMI", () => {
  it("prolazi potvrđeni kontrolni primer", () => {
    expect(
      computeBmi({
        height: { value: 178, unit: "cm" },
        weight: { value: 92, unit: "kg" },
      }),
    ).toBeCloseTo(29.04, 2);
  });

  it("ostaje nedostupan kada nedostaje merenje", () => {
    expect(computeBmi({ height: { value: 178, unit: "cm" } })).toBeUndefined();
  });
});
