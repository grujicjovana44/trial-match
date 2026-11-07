import { readFile } from "node:fs/promises";
import { z } from "zod";

export const EvaluationCaseSchema = z
  .object({
    case_id: z.string().regex(/^EV-\d{2}$/),
    purpose: z.string().min(1),
    execution_mode: z.enum(["real_model", "offline", "simulated_fault"]),
    input: z.string().min(1),
    initial_state: z.unknown(),
    versions: z.object({ data: z.string(), schema: z.string() }).strict(),
    expected_properties: z.record(z.string(), z.unknown()),
    forbidden_outcomes: z.array(z.string()),
    critical_boundary: z.string().min(1),
    verification_method: z.string().min(1),
  })
  .strict();

export type EvaluationCase = z.infer<typeof EvaluationCaseSchema>;

export async function loadCases(
  filePath = "eval/cases.jsonl",
): Promise<EvaluationCase[]> {
  const contents = await readFile(filePath, "utf8");
  const cases = contents
    .split(/\r?\n/u)
    .filter((line) => line.trim().length > 0)
    .map((line, index) => {
      let value: unknown;
      try {
        value = JSON.parse(line);
      } catch (error) {
        throw new Error(`Neispravan JSON u ${filePath}, red ${index + 1}.`, {
          cause: error,
        });
      }
      return EvaluationCaseSchema.parse(value);
    });
  const ids = new Set(cases.map((item) => item.case_id));
  if (cases.length !== 16 || ids.size !== cases.length) {
    throw new Error(
      `Skup mora sadržati tačno 16 slučajeva sa jedinstvenim ID-jevima; pronađeno ${cases.length}.`,
    );
  }
  return cases;
}
