import { createApp } from "../../apps/server/src/api/app.js";
import { parseConfig } from "../../apps/server/src/config/index.js";
import { ProfileSchema } from "../../packages/shared/src/index.js";
import {
  ToolExecutionError,
  ToolExecutor,
} from "../../apps/server/src/tools/executor.js";
import { evaluateCriteria } from "../../apps/server/src/matcher/evaluate-criteria.js";
import { verifyCitation } from "../../apps/server/src/citations/verify.js";
import {
  retryModelRequest,
  ModelRequestError,
  generateStructured,
  StructuredOutputError,
} from "../../apps/server/src/llm/generate-structured.js";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}
async function rejects(
  promise: Promise<unknown>,
  category?: string,
): Promise<void> {
  try {
    await promise;
  } catch (error) {
    if (
      category &&
      (!(error instanceof ToolExecutionError) || error.category !== category)
    )
      throw new Error("Fault category mismatch.");
    return;
  }
  throw new Error("Expected controlled fault.");
}
export async function runOfflineCase(caseId: string): Promise<string> {
  if (caseId === "EV-11") {
    const app = createApp({
      config: parseConfig({ NODE_ENV: "test", DEMO_MODE: "true" }),
    });
    try {
      const long = await app.inject({
        method: "POST",
        url: "/api/runs",
        payload: { profileText: "x".repeat(4001) },
      });
      assert(long.statusCode === 413, "Input limit not enforced.");
    } finally {
      await app.close();
    }
    return "Input guard returned 413.";
  }
  if (caseId === "EV-12") {
    let calls = 0;
    try {
      await generateStructured(
        async () => ({ age: "invalid" }),
        ProfileSchema,
        () => {
          calls++;
        },
      );
    } catch (error) {
      assert(
        error instanceof StructuredOutputError,
        "Repair fault not controlled.",
      );
    }
    assert(calls === 2, "Expected one repair.");
    return "Invalid structured output allowed exactly one repair.";
  }
  if (caseId === "EV-13") {
    assert(
      !verifyCitation(
        { sourceId: "outside", quote: "x" },
        new Map([["allowed", "quote"]]),
      ),
      "Outside citation was accepted.",
    );
    return "Outside source was rejected.";
  }
  if (caseId === "EV-14") {
    const tools = new ToolExecutor(10, 2000, () => []);
    await rejects(tools.execute("unknown", {}), "unknown_tool");
    await rejects(
      tools.execute("compute_egfr", { age: -1 }),
      "invalid_tool_arguments",
    );
    assert(tools.callCount === 0, "Rejected tool was counted.");
    return "Unknown tool and invalid input failed before handler.";
  }
  if (caseId === "EV-15") {
    let attempts = 0;
    const delays: number[] = [];
    try {
      await retryModelRequest(
        async () => {
          attempts++;
          throw new ModelRequestError(429);
        },
        {
          maxRetries: 2,
          delaysMs: [500, 1500],
          sleep: async (ms) => {
            delays.push(ms);
          },
        },
      );
    } catch {
      /* expected */
    }
    assert(
      attempts === 3 && delays.join(",") === "500,1500",
      "Retry cap mismatch.",
    );
    return "429 retry limit is two.";
  }
  if (caseId === "EV-16") {
    const tools = new ToolExecutor(10, 2000, evaluateCriteria, {
      compute_egfr: () => {
        throw new RangeError("fault");
      },
    });
    await rejects(
      tools.execute("compute_egfr", {
        age: 62,
        sex: "male",
        creatinine: { value: 1.3, unit: "mg/dL" },
      }),
      "tool_error",
    );
    assert(tools.callCount === 1, "eGFR fault was not the tool call.");
    return "Injected failure originated in compute_egfr handler.";
  }
  throw new Error(`No offline case ${caseId}.`);
}
