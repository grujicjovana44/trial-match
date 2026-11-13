import { describe, expect, it } from "vitest";
import { redactTrace } from "./redact.js";

describe("minimalni tragovi", () => {
  it("zadržava dozvoljene metapodatke i odbacuje tajne i profilne podatke", () => {
    const trace = redactTrace({
      case_id: "EV-11",
      run_id: "run-1",
      status: "passed",
      execution_mode: "offline",
      model_id: "mock/offline",
      data_version: "synthetic-trials-v1",
      schema_version: "1.0.0",
      prompt_version: "demo.v1",
      commit: "abc123",
      api_key: "tajna-vrednost",
      environment: { API_KEY: "tajna-vrednost" },
      profile: { age: 62, stated_diagnoses: ["privatni podatak"] },
      chain_of_thought: "unutrašnje rezonovanje",
    });

    expect(Object.keys(trace)).toEqual([
      "case_id",
      "run_id",
      "status",
      "execution_mode",
      "model_id",
      "data_version",
      "schema_version",
      "prompt_version",
      "commit",
      "events",
    ]);
    expect(JSON.stringify(trace)).not.toContain("tajna-vrednost");
    expect(JSON.stringify(trace)).not.toContain("privatni podatak");
    expect(JSON.stringify(trace)).not.toContain("unutrašnje rezonovanje");
  });

  it("odbija trag bez obaveznih metapodataka", () => {
    expect(() => redactTrace({ case_id: "EV-11" })).toThrow();
  });
});
