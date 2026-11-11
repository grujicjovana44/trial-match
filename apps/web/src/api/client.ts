import {
  ApiErrorRequestSchema,
  RunResponseSchema,
  type RunResponse,
} from "../../../../packages/shared/src/index.js";
import { REQUEST_TIMEOUT_MS } from "../copy.js";
import {
  parseRetryAfter,
  uiErrorFromCategory,
  uiErrorFromTransport,
  type UiError,
} from "./ui-error.js";
import type { RequestKind } from "../state/run-state.js";

export type ApiOutcome =
  { ok: true; response: RunResponse } | { ok: false; error: UiError };

export async function postJson(
  path: string,
  body: Record<string, string>,
  requestKind: RequestKind,
): Promise<ApiOutcome> {
  const raw: unknown = import.meta.env.VITE_API_BASE_URL;
  const base = typeof raw === "string" ? raw.replace(/\/$/, "") : "";
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let didTimeout = false;
  try {
    const controller = new AbortController();
    timeoutId = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(base + path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      return {
        ok: false,
        error: uiErrorFromTransport(
          didTimeout ? "timeout" : "network",
          requestKind,
        ),
      };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return {
        ok: false,
        error: response.ok
          ? uiErrorFromTransport("not_json", requestKind)
          : uiErrorFromTransport(
              { httpStatus: response.status },
              requestKind,
              response.headers.get("retry-after"),
            ),
      };
    }

    if (!response.ok) {
      const parsedError = ApiErrorRequestSchema.safeParse(payload);
      if (!parsedError.success) {
        return {
          ok: false,
          error: uiErrorFromTransport(
            { httpStatus: response.status },
            requestKind,
            response.headers.get("retry-after"),
          ),
        };
      }
      const error = uiErrorFromCategory(parsedError.data.error, "http");
      if (error.kind === "rate_limited") {
        error.retryAfterSeconds = parseRetryAfter(
          response.headers.get("retry-after"),
        );
      }
      return { ok: false, error };
    }

    const parsedResponse = RunResponseSchema.safeParse(payload);
    if (!parsedResponse.success) {
      return {
        ok: false,
        error: uiErrorFromTransport("invalid_schema", requestKind),
      };
    }
    return { ok: true, response: parsedResponse.data };
  } catch {
    return {
      ok: false,
      error: uiErrorFromTransport("network", requestKind),
    };
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}
