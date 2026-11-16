import { afterEach, describe, expect, it } from "vitest";
import {
  assertSupportedVectorPlatform,
  InMemoryVectorStore,
  openSQLiteVectorStore,
  type VectorStore,
} from "./vector-store.js";

const records = [
  {
    id: "study-b",
    trialId: "NCT00000002",
    kind: "study" as const,
    vector: [1, 0, 0],
  },
  {
    id: "passage-1",
    trialId: "NCT00000001",
    kind: "passage" as const,
    vector: [0, 1, 0],
  },
  {
    id: "study-a",
    trialId: "NCT00000001",
    kind: "study" as const,
    vector: [1, 0, 0],
  },
];

const stores: VectorStore[] = [];

afterEach(() => {
  for (const store of stores.splice(0)) store.close();
});

describe("VectorStore", () => {
  it("daje isti tačan top-k u memoriji i SQLite-u uz tie-break po ID-ju", async () => {
    const memory = new InMemoryVectorStore();
    const sqlite = await openSQLiteVectorStore(":memory:");
    stores.push(memory, sqlite);
    memory.upsert(records);
    sqlite.upsert(records);

    const memoryHits = memory.search([1, 0, 0], 2, "study");
    const sqliteHits = sqlite.search([1, 0, 0], 2, "study");

    expect(sqliteHits).toEqual(memoryHits);
    expect(sqliteHits.map((hit) => hit.id)).toEqual(["study-a", "study-b"]);
    expect(memory.search([1, 0, 0], 5, "passage")).toEqual(
      sqlite.search([1, 0, 0], 5, "passage"),
    );
  });

  it("odbija OS/CPU kombinaciju bez native paketa uz jasnu poruku", () => {
    expect(() => assertSupportedVectorPlatform("win32", "arm64")).toThrow(
      /ne podržava platformu win32\/arm64.*Windows x64/s,
    );
  });

  it("odbija neusklađene dimenzije i neispravne query limite", () => {
    const memory = new InMemoryVectorStore();
    memory.upsert([records[0]!]);

    expect(() => memory.search([1, 0], 1)).toThrow(/dimenzije/i);
    expect(() => memory.search([1, 0, 0], -1)).toThrow(/limit/i);
    memory.close();
  });
});
