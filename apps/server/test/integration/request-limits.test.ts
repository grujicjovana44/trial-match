import { describe, expect, it } from "vitest";
import { createApp } from "../../src/api/app.js";
import { parseConfig } from "../../src/config/index.js";

describe("ograničenja API zahteva", () => {
  it("vraća 413 za unos duži od odobrenog limita pre obrade", async () => {
    const config = parseConfig({
      NODE_ENV: "test",
      DEMO_MODE: "true",
      MAX_INPUT_CHARS: "4",
    });
    const app = createApp({ config });
    const response = await app.inject({
      method: "POST",
      url: "/api/runs",
      payload: { profileText: "predugo" },
    });
    expect(response.statusCode).toBe(413);
    await app.close();
  });

  it("vraća 429 kada je dostignut rate limit", async () => {
    const config = parseConfig({
      NODE_ENV: "test",
      DEMO_MODE: "true",
      RATE_LIMIT_MAX: "1",
    });
    const app = createApp({ config });
    await app.inject({
      method: "POST",
      url: "/api/runs",
      payload: { profileText: "Koju dijagnozu imam?" },
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/runs",
      payload: { profileText: "Koju dijagnozu imam?" },
    });
    expect(response.statusCode).toBe(429);
    await app.close();
  });
});
