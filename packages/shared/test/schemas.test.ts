import { describe, expect, it } from "vitest";
import { ProfileSchema, RunResponseSchema } from "../src/index.js";

describe("zajedničke runtime šeme", () => {
  it("ne popunjava polja koja nedostaju podrazumevanim vrednostima", () => {
    expect(ProfileSchema.parse({})).toEqual({});
  });

  it("odbacuje nepoznata polja i vrednosti van tehničkih granica", () => {
    expect(ProfileSchema.safeParse({ age: -5 }).success).toBe(false);
    expect(ProfileSchema.safeParse({ age: 40, patientId: "x" }).success).toBe(
      false,
    );
  });

  it("odbacuje neusaglašene statusne odgovore", () => {
    expect(
      RunResponseSchema.safeParse({
        runId: "r1",
        status: "ok",
        stage: "failed",
        profile: {},
        derived: [],
        results: [],
        question: null,
        reason: null,
        error: null,
        explanation: "Rezultat.",
        meta: {
          modelId: "mock",
          promptVersion: "v1",
          schemaVersion: "1",
          dataVersion: "fixture-v1",
          durationMs: 0,
          modelCalls: 0,
          toolCalls: 0,
          tokens: null,
          demoMode: true,
        },
      }).success,
    ).toBe(false);
  });
});
