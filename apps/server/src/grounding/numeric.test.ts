import { describe, expect, it } from "vitest";
import { hasOnlyGroundedNumbers, safeExplanation } from "./numeric.js";

describe("numeričko uzemljenje", () => {
  it("odbacuje brojeve koje rezultat nije potkrepio", () => {
    expect(hasOnlyGroundedNumbers("Vrednost je 29,04.", [29.04])).toBe(true);
    expect(safeExplanation("Vrednost je 999.", [29.04])).toContain(
      "preliminarna",
    );
  });
});
