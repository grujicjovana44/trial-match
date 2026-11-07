import type { z } from "zod";
import type { RunBudget } from "../budget/run-budget.js";

export class StructuredOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StructuredOutputError";
  }
}

export class ModelRequestError extends Error {
  constructor(
    readonly statusCode: number | undefined,
    readonly timedOut = false,
  ) {
    super(
      timedOut
        ? "Poziv modela je istekao."
        : `Poziv modela nije uspeo (${statusCode ?? "nepoznat status"}).`,
    );
    this.name = "ModelRequestError";
  }
}

export async function retryModelRequest<T>(
  request: () => Promise<T>,
  options: {
    maxRetries: number;
    delaysMs: number[];
    sleep?: (milliseconds: number) => Promise<void>;
    onNetworkAttempt?: () => void;
  },
): Promise<T> {
  const sleep =
    options.sleep ??
    ((milliseconds) =>
      new Promise<void>((resolveSleep) =>
        setTimeout(resolveSleep, milliseconds),
      ));
  let retries = 0;
  for (;;) {
    options.onNetworkAttempt?.();
    try {
      return await request();
    } catch (error) {
      const retryable =
        error instanceof ModelRequestError &&
        (error.timedOut ||
          error.statusCode === 429 ||
          (error.statusCode !== undefined && error.statusCode >= 500));
      const delay = options.delaysMs[retries];
      if (!retryable || retries >= options.maxRetries || delay === undefined)
        throw error;
      retries += 1;
      await sleep(delay);
    }
  }
}

export async function generateStructured<T>(
  generate: (repair?: string) => Promise<unknown>,
  schema: z.ZodType<T>,
  onCall: () => void,
  budget?: RunBudget,
): Promise<T> {
  const call = (repair?: string) => {
    const request = async () => {
      onCall();
      return generate(repair);
    };
    return budget ? budget.runModelCall(request) : request();
  };
  const first = await call();
  const parsedFirst = schema.safeParse(first);
  if (parsedFirst.success) return parsedFirst.data;
  const repaired = await call(parsedFirst.error.message);
  const parsedRepaired = schema.safeParse(repaired);
  if (!parsedRepaired.success)
    throw new StructuredOutputError(
      "Strukturisani izlaz nije validan ni posle jednog pokušaja ispravke.",
    );
  return parsedRepaired.data;
}
