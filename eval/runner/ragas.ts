export type RagasSample = {
  question: string;
  answer: string;
  answerClaims: string[];
  contexts: string[];
  referenceFacts: string[];
};

export type RagasStyleMetrics = {
  faithfulness: number | null;
  answerRelevancy: number | null;
  contextPrecision: number | null;
  contextRecall: number | null;
};

function tokens(value: string): Set<string> {
  const stopWords = new Set([
    "and",
    "or",
    "the",
    "with",
    "for",
    "of",
    "a",
    "an",
  ]);
  return new Set(
    value
      .toLocaleLowerCase("en")
      .match(/[\p{Letter}\p{Number}]+/gu)
      ?.filter((token) => token.length > 1 && !stopWords.has(token)) ?? [],
  );
}

function overlapRatio(left: string, right: string): number {
  const leftTokens = tokens(left);
  if (leftTokens.size === 0) return 0;
  const rightTokens = tokens(right);
  let matches = 0;
  for (const token of leftTokens) if (rightTokens.has(token)) matches += 1;
  return matches / leftTokens.size;
}

function mean(values: readonly number[]): number | null {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
}

export function evaluateRagasStyle(sample: RagasSample): RagasStyleMetrics {
  const supportedClaims = sample.answerClaims.map((claim) =>
    sample.contexts.some((context) => overlapRatio(claim, context) >= 0.5)
      ? 1
      : 0,
  );
  const contextRelevance = sample.contexts.map((context) =>
    overlapRatio(sample.question, context) > 0 ? 1 : 0,
  );
  const referenceCoverage = sample.referenceFacts.map((fact) =>
    sample.contexts.some((context) => overlapRatio(fact, context) >= 0.5)
      ? 1
      : 0,
  );

  return {
    faithfulness: mean(supportedClaims),
    answerRelevancy: overlapRatio(sample.answer, sample.question),
    contextPrecision: mean(contextRelevance),
    contextRecall: mean(referenceCoverage),
  };
}
