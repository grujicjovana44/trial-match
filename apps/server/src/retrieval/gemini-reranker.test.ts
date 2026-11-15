import { describe, expect, it } from "vitest";
import { GeminiCandidateReranker } from "./gemini-reranker.js";

const candidates = [
  {
    id: "T-A#study",
    trialId: "T-A",
    kind: "study" as const,
    text: "Type 2 diabetes study",
  },
  {
    id: "T-A#inc-1",
    trialId: "T-A",
    kind: "passage" as const,
    text: "Adults with type 2 diabetes",
  },
];

describe("Gemini candidate reranker", () => {
  it("šalje jedan ograničen poziv sa strogim {id, score} izlazom", async () => {
    let calls = 0;
    let body: Record<string, unknown> | undefined;
    const reranker = new GeminiCandidateReranker(
      "synthetic-test-key",
      "gemini-3.5-flash-lite",
      async (_input, init) => {
        calls += 1;
        body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return new Response(
          JSON.stringify({
            candidates: [
              {
                finishReason: "STOP",
                content: {
                  parts: [
                    {
                      text: JSON.stringify([
                        { id: "T-A#study", score: 0.9 },
                        { id: "T-A#inc-1", score: 0.8 },
                      ]),
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200 },
        );
      },
    );

    await expect(reranker.rerank("type 2 diabetes", candidates)).resolves.toEqual(
      [
        { id: "T-A#study", score: 0.9 },
        { id: "T-A#inc-1", score: 0.8 },
      ],
    );
    expect(calls).toBe(1);
    expect(body).toMatchObject({
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        maxOutputTokens: 512,
      },
    });
    expect(JSON.stringify(body)).not.toContain("eligibility verdict");
  });

  it("odbija dodatna polja, duplirane i nepoznate ID-jeve", async () => {
    const reranker = new GeminiCandidateReranker(
      "synthetic-test-key",
      "gemini-3.5-flash-lite",
      async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                finishReason: "STOP",
                content: {
                  parts: [
                    {
                      text: JSON.stringify([
                        { id: "not-an-id", score: 0.9, verdict: "eligible" },
                        { id: "T-A#inc-1", score: 0.8 },
                      ]),
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200 },
        ),
    );
    await expect(
      reranker.rerank("type 2 diabetes", candidates),
    ).rejects.toThrow();
  });
});
