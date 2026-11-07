import { describe, expect, it } from "vitest";
import {
  normalizeCreatinine,
  normalizeHba1c,
  parseLocalizedNumber,
} from "./units.js";

describe("normalizacija jedinica", () => {
  it("čita decimalni zarez i tačku", () => {
    expect(parseLocalizedNumber("8,1")).toBe(8.1);
    expect(parseLocalizedNumber("8.1")).toBe(8.1);
    expect(parseLocalizedNumber("8x")).toBeUndefined();
  });

  it("normalizuje kreatinin i HbA1c po potvrđenim izvorima", () => {
    expect(
      normalizeCreatinine({ value: 115, unit: "µmol/L" }).value,
    ).toBeCloseTo(1.3009, 3);
    expect(normalizeHba1c({ value: 50, unit: "mmol/mol" }).value).toBeCloseTo(
      6.726,
      3,
    );
    expect(() => normalizeCreatinine({ value: 1, unit: "unknown" })).toThrow();
  });
});
