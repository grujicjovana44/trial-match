import { describe, expect, it } from "vitest";
import { RunResponseSchema } from "../../../../packages/shared/src/index.js";
import { RunStore } from "./run-store.js";

const state = (runId: string, createdAt: number) => ({
  runId,
  profile: {},
  trials: [],
  response: RunResponseSchema.parse({
    runId,
    profile: null,
    derived: [],
    results: [],
    excludedTrials: [],
    explanation: "Nema izvora.",
    meta: {
      modelId: "mock",
      providerId: "mock",
      modelAttempts: 0,
      dataSnapshotDate: null,
      dataOrigin: "test",
      dataSynthetic: true,
      promptVersion: "test",
      schemaVersion: "test",
      dataVersion: "test",
      durationMs: 0,
      modelCalls: 0,
      toolCalls: 0,
      tokens: 0,
      demoMode: true,
    },
    status: "insufficient_evidence",
    stage: "completed",
    question: null,
    reason: "not_in_sources",
    error: null,
  }),
  questionRounds: 0,
  createdAt,
  availableSources: new Map(),
});

describe("memorijsko skladište izvršavanja", () => {
  it("izoluje stanje po runId i vraća undefined za nepoznato izvršavanje", () => {
    const store = new RunStore();
    expect(store.get("missing")).toBeUndefined();
    expect(store.size).toBe(0);
  });

  it("uklanja istekle zapise i prijavljuje njihove runId-jeve", () => {
    let now = 0;
    const store = new RunStore(() => now, 100, 10);
    store.set(state("expired", 0));
    store.set(state("current", 50));

    now = 100;
    expect(store.get("expired")).toBeUndefined();
    expect(store.get("current")?.runId).toBe("current");
    expect(store.prune()).toEqual([]);
    expect(store.size).toBe(1);
  });

  it("izbacuje najstariji zapis kada dostigne kapacitet", () => {
    const store = new RunStore(() => 0, 100, 2);
    store.set(state("first", 0));
    store.set(state("second", 0));

    expect(store.set(state("third", 0))).toEqual(["first"]);
    expect(store.get("first")).toBeUndefined();
    expect(store.size).toBe(2);
  });
});
