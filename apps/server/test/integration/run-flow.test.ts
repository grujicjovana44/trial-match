import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/api/app.js";
import { parseConfig } from "../../src/config/index.js";

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

it("učitava dve stvarne studije iz DATA_DIR i vraća rezultate bez greške citata", async () => {
  const app = createApp({
    config: parseConfig({
      NODE_ENV: "test",
      DEMO_MODE: "true",
      DATA_DIR: "data/rule_sets/studies_2_lt_20261114",
    }),
  });
  try {
    const result = await app.inject({
      method: "POST",
      url: "/api/runs",
      payload: {
        profileText:
          "Žena, 30 godina, HbA1c 8%, kreatinin 1 mg/dL, visina 160 cm, težina 90 kg, bez insulina.",
      },
    });
    const response = result.json();

    expect(result.statusCode).toBe(200);
    expect(response.status).not.toBe("error");
    expect(response.meta).toMatchObject({
      dataSynthetic: false,
      dataVersion: "rules-72b33d1faec2",
      demoMode: true,
    });
    expect(
      response.results
        .map((trial: { trialId: string }) => trial.trialId)
        .sort(),
    ).toEqual(["NCT07409714", "NCT07924436"]);

    const boundaryCases = [
      {
        hba1c: "9,99",
        creatinine: "2,3049",
        weight: "102,3744",
        statuses: ["met", "met", "not_met"],
        egfr: 29.99,
      },
      {
        hba1c: "10",
        creatinine: "2,3043",
        weight: "102,4",
        statuses: ["not_met", "not_met", "met"],
        egfr: 30,
      },
      {
        hba1c: "10,01",
        creatinine: "2,3036",
        weight: "102,4256",
        statuses: ["not_met", "not_met", "met"],
        egfr: 30.01,
      },
    ] as const;

    for (const boundary of boundaryCases) {
      const evaluated = await app.inject({
        method: "POST",
        url: "/api/runs",
        payload: {
          profileText: `Žena, 22 godine, HbA1c ${boundary.hba1c}%, kreatinin ${boundary.creatinine} mg/dL, visina 160 cm, težina ${boundary.weight} kg, bez insulina.`,
        },
      });
      expect(evaluated.statusCode, evaluated.body).toBe(200);
      const evaluatedResponse = evaluated.json();
      const study = evaluatedResponse.results.find(
        (trial: { trialId: string }) => trial.trialId === "NCT07409714",
      );
      expect(study).toBeDefined();
      const statuses = [
        "NCT07409714#inc-4",
        "NCT07409714#inc-7",
        "NCT07409714#exc-4",
      ].map(
        (criterionId) =>
          study.criteria.find(
            (criterion: { id: string }) => criterion.id === criterionId,
          )?.status,
      );
      expect(statuses).toEqual(boundary.statuses);
      expect(
        study.criteria.find(
          (criterion: { id: string }) =>
            criterion.id === "NCT07409714#exc-4",
        )?.observedValue,
      ).toBe(boundary.egfr);
    }
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
