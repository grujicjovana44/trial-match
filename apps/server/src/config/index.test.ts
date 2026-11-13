import { describe, expect, it } from "vitest";
import { parseConfig } from "./index.js";

describe("konfiguracija", () => {
  it("podrazumeva live režim; demo režim je eksplicitan", () => {
    expect(() => parseConfig({})).toThrow("GEMINI_API_KEY");
    const config = parseConfig({ DEMO_MODE: "true" });
    expect(config.MAX_INPUT_CHARS).toBe(4000);
    expect(config.TOOL_TIMEOUT_MS).toBe(2000);
    expect(config.DEMO_MODE).toBe(true);
  });

  it("validira tipove i dozvoljene granice", () => {
    expect(parseConfig({ PORT: "3100", DEMO_MODE: "true" }).PORT).toBe(3100);
    expect(() => parseConfig({ PORT: "0" })).toThrow();
    expect(() => parseConfig({ UNKNOWN: "x" })).toThrow();
    expect(() => parseConfig({ DEMO_MODE: "false" })).toThrow("GEMINI_API_KEY");
  });

  it("čita poznate promenljive iz stvarnog okruženja", () => {
    expect(() =>
      parseConfig({ ...process.env, DEMO_MODE: "true" }),
    ).not.toThrow();
  });
});
