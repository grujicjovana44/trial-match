import { describe, expect, it } from "vitest";
import { rankResults } from "./rank-results.js";

describe("rangiranje prikaza", () => {
  it("sortira po presudi, udelu ispunjenih uslova i rastućem ID-ju", () => {
    const row = (
      trialId: string,
      verdict: "candidate" | "pending" | "excluded",
      met: number,
    ): never =>
      ({
        trialId,
        title: trialId,
        verdict,
        criteria: Array.from({ length: 2 }, (_, index) => ({
          id: `${trialId}-${index}`,
          text: "Kriterijum",
          status: index < met ? "met" : "unknown",
          observedValue: null,
          sourceId: `${trialId}-${index}`,
          citation: { sourceId: `${trialId}-${index}`, quote: "Kriterijum" },
        })),
      }) as never;
    expect(
      rankResults([
        row("b", "candidate", 1),
        row("A", "candidate", 1),
        row("C", "pending", 2),
      ])[0]?.trialId,
    ).toBe("A");
  });
});
