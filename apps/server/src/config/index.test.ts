import { describe, expect, it } from "vitest";
import { parseConfig } from "./index.js";

describe("konfiguracija", () => {
  it("podrazumeva live režim; demo režim je eksplicitan", () => {
    expect(() => parseConfig({})).toThrow("GEMINI_API_KEY");
    const config = parseConfig({ DEMO_MODE: "true" });
    expect(config.MAX_INPUT_CHARS).toBe(4000);
    expect(config.TOOL_TIMEOUT_MS).toBe(2000);
    expect(config.DEMO_MODE).toBe(true);
    expect(config.DATASET_PROFILE).toBe("fixtures");
  });

  it("validira tipove i dozvoljene granice", () => {
    expect(parseConfig({ PORT: "3100", DEMO_MODE: "true" }).PORT).toBe(3100);
    expect(() => parseConfig({ PORT: "0" })).toThrow();
    expect(() => parseConfig({ UNKNOWN: "x" })).toThrow();
    expect(() => parseConfig({ DEMO_MODE: "false" })).toThrow("GEMINI_API_KEY");
    expect(
      parseConfig({ DEMO_MODE: "true", DATASET_PROFILE: "clinicaltrials-20" })
        .DATASET_PROFILE,
    ).toBe("clinicaltrials-20");
    expect(() =>
      parseConfig({ DEMO_MODE: "true", DATASET_PROFILE: "unknown" }),
    ).toThrow();
  });

  it("čita poznate promenljive iz stvarnog okruženja", () => {
    expect(() =>
      parseConfig({ ...process.env, DEMO_MODE: "true" }),
    ).not.toThrow();
  });

  it("prihvata Cohere kao opcioni reranker sa fiksiranom verzijom modela", () => {
    const config = parseConfig({
      DEMO_MODE: "true",
      RAG_RERANKER: "cohere",
    });
    expect(config.RAG_RERANKER).toBe("cohere");
    expect(config.COHERE_RERANK_MODEL).toBe("rerank-v5.0-fast");
    expect(config.COHERE_API_KEY).toBeUndefined();
    expect(() =>
      parseConfig({
        DEMO_MODE: "true",
        COHERE_RERANK_MODEL: "another-model",
      }),
    ).toThrow();
  });

  describe("podrazumevani reranker", () => {
    const base = { DEMO_MODE: "true" };

    it("bez ključa i bez vrednosti bira disabled", () => {
      expect(parseConfig(base).RAG_RERANKER).toBe("disabled");
    });

    it("sa Cohere ključem i bez vrednosti bira cohere", () => {
      expect(
        parseConfig({ ...base, COHERE_API_KEY: "test-key" }).RAG_RERANKER,
      ).toBe("cohere");
    });

    it("prazan ili razmaknut Cohere ključ važi kao odsutan", () => {
      for (const blank of ["", "   "]) {
        const config = parseConfig({ ...base, COHERE_API_KEY: blank });
        expect(config.RAG_RERANKER).toBe("disabled");
        expect(config.COHERE_API_KEY).toBeUndefined();
      }
    });

    it("eksplicitna vrednost ima prednost nad ključem", () => {
      for (const value of ["deterministic", "disabled"] as const) {
        expect(
          parseConfig({
            ...base,
            RAG_RERANKER: value,
            COHERE_API_KEY: "test-key",
          }).RAG_RERANKER,
        ).toBe(value);
      }
    });

    it("nevažeća vrednost se odbija", () => {
      expect(() => parseConfig({ ...base, RAG_RERANKER: "unknown" })).toThrow();
    });
  });
});
