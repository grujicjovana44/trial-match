import { describe, expect, it } from "vitest";
import { copy } from "../../src/copy.js";

// Interni nazivi statusa, ishoda, polja i kategorija grešaka (research.md, R-02 i data-model.md).
const internalNames = [
  "needs_clarification",
  "insufficient_evidence",
  "no_matching_trial",
  "not_in_sources",
  "rejected",
  "candidate",
  "pending",
  "excluded",
  "not_met",
  "unknown",
  "true",
  "false",
  "null",
  "undefined",
  "model_timeout",
  "model_call_limit",
  "tool_call_limit",
  "unknown_tool",
  "invalid_tool_arguments",
  "tool_error",
  "question_round_limit",
  "input_too_large",
  "run_not_found",
  "invalid_request",
  "invalid_profile",
  "invalid_hypothesis",
  "invalid_transition",
  "forbidden_intent",
  "ambiguous_hypothesis",
  "rate_limit_exceeded",
  "internal_error",
  "internal_contract_violation",
];

type Callable = (...args: (number | string)[]) => unknown;

// Prikuplja sve tekstove iz `copy`. Funkcije se pozivaju sa brojem i tekstom kao argumentima.
function collectTexts(value: unknown, out: string[]): void {
  if (typeof value === "string") {
    out.push(value);
    return;
  }
  if (typeof value === "function") {
    const fn = value as Callable;
    for (const sample of [1, "x"]) {
      const args = Array.from({ length: fn.length }, () => sample);
      out.push(String(fn(...args)));
    }
    return;
  }
  if (typeof value === "object" && value !== null) {
    for (const nested of Object.values(value)) collectTexts(nested, out);
  }
}

describe("tekstovi interfejsa", () => {
  it("nijedan tekst ne sadrži interni naziv kao celu reč", () => {
    const texts: string[] = [];
    collectTexts(copy, texts);
    expect(texts.length).toBeGreaterThan(0);
    for (const text of texts) {
      for (const name of internalNames) {
        const pattern = new RegExp(`\\b${name}\\b`);
        expect(pattern.test(text), `„${name}“ u tekstu „${text}“`).toBe(false);
      }
    }
  });

  it("nazivi dugmadi i polja su tačni", () => {
    expect(copy.form.label).toBe("Opis profila ili pitanje");
    expect(copy.form.submit).toBe("Proveri kriterijume");
    expect(copy.clarify.submit).toBe("Pošalji dopunu");
    expect(copy.hypothesis.submit).toBe("Ponovi proveru");
  });
});
