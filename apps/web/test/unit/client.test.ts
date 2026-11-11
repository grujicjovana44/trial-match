import { afterEach, describe, expect, it, vi } from "vitest";
import { postJson } from "../../src/api/client.js";
import {
  httpErrorBody,
  jsonResponse,
  nonJsonResponse,
  okResponse,
} from "../helpers/responses.js";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("postJson", () => {
  it("validates and returns a successful response", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(okResponse()));
    vi.stubGlobal("fetch", fetchMock);

    const outcome = await postJson(
      "/api/runs",
      { profileText: "sintetički" },
      "run",
    );

    expect(outcome).toMatchObject({ ok: true, response: { status: "ok" } });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/runs",
      expect.objectContaining({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profileText: "sintetički" }),
      }),
    );
  });

  it("maps a rejected fetch to a network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(
      postJson("/api/runs", { profileText: "x" }, "run"),
    ).resolves.toMatchObject({
      ok: false,
      error: { kind: "network", action: "retry" },
    });
  });

  it("maps an abort after 70 seconds to a client timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_input: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new Error("aborted")),
            );
          }),
      ),
    );
    const outcome = postJson("/api/runs", { profileText: "x" }, "run");
    await vi.advanceTimersByTimeAsync(70_000);
    await expect(outcome).resolves.toMatchObject({
      ok: false,
      error: { kind: "client_timeout", action: "retry" },
    });
  });

  it("maps a non-JSON success and an invalid response schema", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(nonJsonResponse(200)));
    await expect(
      postJson("/api/runs", { profileText: "x" }, "run"),
    ).resolves.toMatchObject({
      ok: false,
      error: { kind: "bad_response" },
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ foo: 1 })));
    await expect(
      postJson("/api/runs", { profileText: "x" }, "run"),
    ).resolves.toMatchObject({
      ok: false,
      error: { kind: "invalid_response" },
    });
  });

  it("uses Retry-After for valid and invalid rate-limit envelopes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        jsonResponse(httpErrorBody("rate_limit_exceeded", false), 429, {
          "retry-after": "30",
        }),
      ),
    );
    await expect(
      postJson("/api/runs", { profileText: "x" }, "run"),
    ).resolves.toMatchObject({
      ok: false,
      error: { kind: "rate_limited", retryAfterSeconds: 30 },
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(nonJsonResponse(429)));
    await expect(
      postJson("/api/runs", { profileText: "x" }, "run"),
    ).resolves.toMatchObject({
      ok: false,
      error: { kind: "rate_limited", retryAfterSeconds: 60 },
    });
  });

  it("maps non-JSON 5xx and run-not-found envelopes", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(nonJsonResponse(502)));
    await expect(
      postJson("/api/runs", { profileText: "x" }, "run"),
    ).resolves.toMatchObject({
      ok: false,
      error: { kind: "service", action: "retry" },
    });

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(httpErrorBody("run_not_found", false), 404),
        ),
    );
    await expect(
      postJson("/api/runs/run-1/answer", { answer: "Da" }, "answer"),
    ).resolves.toMatchObject({
      ok: false,
      error: { kind: "run_expired", action: "restart", runLost: true },
    });
  });

  it("reads the base URL at each call and removes its trailing slash", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(okResponse()))
      .mockResolvedValueOnce(jsonResponse(okResponse()));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("VITE_API_BASE_URL", "");
    await postJson("/api/runs", { profileText: "x" }, "run");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/runs");

    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/");
    await postJson("/api/runs", { profileText: "x" }, "run");
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://api.example.test/api/runs",
    );
  });
});
