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
        excludedTrials: [],
        question: null,
        reason: null,
        error: null,
        explanation: "Rezultat.",
        meta: {
          modelId: "mock",
          providerId: "mock",
          modelAttempts: 0,
          dataSnapshotDate: null,
          dataOrigin: "fixture",
          dataSynthetic: true,
          promptVersion: "v1",
          schemaVersion: "2",
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

it("003: zahteva metapodatke, poreklo i isključenja na izlaznoj granici", async () => {
  const { okResponse } =
    await import("../../../apps/web/test/helpers/responses.js");
  const valid = okResponse();
  expect(RunResponseSchema.safeParse(valid).success).toBe(true);
  const { excludedTrials: _excluded, ...missing } = valid;
  void _excluded;
  expect(RunResponseSchema.safeParse(missing).success).toBe(false);
  expect(
    RunResponseSchema.safeParse({ ...valid, excludedTrials: valid.results })
      .success,
  ).toBe(false);
  expect(
    RunResponseSchema.safeParse({
      ...valid,
      meta: { ...valid.meta, dataSnapshotDate: "2026-02-30" },
    }).success,
  ).toBe(false);
});
