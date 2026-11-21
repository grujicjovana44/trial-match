import { describe, expect, it } from "vitest";
import { liveEvalConfig, liveResultsDir, parseCaseDelayMs } from "./live.js";
import {
  buildLiveSummary,
  distinctPromptVersions,
  groupResults,
  tracePromptVersion,
  traceTotals,
  type CaseRecord,
} from "./live-summary.js";

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

describe("sažetak živog izvođenja", () => {
  const rec = (caseId: string, status: CaseRecord["status"]): CaseRecord => ({
    caseId,
    status,
    executionMode: "real_model",
  });

  it("odvaja funkcionalne, bezbednosne i determinističke grupe", () => {
    const grouped = groupResults([
      rec("EV-01", "passed"),
      rec("EV-02", "failed"),
      rec("EV-03", "skipped"),
      rec("EV-07", "dry_run"),
      rec("EV-10", "passed"),
      rec("EV-11", "passed"),
      rec("EV-16", "failed"),
    ]);
    expect(grouped.functional).toEqual({
      passed: 1,
      executed: 2,
      notExecuted: 2,
    });
    expect(grouped.safety).toEqual({ passed: 1, executed: 1, notExecuted: 0 });
    expect(grouped.deterministicAndFault).toEqual({
      passed: 1,
      executed: 2,
      notExecuted: 0,
    });
    expect(grouped.ungrouped).toEqual([]);
  });

  it("izdvaja nepoznate ID-jeve umesto da ih broji", () => {
    expect(groupResults([rec("EV-17", "passed")]).ungrouped).toEqual(["EV-17"]);
  });

  it("verzije prompta: različite, redom prve upotrebe, ili none", () => {
    const events = [
      { promptVersion: "extract_profile.v1" },
      {},
      { promptVersion: "explain_results.v2" },
      { promptVersion: "extract_profile.v1" },
    ];
    expect(distinctPromptVersions(events)).toEqual([
      "extract_profile.v1",
      "explain_results.v2",
    ]);
    expect(tracePromptVersion(events)).toBe(
      "extract_profile.v1+explain_results.v2",
    );
    expect(tracePromptVersion([])).toBe("none");
  });

  it("buildLiveSummary čuva grupe razdvojene i računa trajanje", () => {
    const summary = buildLiveSummary({
      label: "x",
      commit: "abc",
      dirty: false,
      caseSetHash: "h",
      provider: "gemini",
      model: "m",
      dataVersion: "1.0",
      dataName: "n",
      schemaVersion: "2.0.0",
      status: "completed",
      startedAt: "2026-11-20T10:00:00.000Z",
      finishedAt: "2026-11-20T10:00:02.500Z",
      aborted: null,
      limits: {},
      records: [rec("EV-01", "passed"), rec("EV-10", "failed")],
      promptVersions: ["extract_profile.v1"],
      usage: {
        attempts: 3,
        attemptsWithoutUsage: 1,
        inputTokens: 10,
        outputTokens: 5,
      },
      totals: traceTotals([
        { step: "model", durationMs: 100 },
        { step: "tool", durationMs: 5 },
        { step: "model", durationMs: 50 },
      ]),
    });
    expect(summary.results.functional.passed).toBe(1);
    expect(summary.results.safety.executed).toBe(1);
    expect(summary.results.safety.passed).toBe(0);
    expect(summary.totals).toMatchObject({
      attempts: 3,
      attemptsWithoutUsage: 1,
      totalDurationMs: 2500,
      modelDurationMs: 150,
      modelCalls: 2,
      toolCalls: 1,
    });
    expect(summary).not.toHaveProperty("accuracy");
  });
});

describe("parseCaseDelayMs", () => {
  it("bez opcije ne pravi pauzu, kao raniji runovi", () => {
    expect(parseCaseDelayMs(undefined)).toBe(0);
  });

  it("prihvata cele milisekunde do 60000", () => {
    expect(parseCaseDelayMs("0")).toBe(0);
    expect(parseCaseDelayMs("4000")).toBe(4000);
    expect(parseCaseDelayMs("60000")).toBe(60000);
  });

  it("odbija negativne, decimalne, prevelike i nenumeričke vrednosti", () => {
    for (const value of ["-1", "1.5", "60001", "abc", "", "true"])
      expect(() => parseCaseDelayMs(value)).toThrow("--case-delay-ms");
  });
});
