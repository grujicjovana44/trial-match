import { describe, expect, it } from "vitest";
import { RunStore } from "./run-store.js";

describe("memorijsko skladište izvršavanja", () => {
  it("izoluje stanje po runId i vraća undefined za nepoznato izvršavanje", () => {
    const store = new RunStore();
    expect(store.get("missing")).toBeUndefined();
    expect(store.size).toBe(0);
  });
});
