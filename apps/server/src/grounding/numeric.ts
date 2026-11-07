export function hasOnlyGroundedNumbers(
  explanation: string,
  allowedValues: number[],
): boolean {
  const matches = explanation.match(/(?<![A-Za-z])\d+(?:[.,]\d+)?/g) ?? [];
  return matches.every((match) => {
    const value = Number(match.replace(",", "."));
    return allowedValues.some((allowed) => Math.abs(allowed - value) < 0.011);
  });
}

export function safeExplanation(
  candidate: string,
  allowedValues: number[],
): string {
  return hasOnlyGroundedNumbers(candidate, allowedValues)
    ? candidate
    : "Prikazana je preliminarna provera dostupnih kriterijuma; detalje proverite u navedenim izvorima.";
}
