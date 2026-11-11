import { describe, expect, it } from "vitest";
import {
  canStartOver,
  initialRunState,
  isBusy,
  isHypothesisResult,
  resultIsStale,
  runReducer,
  showSavedNotice,
  type LastRequest,
} from "../../src/state/run-state.js";
import { uiErrorFromTransport } from "../../src/api/ui-error.js";
import {
  clarificationResponse,
  okResponse,
  runErrorResponse,
} from "../helpers/responses.js";

const runRequest: LastRequest = {
  kind: "run",
  path: "/api/runs",
  body: { profileText: "Profil" },
  userText: "Profil",
};
const answerRequest: LastRequest = {
  kind: "answer",
  path: "/api/runs/run-1/answer",
  body: { answer: "Ne" },
  userText: "Ne",
};
const hypothesisRequest: LastRequest = {
  kind: "hypothesis",
  path: "/api/runs/run-1/hypothesis",
  body: { profileText: "HbA1c 9%" },
  userText: "HbA1c 9%",
};

describe("runReducer", () => {
  it("submits a run and clears a previous result", () => {
    const withResult = runReducer(initialRunState, {
      type: "succeeded",
      response: okResponse(),
    });
    const state = runReducer(withResult, {
      type: "submit",
      request: runRequest,
    });
    expect(state).toMatchObject({
      phase: "processing",
      result: null,
      resultKind: null,
      sourceText: "Profil",
      hypothesisText: null,
      pending: runRequest,
      lastRequest: runRequest,
      error: null,
    });
  });

  it("ignores a second submit while processing", () => {
    const processing = runReducer(initialRunState, {
      type: "submit",
      request: runRequest,
    });
    expect(
      runReducer(processing, { type: "submit", request: answerRequest }),
    ).toBe(processing);
  });

  it("keeps a previous result stale while an answer is pending", () => {
    const initial = runReducer(initialRunState, {
      type: "succeeded",
      response: clarificationResponse(),
    });
    const state = runReducer(initial, {
      type: "submit",
      request: answerRequest,
    });
    expect(state.result).toBe(initial.result);
    expect(resultIsStale(state)).toBe(true);
  });

  it("records a successful result, its request kind, meta, and counters", () => {
    const state = runReducer(
      runReducer(initialRunState, {
        type: "submit",
        request: hypothesisRequest,
      }),
      { type: "succeeded", response: okResponse() },
    );
    expect(state).toMatchObject({
      phase: "result",
      resultKind: "hypothesis",
      hypothesisText: "HbA1c 9%",
      meta: okResponse().meta,
      pending: null,
      focusToken: 1,
      resultSeq: 1,
    });
    expect(isHypothesisResult(state)).toBe(true);
  });

  it("maps an error response to a controlled lost-run error without incrementing resultSeq", () => {
    const state = runReducer(
      runReducer(initialRunState, { type: "submit", request: runRequest }),
      {
        type: "succeeded",
        response: runErrorResponse("internal_error", true),
      },
    );
    expect(state).toMatchObject({
      phase: "error",
      result: null,
      resultKind: null,
      error: { kind: "service", action: "retry", runLost: true },
      focusToken: 1,
      resultSeq: 0,
    });
  });

  it("clears the result when a failed request lost it or was a new run", () => {
    const previous = runReducer(initialRunState, {
      type: "succeeded",
      response: okResponse(),
    });
    const runState = runReducer(
      runReducer(previous, { type: "submit", request: runRequest }),
      {
        type: "failed",
        error: uiErrorFromTransport("network", "run"),
      },
    );
    expect(runState).toMatchObject({
      phase: "error",
      result: null,
      error: { kind: "network" },
      focusToken: 2,
      resultSeq: 1,
    });

    const expired = runReducer(
      runReducer(previous, { type: "submit", request: hypothesisRequest }),
      {
        type: "failed",
        error: uiErrorFromTransport({ httpStatus: 404 }, "hypothesis"),
      },
    );
    expect(expired.result).toBeNull();
  });

  it("keeps a previous result after a recoverable hypothesis failure", () => {
    const previous = runReducer(initialRunState, {
      type: "succeeded",
      response: okResponse(),
    });
    const pending = runReducer(previous, {
      type: "submit",
      request: hypothesisRequest,
    });
    const state = runReducer(pending, {
      type: "failed",
      error: uiErrorFromTransport("network", "hypothesis"),
    });
    expect(state.result).toBe(previous.result);
    expect(state.phase).toBe("error");
  });

  it("resets outside processing and preserves the result sequence", () => {
    const previous = runReducer(initialRunState, {
      type: "succeeded",
      response: okResponse(),
    });
    const state = runReducer(previous, { type: "reset" });
    expect(state).toMatchObject({
      ...initialRunState,
      focusToken: 2,
      resultSeq: 1,
    });
    expect(
      runReducer(
        runReducer(initialRunState, { type: "submit", request: runRequest }),
        { type: "reset" },
      ).phase,
    ).toBe("processing");
  });

  it("exposes state selectors", () => {
    expect(
      isBusy(
        runReducer(initialRunState, { type: "submit", request: runRequest }),
      ),
    ).toBe(true);
    const answerResult = runReducer(
      runReducer(initialRunState, { type: "submit", request: answerRequest }),
      { type: "succeeded", response: okResponse() },
    );
    expect(showSavedNotice(answerResult)).toBe(true);
    expect(canStartOver(answerResult)).toBe(true);
    expect(canStartOver(initialRunState)).toBe(false);
  });
});
