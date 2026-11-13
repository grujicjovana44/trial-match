import type { RunResponse } from "../../../../packages/shared/src/index.js";
import { uiErrorFromCategory, type UiError } from "../api/ui-error.js";

export type RequestKind = "run" | "answer" | "hypothesis";

export interface LastRequest {
  idempotencyKey?: string;
  kind: RequestKind;
  path: string;
  body: Record<string, string>;
  userText: string;
}

export type Phase = "idle" | "processing" | "result" | "error";

export interface RunState {
  phase: Phase;
  result: RunResponse | null;
  resultKind: RequestKind | null;
  sourceText: string | null;
  hypothesisText: string | null;
  pending: LastRequest | null;
  lastRequest: LastRequest | null;
  error: UiError | null;
  meta: RunResponse["meta"] | null;
  focusToken: number;
  resultSeq: number;
}

export type RunAction =
  | { type: "submit"; request: LastRequest }
  | { type: "succeeded"; response: RunResponse }
  | { type: "failed"; error: UiError }
  | { type: "reset" };

export const initialRunState: RunState = {
  phase: "idle",
  result: null,
  resultKind: null,
  sourceText: null,
  hypothesisText: null,
  pending: null,
  lastRequest: null,
  error: null,
  meta: null,
  focusToken: 0,
  resultSeq: 0,
};

export function runReducer(state: RunState, action: RunAction): RunState {
  switch (action.type) {
    case "submit": {
      if (state.phase === "processing") return state;
      const request = action.request;
      return {
        ...state,
        phase: "processing",
        pending: request,
        lastRequest: request,
        error: null,
        ...(request.kind === "run"
          ? {
              result: null,
              resultKind: null,
              hypothesisText: null,
              sourceText: request.userText,
            }
          : {}),
      };
    }
    case "succeeded": {
      const response = action.response;
      const requestKind = state.pending?.kind ?? null;
      if (response.status === "error") {
        return {
          ...state,
          phase: "error",
          result: null,
          resultKind: null,
          pending: null,
          error: uiErrorFromCategory(response.error, "run"),
          meta: response.meta,
          focusToken: state.focusToken + 1,
        };
      }
      return {
        ...state,
        phase: "result",
        result: response,
        resultKind: requestKind,
        pending: null,
        error: null,
        meta: response.meta,
        focusToken: state.focusToken + 1,
        resultSeq: state.resultSeq + 1,
        ...(requestKind === "hypothesis" && state.pending
          ? { hypothesisText: state.pending.userText }
          : {}),
      };
    }
    case "failed": {
      const losesResult =
        action.error.runLost || state.lastRequest?.kind === "run";
      return {
        ...state,
        phase: "error",
        ...(losesResult ? { result: null, resultKind: null } : {}),
        pending: null,
        error: action.error,
        focusToken: state.focusToken + 1,
      };
    }
    case "reset":
      if (state.phase === "processing") return state;
      return {
        ...initialRunState,
        focusToken: state.focusToken + 1,
        resultSeq: state.resultSeq,
      };
  }
}

export function isBusy(state: RunState): boolean {
  return state.phase === "processing";
}

export function resultIsStale(state: RunState): boolean {
  return state.result !== null && state.phase === "processing";
}

export function showSavedNotice(state: RunState): boolean {
  return state.phase === "result" && state.resultKind === "answer";
}

export function isHypothesisResult(state: RunState): boolean {
  return state.phase !== "processing" && state.resultKind === "hypothesis";
}

export function canStartOver(state: RunState): boolean {
  return state.phase === "result" || state.phase === "error";
}
