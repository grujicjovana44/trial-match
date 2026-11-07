import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/api/app.js";

describe("API smoke tok", () => {
  const app = createApp();
  afterAll(async () => app.close());

  it("proverava profil, dopunu i hipotezu u istom runId", async () => {
    const started = await app.inject({
      method: "POST",
      url: "/api/runs",
      payload: {
        profileText:
          "Muškarac, 62 godine, HbA1c 8,1%, kreatinin 1,3 mg/dL, visina 178 cm, težina 92 kg.",
      },
    });
    expect(started.statusCode).toBe(200);
    const first = started.json();
    expect(first.status).toBe("needs_clarification");
    const answer = await app.inject({
      method: "POST",
      url: `/api/runs/${first.runId}/answer`,
      payload: { answer: "ne" },
    });
    expect(answer.json().runId).toBe(first.runId);
    expect(answer.json().status).toBe("ok");
    const hypothesis = await app.inject({
      method: "POST",
      url: `/api/runs/${first.runId}/hypothesis`,
      payload: { profileText: "A šta ako je HbA1c 9,0%?" },
    });
    expect(hypothesis.json().runId).toBe(first.runId);
  });
});
