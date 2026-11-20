import { describe, expect, it } from "vitest";
import { liveEvalConfig, liveResultsDir } from "./live.js";

describe("liveEvalConfig", () => {
  it("forsira fixture korpus i ignoriše vrednosti iz okruženja", () => {
    const config = liveEvalConfig({
      GEMINI_API_KEY: "test-key",
      DATASET_PROFILE: "clinicaltrials-20",
      DATA_DIR: "x",
      RAG_INDEX_PATH: "y",
      DEMO_MODE: "true",
      MAX_MODEL_CALLS_PER_RUN: "99",
    });
    expect(config.DATASET_PROFILE).toBe("fixtures");
    expect(config.DATA_DIR).toBe("data/fixtures");
    expect(config.DEMO_MODE).toBe(false);
    expect(config.MAX_MODEL_CALLS_PER_RUN).toBe(4);
    expect(config.MAX_TOOL_CALLS_PER_RUN).toBe(10);
  });
});

describe("liveResultsDir", () => {
  it("vraća eval/results/<oznaka>", () => {
    expect(liveResultsDir("final").replace(/\\/g, "/")).toMatch(
      /eval\/results\/final$/,
    );
  });
  it("odbija rezervisane oznake bez obzira na velika slova", () => {
    for (const label of ["invalid", "rag", "RAG", "Invalid"])
      expect(() => liveResultsDir(label)).toThrow(/rezervisana/);
  });
  it("odbija neispravne oznake", () => {
    expect(() => liveResultsDir("../x")).toThrow();
  });
});
