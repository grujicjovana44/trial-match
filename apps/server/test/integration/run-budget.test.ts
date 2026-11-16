import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/api/app.js";
import { parseConfig } from "../../src/config/index.js";

const profileText =
  "Muškarac, 62 godine, dijabetes tip 2, HbA1c 8,1%, kreatinin 1,3 mg/dL, visina 178 cm, težina 92 kg, na metforminu.";

describe("budžeti API izvršavanja", () => {
  const apps: ReturnType<typeof createApp>[] = [];
  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it("odbija hipotetički model-poziv kada je budžet potrošen", async () => {
    const app = createApp({
      config: parseConfig({
        NODE_ENV: "test",
        DEMO_MODE: "true",
        MAX_MODEL_CALLS_PER_RUN: "1",
      }),
    });
    apps.push(app);

    const initial = await app.inject({
      method: "POST",
      url: "/api/runs",
      payload: { profileText },
    });
    const runId = initial.json().runId as string;
    await app.inject({
      method: "POST",
      url: `/api/runs/${runId}/answer`,
      payload: { answer: "ne" },
    });

    const hypothesis = await app.inject({
      method: "POST",
      url: `/api/runs/${runId}/hypothesis`,
      payload: { profileText: "A šta ako je HbA1c 9,0%?" },
    });
    expect(hypothesis.json()).toMatchObject({
      status: "error",
      error: { category: "model_call_limit" },
    });
  });

  it("vraca kontrolisanu grešku nakon ukupnog isteka vremena", async () => {
    let now = 0;
    const app = createApp({
      config: parseConfig({
        NODE_ENV: "test",
        DEMO_MODE: "true",
        RUN_TIMEOUT_MS: "60000",
      }),
      serviceOptions: { now: () => now },
    });
    apps.push(app);

    const initial = await app.inject({
      method: "POST",
      url: "/api/runs",
      payload: { profileText },
    });
    const runId = initial.json().runId as string;
    now = 60001;

    const answered = await app.inject({
      method: "POST",
      url: `/api/runs/${runId}/answer`,
      payload: { answer: "ne" },
    });
    expect(answered.json()).toMatchObject({
      status: "error",
      error: { category: "run_timeout" },
    });
    expect(answered.json().results).toEqual([]);
  });
});
