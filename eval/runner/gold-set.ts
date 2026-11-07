import { z } from "zod";

const GoldCaseSchema = z
  .object({
    case_id: z.string().min(1),
    input: z.string().min(1),
    expected: z.record(z.string(), z.unknown()),
  })
  .strict();

export type GoldCase = z.infer<typeof GoldCaseSchema>;

export function parseGoldSet(contents: string): GoldCase[] {
  const lines = contents.split(/\r?\n/u).filter(Boolean);
  const cases = lines.map((line, index) => {
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch (error) {
      throw new Error(`JSON greška u zlatnom skupu, red ${index + 1}.`, {
        cause: error,
      });
    }
    return GoldCaseSchema.parse(value);
  });
  const ids = new Set(cases.map((item) => item.case_id));
  if (cases.length === 0 || ids.size !== cases.length)
    throw new Error("Zlatni skup je prazan ili ima duplirane ID-jeve.");
  return cases;
}

export function calculateGoldMetrics(
  cases: GoldCase[],
  extract: (input: string) => object,
) {
  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;

  for (const item of cases) {
    const actual = Object.fromEntries(Object.entries(extract(item.input)));
    const expectedKeys = Object.keys(item.expected);
    const actualKeys = Object.keys(actual).filter(
      (key) => key !== "provenance" && key !== "ambiguities",
    );
    for (const key of expectedKeys) {
      if (JSON.stringify(actual[key]) === JSON.stringify(item.expected[key]))
        truePositive += 1;
      else falseNegative += 1;
    }
    falsePositive += actualKeys.filter(
      (key) => !expectedKeys.includes(key),
    ).length;
  }

  const precision =
    truePositive + falsePositive === 0
      ? null
      : truePositive / (truePositive + falsePositive);
  const recall =
    truePositive + falseNegative === 0
      ? null
      : truePositive / (truePositive + falseNegative);
  return {
    cases: cases.length,
    true_positive: truePositive,
    false_positive: falsePositive,
    false_negative: falseNegative,
    precision,
    recall,
    note:
      precision === null || recall === null
        ? "Metrika nije izračunljiva za prazan skup."
        : "Samo sintetički parser razvojni skup; nije statistička potvrda.",
  };
}
