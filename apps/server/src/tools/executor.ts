import { z } from "zod";
import {
  ProfileSchema,
  TrialSchema,
  type Profile,
  type Trial,
  type TrialResult,
} from "../../../../packages/shared/src/index.js";

export type ToolName = "evaluate_criteria";
export type ToolResult = { results: TrialResult[] };
type ToolHandler = (input: unknown) => Promise<ToolResult> | ToolResult;

export class ToolExecutionError extends Error {
  constructor(
    readonly category: string,
    message: string,
  ) {
    super(message);
    this.name = "ToolExecutionError";
  }
}

const EvaluateInputSchema = z
  .object({
    profile: ProfileSchema,
    trials: TrialSchema.array(),
  })
  .strict();

export class ToolExecutor {
  private calls = 0;
  private readonly tools = new Map<
    ToolName,
    { schema: z.ZodType; handler: ToolHandler }
  >();

  constructor(
    private readonly maxCalls: number,
    private readonly timeoutMs: number,
    evaluate: (profile: Profile, trials: Trial[]) => TrialResult[],
  ) {
    this.tools.set("evaluate_criteria", {
      schema: EvaluateInputSchema,
      handler: (input) => {
        const parsed = EvaluateInputSchema.parse(input);
        return { results: evaluate(parsed.profile, parsed.trials) };
      },
    });
  }

  async execute(name: string, input: unknown): Promise<ToolResult> {
    if (name !== "evaluate_criteria")
      throw new ToolExecutionError("unknown_tool", "Nepoznat alat.");
    const tool = this.tools.get(name);
    if (!tool) throw new ToolExecutionError("unknown_tool", "Nepoznat alat.");
    if (this.calls >= this.maxCalls)
      throw new ToolExecutionError(
        "tool_call_limit",
        "Dostignuto je ograničenje poziva alata.",
      );
    const parsed = tool.schema.safeParse(input);
    if (!parsed.success)
      throw new ToolExecutionError(
        "invalid_tool_arguments",
        "Argumenti alata nisu validni.",
      );
    this.calls += 1;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        Promise.resolve(tool.handler(parsed.data)),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                new ToolExecutionError(
                  "tool_timeout",
                  "Provera alata je istekla.",
                ),
              ),
            this.timeoutMs,
          );
        }),
      ]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  get callCount(): number {
    return this.calls;
  }
}
