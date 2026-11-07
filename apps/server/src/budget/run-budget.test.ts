import { describe, expect, it } from "vitest";
import {
  ModelRequestError,
  retryModelRequest,
} from "../llm/generate-structured.js";
import { RunBudget, RunBudgetError } from "./run-budget.js";

const createBudget = (
  overrides: Partial<ConstructorParameters<typeof RunBudget>[0]> = {},
) =>
  new RunBudget({
    maxModelCalls: 4,
    modelTimeoutMs: 20000,
    runTimeoutMs: 60000,
    startedAt: 0,
    now: () => 1,
    ...overrides,
  });

describe("budžet izvršavanja", () => {
  it("dozvoljava najviše četiri naplativa poziva modela", async () => {
    const budget = createBudget();
    for (let index = 0; index < 4; index += 1)
      await budget.runModelCall(async () => "odgovor");

    await expect(
      budget.runModelCall(async () => "višak"),
    ).rejects.toMatchObject({
      category: "model_call_limit",
    });
    expect(budget.modelCallCount).toBe(4);
  });

  it("prekida pojedinačni poziv po isteku vremena i odbija prekoračen run", async () => {
    const modelBudget = createBudget({ modelTimeoutMs: 5 });
    await expect(
      modelBudget.runModelCall(() => new Promise<never>(() => undefined)),
    ).rejects.toMatchObject({ category: "model_timeout" });

    const runBudget = createBudget({ now: () => 60000 });
    expect(runBudget.isRunTimedOut()).toBe(true);
    await expect(
      runBudget.runModelCall(async () => "neće biti pozvano"),
    ).rejects.toBeInstanceOf(RunBudgetError);
  });

  it("mrežni pokušaji ne troše budžet naplativih poziva", async () => {
    const budget = createBudget();
    let attempts = 0;
    await budget.runModelCall(() =>
      retryModelRequest(
        async () => {
          attempts += 1;
          if (attempts < 3) throw new ModelRequestError(429);
          return "uspeh";
        },
        {
          maxRetries: 2,
          delaysMs: [0, 0],
          sleep: async () => undefined,
          onNetworkAttempt: () => budget.recordNetworkAttempt(),
        },
      ),
    );

    expect(budget.modelCallCount).toBe(1);
    expect(budget.networkAttemptCount).toBe(3);
  });
});
