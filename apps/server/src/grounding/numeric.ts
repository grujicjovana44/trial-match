// Broj ne sme da počne odmah posle slova, cifre ili decimalnog separatora posle cifre
// (inače bi "NCT06449833" ili "A1c" dali lažne brojeve).
const NUMBER_PATTERN = String.raw`(?<![\p{L}\d])(?<!\d[.,])\d+(?:[.,]\d+)?`;

/** Jedinstveno izdvajanje brojeva; koristi se i za objašnjenje i za dozvoljene vrednosti. */
export function extractNumbers(text: string): number[] {
  return (text.match(new RegExp(NUMBER_PATTERN, "gu")) ?? [])
    .map((match) => Number(match.replace(",", ".")))
    .filter(Number.isFinite);
}

export function hasOnlyGroundedNumbers(
  explanation: string,
  allowedValues: number[],
): boolean {
  return extractNumbers(explanation).every((value) => {
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
