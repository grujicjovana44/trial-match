import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/api/app.js";

const profileText =
  "Muškarac, 62 godine, dijabetes tip 2, HbA1c 8,1%, kreatinin 1,3 mg/dL, visina 178 cm, težina 92 kg, na metforminu.";

describe("API tok DEMO provere", () => {
  const app = createApp();
  afterAll(async () => app.close());

  it("nastavlja isti runId posle pitanja i obrađuje hipotezu", async () => {
    const first = await app.inject({
      method: "POST",
      url: "/api/runs",
      payload: { profileText },
    });
    expect(first.statusCode, first.body).toBe(200);
    const initial = first.json();
    expect(initial.status).toBe("needs_clarification");
    expect(initial.meta.modelCalls).toBe(1);
    expect(initial.question.field).toBe("insulin_last_3_months");

    const answered = await app.inject({
      method: "POST",
      url: `/api/runs/${initial.runId}/answer`,
      payload: { answer: "ne" },
    });
    expect(answered.statusCode).toBe(200);
    expect(answered.json().runId).toBe(initial.runId);
    expect(answered.json().status).toBe("ok");
    expect(answered.json().meta.modelCalls).toBe(1);
    expect(answered.json().meta.toolCalls).toBe(2);

    const changed = await app.inject({
      method: "POST",
      url: `/api/runs/${initial.runId}/hypothesis`,
      payload: { profileText: "A šta ako je HbA1c 9,0%?" },
    });
    expect(changed.statusCode).toBe(200);
    expect(changed.json().runId).toBe(initial.runId);
    expect(changed.json().profile.insulin_last_3_months).toBe(false);
    expect(changed.json().profile.hba1c.value).toBe(9);
    expect(changed.json().meta.modelCalls).toBe(2);
    expect(changed.json().meta.toolCalls).toBe(3);
    expect(
      changed
        .json()
        .results.some((trial: { trialId: string }) => trial.trialId === "T-B"),
    ).toBe(true);

    const invalidHypothesis = await app.inject({
      method: "POST",
      url: `/api/runs/${initial.runId}/hypothesis`,
      payload: { profileText: "HbA1c abc." },
    });
    expect(invalidHypothesis.statusCode).toBe(400);
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/api/runs/${initial.runId}/hypothesis`,
          payload: { profileText: "A šta ako je HbA1c 9,0%?" },
        })
      ).json().profile.insulin_last_3_months,
    ).toBe(false);
  });

  it("odbija medicinsko odlučivanje i ne pravi odgovor iz znanja van izvora", async () => {
    const rejected = await app.inject({
      method: "POST",
      url: "/api/runs",
      payload: { profileText: "Koju dijagnozu imam?" },
    });
    expect(rejected.json().status).toBe("rejected");
    const outside = await app.inject({
      method: "POST",
      url: "/api/runs",
      payload: { profileText: "Koja su neželjena dejstva leka?" },
    });
    expect(outside.json()).toMatchObject({
      status: "insufficient_evidence",
      reason: "not_in_sources",
    });
  });
});

it("003: manifest, isključenja i ćirilični limit čuvaju ugovor", async () => {
  const app = createApp();
  try {
    const result = await app.inject({
      method: "POST",
      url: "/api/runs",
      payload: {
        profileText:
          "Muškarac, 90 godina, HbA1c 4%, kreatinin 1 mg/dL, bez insulina.",
      },
    });
    expect(result.json().meta).toMatchObject({
      dataSynthetic: true,
      dataSnapshotDate: "2026-11-07",
    });
    expect(result.json().results).toEqual([]);
    expect(result.json().excludedTrials.length).toBeGreaterThan(0);
    const unicode = await app.inject({
      method: "POST",
      url: "/api/runs",
      payload: { profileText: "ж".repeat(4000) },
    });
    expect(unicode.statusCode).toBe(200);
  } finally {
    await app.close();
  }
});

it("003: isti ključ deli aktivan start i odbija promenjeno telo", async () => {
  const app = createApp();
  try {
    const request = {
      method: "POST" as const,
      url: "/api/runs",
      headers: { "Idempotency-Key": "11111111-1111-4111-8111-111111111111" },
      payload: { profileText },
    };
    const [a, b] = await Promise.all([
      app.inject(request),
      app.inject(request),
    ]);
    expect(a.statusCode).toBe(200);
    expect(b.json()).toEqual(a.json());
    expect(
      (await app.inject({ ...request, payload: { profileText: "Drugi unos" } }))
        .statusCode,
    ).toBe(400);
    const path = `/api/runs/${a.json().runId}/answer`;
    const answers = await Promise.all([
      app.inject({ method: "POST", url: path, payload: { answer: "ne" } }),
      app.inject({ method: "POST", url: path, payload: { answer: "da" } }),
    ]);
    expect(answers.map((r) => r.statusCode).sort()).toEqual([200, 400]);
  } finally {
    await app.close();
  }
});
