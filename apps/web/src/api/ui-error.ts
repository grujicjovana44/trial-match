import { DEFAULT_RETRY_AFTER_SECONDS } from "../copy.js";

export type UiErrorKind =
  | "network"
  | "client_timeout"
  | "bad_response"
  | "invalid_response"
  | "rate_limited"
  | "model_timeout"
  | "service"
  | "processing_limit"
  | "question_limit"
  | "input_invalid"
  | "input_too_large"
  | "hypothesis_invalid"
  | "hypothesis_forbidden"
  | "run_expired"
  | "request_rejected";

export type UiErrorAction = "retry" | "wait_retry" | "edit" | "restart";

export interface UiError {
  kind: UiErrorKind;
  action: UiErrorAction;
  runLost: boolean; // true: prethodni rezultat više ne važi
  retryAfterSeconds?: number; // samo za "rate_limited"
  serverMessage?: string; // poruka servera, samo za nepoznatu kategoriju
}

export interface ServerErrorInfo {
  category: string;
  message: string;
  retryable: boolean;
}

// Vrsta zahteva; lokalna kopija, da ovaj modul ne zavisi od stanja (run-state.ts).
type RequestKind = "run" | "answer" | "hypothesis";

export type TransportCircumstance =
  | "network"
  | "timeout"
  | "not_json"
  | "invalid_schema"
  | { httpStatus: number };

// Vrednost zaglavlja Retry-After: ceo broj između 1 i 600, inače podrazumevano.
export function parseRetryAfter(value: string | null): number {
  if (value === null) return DEFAULT_RETRY_AFTER_SECONDS;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return DEFAULT_RETRY_AFTER_SECONDS;
  const seconds = Number(trimmed);
  return seconds >= 1 && seconds <= 60 ? seconds : DEFAULT_RETRY_AFTER_SECONDS;
}

// Kategorija servera u vrstu greške za prikaz (data-model.md, odeljak 2).
// Izvor "run" znači da je greška stigla kao RunResponse sa statusom "error".
export function uiErrorFromCategory(
  error: ServerErrorInfo,
  source: "run" | "http",
): UiError {
  const lost = (tableValue: boolean): boolean => source === "run" || tableValue;
  const retryOrRestart: UiErrorAction =
    source === "run" || !error.retryable ? "restart" : "retry";

  switch (error.category) {
    case "model_timeout":
      return {
        kind: "model_timeout",
        action: retryOrRestart,
        runLost: lost(true),
      };
    case "model_call_limit":
    case "tool_call_limit":
      return {
        kind: "processing_limit",
        action: retryOrRestart,
        runLost: lost(true),
      };
    case "tool_error":
    case "unknown_tool":
    case "invalid_tool_arguments":
    case "internal_error":
    case "internal_contract_violation":
      return { kind: "service", action: retryOrRestart, runLost: lost(false) };
    case "question_round_limit":
      return { kind: "question_limit", action: "restart", runLost: lost(true) };
    case "rate_limit_exceeded":
      return {
        kind: "rate_limited",
        action: "wait_retry",
        runLost: lost(false),
        retryAfterSeconds: DEFAULT_RETRY_AFTER_SECONDS,
      };
    case "input_too_large":
      return { kind: "input_too_large", action: "edit", runLost: lost(false) };
    case "invalid_request":
    case "invalid_profile":
      return { kind: "input_invalid", action: "edit", runLost: lost(false) };
    case "invalid_hypothesis":
    case "ambiguous_hypothesis":
      return {
        kind: "hypothesis_invalid",
        action: "edit",
        runLost: lost(false),
      };
    case "forbidden_intent":
      return {
        kind: "hypothesis_forbidden",
        action: "edit",
        runLost: lost(false),
      };
    case "run_not_found":
    case "invalid_transition":
      return { kind: "run_expired", action: "restart", runLost: lost(true) };
    default:
      return {
        kind: "service",
        action: retryOrRestart,
        runLost: lost(false),
        serverMessage: error.message,
      };
  }
}

// Greške bez omotača servera (data-model.md, odeljak 2, druga tabela).
export function uiErrorFromTransport(
  circumstance: TransportCircumstance,
  requestKind: RequestKind,
  retryAfterHeader?: string | null,
): UiError {
  if (circumstance === "network") {
    return { kind: "network", action: "retry", runLost: false };
  }
  if (circumstance === "timeout") {
    return { kind: "client_timeout", action: "retry", runLost: false };
  }
  if (circumstance === "not_json") {
    return { kind: "bad_response", action: "retry", runLost: false };
  }
  if (circumstance === "invalid_schema") {
    return { kind: "invalid_response", action: "retry", runLost: false };
  }

  const status = circumstance.httpStatus;
  if (status === 429) {
    return {
      kind: "rate_limited",
      action: "wait_retry",
      runLost: false,
      retryAfterSeconds: parseRetryAfter(retryAfterHeader ?? null),
    };
  }
  if (status === 404 && requestKind !== "run") {
    return { kind: "run_expired", action: "restart", runLost: true };
  }
  if (status === 408 || status === 504) {
    return { kind: "client_timeout", action: "retry", runLost: false };
  }
  if (status >= 500) {
    return { kind: "service", action: "retry", runLost: false };
  }
  return { kind: "request_rejected", action: "restart", runLost: false };
}
