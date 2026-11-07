import { describe, expect, it } from "vitest";
import { RunResponseSchema } from "../../../../packages/shared/src/index.js";

describe("RunResponse ugovor", () => {
  it("odbacuje nepoznate ključeve i neusaglašene status/faze", () => {
    expect(
      RunResponseSchema.safeParse({ status: "ok", stage: "failed" }).success,
    ).toBe(false);
    expect(
      RunResponseSchema.safeParse({
        status: "error",
        error: {},
        internal: true,
      }).success,
    ).toBe(false);
  });
});
