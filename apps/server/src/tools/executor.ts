import { z } from "zod";
import {
  ProfileSchema,
  TrialSchema,
  TrialResultSchema,
  DerivedValueSchema,
  QuestionSchema,
  type Profile,
  type Trial,
  type TrialResult,
  type DerivedValue,
  type Question,
} from "../../../../packages/shared/src/index.js";
import {
  computeEgfr,
  EGFR_FORMULA_NAME,
  EGFR_SOURCE,
} from "../derived/egfr.js";
import { computeBmi, BMI_FORMULA_NAME, BMI_SOURCE } from "../derived/bmi.js";
import { selectNextQuestion } from "../questions/select-next-question.js";

export type ToolResult = { results: TrialResult[] };
export class ToolExecutionError extends Error {
  constructor(
    readonly category: string,
    message = "Obrada nije završena zbog greške alata.",
  ) {
    super(message);
    this.name = "ToolExecutionError";
  }
}
const EvaluateInputSchema = z
  .object({
    profile: ProfileSchema,
    trials: TrialSchema.array(),
    derived: DerivedValueSchema.array().optional(),
  })
  .strict();
const EgfrInput = z
  .object({
    age: z.number().int().min(0).max(120),
    sex: z.enum(["male", "female"]),
    creatinine: z
      .object({ value: z.number().min(0.1).max(20), unit: z.literal("mg/dL") })
      .strict(),
  })
  .strict();
const BmiInput = z
  .object({
    height: z
      .object({ value: z.number().min(50).max(250), unit: z.literal("cm") })
      .strict(),
    weight: z
      .object({ value: z.number().min(2).max(400), unit: z.literal("kg") })
      .strict(),
  })
  .strict();
const QuestionInput = z
  .object({
    profile: ProfileSchema,
    trials: TrialSchema.array(),
    results: TrialResultSchema.array(),
    derived: DerivedValueSchema.array().optional(),
  })
  .strict();
type ToolDefinition = {
  input: z.ZodType;
  output: z.ZodType;
  handler: (input: unknown) => unknown;
};
export class ToolExecutor {
  private calls = 0;
  private readonly tools: Map<string, ToolDefinition>;
  constructor(
    private readonly maxCalls: number,
    private readonly timeoutMs: number,
    evaluate: (
      profile: Profile,
      trials: Trial[],
      derived?: DerivedValue[],
    ) => TrialResult[],
    overrides: Record<string, (input: unknown) => unknown> = {},
  ) {
    this.tools = new Map<string, ToolDefinition>([
      [
        "compute_egfr",
        {
          input: EgfrInput,
          output: DerivedValueSchema,
          handler: (input) => ({
            name: "eGFR",
            value: computeEgfr(EgfrInput.parse(input)),
            unit: "mL/min/1.73 m²",
            formulaName: EGFR_FORMULA_NAME,
            sourceReference: EGFR_SOURCE,
          }),
        },
      ],
      [
        "compute_bmi",
        {
          input: BmiInput,
          output: DerivedValueSchema,
          handler: (input) => ({
            name: "BMI",
            value: computeBmi(BmiInput.parse(input)),
            unit: "kg/m²",
            formulaName: BMI_FORMULA_NAME,
            sourceReference: BMI_SOURCE,
          }),
        },
      ],
      [
        "evaluate_criteria",
        {
          input: EvaluateInputSchema,
          output: z.object({ results: TrialResultSchema.array() }).strict(),
          handler: (input) => {
            const p = EvaluateInputSchema.parse(input);
            return { results: evaluate(p.profile, p.trials, p.derived) };
          },
        },
      ],
      [
        "select_next_question",
        {
          input: QuestionInput,
          output: QuestionSchema.nullable(),
          handler: (input) => {
            const p = QuestionInput.parse(input);
            return (
              selectNextQuestion(p.profile, p.trials, p.results, p.derived) ??
              null
            );
          },
        },
      ],
    ]);
    for (const [name, handler] of Object.entries(overrides)) {
      const tool = this.tools.get(name);
      if (tool) tool.handler = handler;
    }
  }
  execute(
    name: "compute_egfr" | "compute_bmi",
    input: unknown,
  ): Promise<DerivedValue>;
  execute(
    name: "select_next_question",
    input: unknown,
  ): Promise<Question | null>;
  execute(name: string, input: unknown): Promise<ToolResult>;
  async execute(name: string, input: unknown): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) throw new ToolExecutionError("unknown_tool");
    const parsed = tool.input.safeParse(input);
    if (!parsed.success) throw new ToolExecutionError("invalid_tool_arguments");
    if (this.calls >= this.maxCalls)
      throw new ToolExecutionError("tool_call_limit");
    this.calls++;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const value = await Promise.race([
        Promise.resolve().then(() => tool.handler(parsed.data)),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new ToolExecutionError("tool_timeout")),
            this.timeoutMs,
          );
        }),
      ]);
      const output = tool.output.safeParse(value);
      if (!output.success) throw new ToolExecutionError("invalid_tool_result");
      return output.data;
    } catch (error) {
      if (error instanceof ToolExecutionError) throw error;
      throw new ToolExecutionError("tool_error");
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  get callCount(): number {
    return this.calls;
  }
}
