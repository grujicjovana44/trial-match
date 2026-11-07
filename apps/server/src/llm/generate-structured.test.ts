import { describe, expect, it } from "vitest";
import { z } from "zod";
import { RunBudget } from "../budget/run-budget.js";
import { generateStructured } from "./generate-structured.js";

describe("strukturisani izlaz", () => {
  it("validira runtime šemom i izvršava najviše jednu popravku", async () => {
    let calls = 0;
    const result = await generateStructured(
      async () => (++calls === 1 ? { value: "bad" } : { value: 2 }),
      z.object({ value: z.number() }),
      () => undefined,
    );
    expect(result.value).toBe(2);
    expect(calls).toBe(2);
  });

  it("naplaćuje i popravku iz zajedničkog budžeta", async () => {
    const budget = new RunBudget({
      maxModelCalls: 1,
      modelTimeoutMs: 20000,
      runTimeoutMs: 60000,
      startedAt: Date.now(),
    });
    let calls = 0;

    await expect(
      generateStructured(
        async () => (++calls === 1 ? { value: "bad" } : { value: 2 }),
        z.object({ value: z.number() }),
        () => undefined,
        budget,
      ),
    ).rejects.toMatchObject({ category: "model_call_limit" });
    expect(calls).toBe(1);
    expect(budget.modelCallCount).toBe(1);
  });
});
