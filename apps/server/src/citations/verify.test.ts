import { describe, expect, it } from "vitest";
import { verifyCitation } from "./verify.js";

describe("provera citata", () => {
  it("prihvata samo citat koji potiče iz izvora dostupnog izvršavanju", () => {
    const sources = new Map([["source-1", "Tačan odlomak kriterijuma."]]);
    expect(
      verifyCitation({ sourceId: "source-1", quote: "Tačan odlomak" }, sources),
    ).toBe(true);
    expect(
      verifyCitation({ sourceId: "source-2", quote: "Tačan odlomak" }, sources),
    ).toBe(false);
    expect(
      verifyCitation({ sourceId: "source-1", quote: "Skoro isti" }, sources),
    ).toBe(false);
  });
});
