import { describe, expect, it } from "vitest";
import { evaluateRagasStyle } from "./ragas.js";

describe("RAGAS-style evaluator", () => {
  it("calculates all four metrics from deterministic offline inputs", () => {
    expect(
      evaluateRagasStyle({
        question: "type 2 diabetes kidney disease",
        answer: "type 2 diabetes and kidney disease",
        answerClaims: ["type 2 diabetes", "kidney disease"],
        contexts: [
          "Adults with type 2 diabetes.",
          "Kidney disease is described in the study.",
        ],
        referenceFacts: ["type 2 diabetes", "kidney disease"],
      }),
    ).toEqual({
      faithfulness: 1,
      answerRelevancy: 1,
      contextPrecision: 1,
      contextRecall: 1,
    });
  });

  it("does not turn empty denominators into a successful score", () => {
    expect(
      evaluateRagasStyle({
        question: "diabetes",
        answer: "",
        answerClaims: [],
        contexts: [],
        referenceFacts: [],
      }),
    ).toEqual({
      faithfulness: null,
      answerRelevancy: 0,
      contextPrecision: null,
      contextRecall: null,
    });
  });
});
