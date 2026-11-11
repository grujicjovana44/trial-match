import { describe, expect, it } from "vitest";
import {
  parseRetryAfter,
  uiErrorFromCategory,
  uiErrorFromTransport,
} from "../../src/api/ui-error.js";

function category(name: string, retryable: boolean) {
  return { category: name, message: "Poruka servera.", retryable };
}

describe("greške iz odgovora servera", () => {
  it("svaka od 18 kategorija daje očekivanu vrstu, radnju i runLost (izvor http)", () => {
    expect(
      uiErrorFromCategory(category("model_timeout", true), "http"),
    ).toEqual({
      kind: "model_timeout",
      action: "retry",
      runLost: true,
    });
    expect(
      uiErrorFromCategory(category("model_call_limit", false), "http"),
    ).toEqual({
      kind: "processing_limit",
      action: "restart",
      runLost: true,
    });
    expect(
      uiErrorFromCategory(category("tool_call_limit", true), "http"),
    ).toEqual({
      kind: "processing_limit",
      action: "retry",
      runLost: true,
    });
    expect(uiErrorFromCategory(category("tool_error", true), "http")).toEqual({
      kind: "service",
      action: "retry",
      runLost: false,
    });
    expect(
      uiErrorFromCategory(category("unknown_tool", false), "http"),
    ).toEqual({
      kind: "service",
      action: "restart",
      runLost: false,
    });
    expect(
      uiErrorFromCategory(category("invalid_tool_arguments", true), "http"),
    ).toEqual({
      kind: "service",
      action: "retry",
      runLost: false,
    });
    expect(
      uiErrorFromCategory(category("internal_error", false), "http"),
    ).toEqual({
      kind: "service",
      action: "restart",
      runLost: false,
    });
    expect(
      uiErrorFromCategory(
        category("internal_contract_violation", true),
        "http",
      ),
    ).toEqual({
      kind: "service",
      action: "retry",
      runLost: false,
    });
    expect(
      uiErrorFromCategory(category("question_round_limit", false), "http"),
    ).toEqual({
      kind: "question_limit",
      action: "restart",
      runLost: true,
    });
    expect(
      uiErrorFromCategory(category("rate_limit_exceeded", false), "http"),
    ).toEqual({
      kind: "rate_limited",
      action: "wait_retry",
      runLost: false,
      retryAfterSeconds: 60,
    });
    expect(
      uiErrorFromCategory(category("input_too_large", false), "http"),
    ).toEqual({
      kind: "input_too_large",
      action: "edit",
      runLost: false,
    });
    expect(
      uiErrorFromCategory(category("invalid_request", false), "http"),
    ).toEqual({
      kind: "input_invalid",
      action: "edit",
      runLost: false,
    });
    expect(
      uiErrorFromCategory(category("invalid_profile", false), "http"),
    ).toEqual({
      kind: "input_invalid",
      action: "edit",
      runLost: false,
    });
    expect(
      uiErrorFromCategory(category("invalid_hypothesis", false), "http"),
    ).toEqual({
      kind: "hypothesis_invalid",
      action: "edit",
      runLost: false,
    });
    expect(
      uiErrorFromCategory(category("ambiguous_hypothesis", false), "http"),
    ).toEqual({
      kind: "hypothesis_invalid",
      action: "edit",
      runLost: false,
    });
    expect(
      uiErrorFromCategory(category("forbidden_intent", false), "http"),
    ).toEqual({
      kind: "hypothesis_forbidden",
      action: "edit",
      runLost: false,
    });
    expect(
      uiErrorFromCategory(category("run_not_found", false), "http"),
    ).toEqual({
      kind: "run_expired",
      action: "restart",
      runLost: true,
    });
    expect(
      uiErrorFromCategory(category("invalid_transition", false), "http"),
    ).toEqual({
      kind: "run_expired",
      action: "restart",
      runLost: true,
    });
  });

  it("izvor run daje runLost true za redove čija je vrednost za http bila false", () => {
    expect(
      uiErrorFromCategory(category("tool_error", true), "run").runLost,
    ).toBe(true);
    expect(
      uiErrorFromCategory(category("rate_limit_exceeded", false), "run")
        .runLost,
    ).toBe(true);
    expect(
      uiErrorFromCategory(category("input_too_large", false), "run").runLost,
    ).toBe(true);
  });

  it("nepoznata kategorija dobija opštu grešku i poruku servera", () => {
    expect(uiErrorFromCategory(category("nesto_novo", true), "http")).toEqual({
      kind: "service",
      action: "retry",
      runLost: false,
      serverMessage: "Poruka servera.",
    });
  });
});

describe("greške bez omotača servera", () => {
  it("mreža, prekid, telo koje nije JSON i neispravna šema", () => {
    expect(uiErrorFromTransport("network", "run")).toEqual({
      kind: "network",
      action: "retry",
      runLost: false,
    });
    expect(uiErrorFromTransport("timeout", "run")).toEqual({
      kind: "client_timeout",
      action: "retry",
      runLost: false,
    });
    expect(uiErrorFromTransport("not_json", "answer")).toEqual({
      kind: "bad_response",
      action: "retry",
      runLost: false,
    });
    expect(uiErrorFromTransport("invalid_schema", "hypothesis")).toEqual({
      kind: "invalid_response",
      action: "retry",
      runLost: false,
    });
  });

  it("HTTP statusi bez omotača", () => {
    expect(uiErrorFromTransport({ httpStatus: 429 }, "run", "30")).toEqual({
      kind: "rate_limited",
      action: "wait_retry",
      runLost: false,
      retryAfterSeconds: 30,
    });
    expect(uiErrorFromTransport({ httpStatus: 429 }, "run", null)).toEqual({
      kind: "rate_limited",
      action: "wait_retry",
      runLost: false,
      retryAfterSeconds: 60,
    });
    expect(uiErrorFromTransport({ httpStatus: 404 }, "answer")).toEqual({
      kind: "run_expired",
      action: "restart",
      runLost: true,
    });
    expect(uiErrorFromTransport({ httpStatus: 404 }, "run")).toEqual({
      kind: "request_rejected",
      action: "restart",
      runLost: false,
    });
    expect(uiErrorFromTransport({ httpStatus: 408 }, "run")).toEqual({
      kind: "client_timeout",
      action: "retry",
      runLost: false,
    });
    expect(uiErrorFromTransport({ httpStatus: 504 }, "run")).toEqual({
      kind: "client_timeout",
      action: "retry",
      runLost: false,
    });
    expect(uiErrorFromTransport({ httpStatus: 502 }, "run")).toEqual({
      kind: "service",
      action: "retry",
      runLost: false,
    });
    expect(uiErrorFromTransport({ httpStatus: 400 }, "answer")).toEqual({
      kind: "request_rejected",
      action: "restart",
      runLost: false,
    });
  });
});

describe("parseRetryAfter", () => {
  it("prihvata ceo broj od 1 do 600, inače 60", () => {
    expect(parseRetryAfter("30")).toBe(30);
    expect(parseRetryAfter(null)).toBe(60);
    expect(parseRetryAfter("abc")).toBe(60);
    expect(parseRetryAfter("0")).toBe(60);
    expect(parseRetryAfter("9999")).toBe(60);
  });
});
