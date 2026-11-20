import { describe, expect, it } from "vitest";
import {
  extractNumbers,
  hasOnlyGroundedNumbers,
  safeExplanation,
} from "./numeric.js";

describe("izdvajanje brojeva", () => {
  it("ne računa cifre iz ID-ja studije", () => {
    expect(hasOnlyGroundedNumbers("studija NCT06449833 i tip 2", [2])).toBe(
      true,
    );
  });
  it("čita decimalne brojeve sa zarezom", () => {
    expect(hasOnlyGroundedNumbers("HbA1c 8,1%", [8.1])).toBe(true);
    expect(hasOnlyGroundedNumbers("eGFR 62,11", [62.11])).toBe(true);
    expect(hasOnlyGroundedNumbers("HbA1c 12,3%", [8.1])).toBe(false);
  });
  it("ne broji cifre zalepljene za slova", () => {
    expect(extractNumbers("HbA1c i A1c")).toEqual([]);
  });
});

describe("numeričko uzemljenje", () => {
  it("odbacuje brojeve koje rezultat nije potkrepio", () => {
    expect(hasOnlyGroundedNumbers("Vrednost je 29,04.", [29.04])).toBe(true);
    expect(safeExplanation("Vrednost je 999.", [29.04])).toContain(
      "preliminarna",
    );
  });
});
