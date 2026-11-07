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
