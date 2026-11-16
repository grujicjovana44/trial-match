import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import type { z } from "zod";
import type { LlmAdapter, AdapterRequest } from "./adapter.js";
import {
  ModelRequestError,
  StructuredOutputError,
} from "./generate-structured.js";
import { RunBudgetError } from "../budget/run-budget.js";
import type { AppConfig } from "../config/index.js";

export type ExecutionEvent = {
  step: string;
  attempt?: number;
  tool?: string;
  durationMs: number;
  outcome: string;
  inputTokens?: number;
  outputTokens?: number;
  promptVersion?: string;
  promptHash?: string;
  sourceIds?: string[];
};
export class ModelSession {
  calls = 0;
  attempts = 0;
  tokens: number | null = 0;
  toolCalls = 0;
  readonly events: ExecutionEvent[] = [];
  constructor(
    readonly createdAt: number,
    private readonly config: AppConfig,
    private readonly now: () => number = Date.now,
  ) {}
  remaining(): number {
    return this.config.RUN_TIMEOUT_MS - (this.now() - this.createdAt);
  }
  assertTime(): void {
    if (this.remaining() <= 0) throw new RunBudgetError("run_timeout");
  }
  async generate<T>(
    adapter: LlmAdapter,
    promptId: AdapterRequest["promptId"],
    input: unknown,
    schema: z.ZodType<T>,
    validate?: (value: T) => void,
  ): Promise<T> {
    const instruction = readFileSync(`prompts/${promptId}`, "utf8");
    for (let repair = 0; repair < 2; repair++) {
      this.assertTime();
      if (this.calls >= this.config.MAX_MODEL_CALLS_PER_RUN)
        throw new RunBudgetError("model_call_limit");
      this.calls++;
      let candidate: unknown;
      for (let retry = 0; ; retry++) {
        this.assertTime();
        const controller = new AbortController();
        const start = this.now();
        const timeoutMs = Math.min(
          this.config.MODEL_TIMEOUT_MS,
          this.remaining(),
        );
        let timer: ReturnType<typeof setTimeout> | undefined;
        this.attempts++;
        const event: ExecutionEvent = {
          step: "model",
          attempt: this.attempts,
          durationMs: 0,
          outcome: "started",
          promptVersion: promptId,
          promptHash: createHash("sha256").update(instruction).digest("hex"),
        };
        this.events.push(event);
        try {
          const result = await Promise.race([
            adapter.generate(
              {
                promptId,
                instruction,
                input,
                schema,
                ...(repair
                  ? {
                      repair:
                        "Vrati ispravan izlaz iste šeme bez dodavanja podataka.",
                    }
                  : {}),
              },
              { signal: controller.signal, deadline: start + timeoutMs },
            ),
            new Promise<never>((_, reject) => {
              timer = setTimeout(() => {
                controller.abort();
                reject(new ModelRequestError(undefined, true));
              }, timeoutMs);
            }),
          ]);
          this.assertTime();
          this.tokens =
            this.tokens === null || result.usage === null
              ? null
              : this.tokens +
                result.usage.inputTokens +
                result.usage.outputTokens;
          if (result.usage) {
            event.inputTokens = result.usage.inputTokens;
            event.outputTokens = result.usage.outputTokens;
          }
          event.outcome = result.finish;
          candidate = result.finish === "complete" ? result.candidate : null;
          break;
        } catch (error) {
          event.outcome = "failed";
          this.tokens = null;
          const retryable =
            error instanceof ModelRequestError &&
            (error.timedOut ||
              error.statusCode === 429 ||
              (error.statusCode !== undefined &&
                error.statusCode >= 500 &&
                error.statusCode <= 599));
          if (!retryable || retry >= this.config.MAX_RETRIES) throw error;
          const delay = retry === 0 ? 500 : 1500;
          if (this.remaining() <= delay)
            throw new RunBudgetError("run_timeout");
          await new Promise((resolve) => setTimeout(resolve, delay));
        } finally {
          if (timer) clearTimeout(timer);
          event.durationMs = Math.max(0, this.now() - start);
        }
      }
      const parsed = schema.safeParse(candidate);
      if (parsed.success) {
        try {
          validate?.(parsed.data);
          return parsed.data;
        } catch {
          /* Business validation participates in the single repair budget. */
        }
      }
    }
    throw new StructuredOutputError("Odgovor modela nije prošao proveru.");
  }
}
