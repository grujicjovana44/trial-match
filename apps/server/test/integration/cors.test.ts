import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/api/app.js";
import { parseConfig } from "../../src/config/index.js";

describe("konfigurisani web origin", () => {
  const origin = "https://trialmatch.vercel.app";
  const app = createApp({
    config: parseConfig({ DEMO_MODE: "true", WEB_ORIGIN: origin }),
  });
  afterAll(async () => app.close());

  it("dozvoljava preflight i Idempotency-Key samo za podešeni origin", async () => {
    const allowed = await app.inject({
      method: "OPTIONS",
      url: "/api/runs",
      headers: {
        origin,
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type,idempotency-key",
      },
    });
    expect(allowed.statusCode).toBe(204);
    expect(allowed.headers["access-control-allow-origin"]).toBe(origin);
    expect(allowed.headers["access-control-allow-headers"]).toContain(
      "Idempotency-Key",
    );
    expect(allowed.headers["access-control-allow-methods"]).toContain(
      "OPTIONS",
    );

    const denied = await app.inject({
      method: "OPTIONS",
      url: "/api/runs",
      headers: { origin: "https://other.vercel.app" },
    });
    expect(denied.statusCode).toBe(403);
    expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
