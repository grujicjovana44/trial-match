import { describe, expect, it } from "vitest";
import {
  commandOptions,
  estimateLiveCalls,
  runOfflineRagEvaluation,
} from "./rag-offline.js";

describe("RAG offline evaluator opcije", () => {
  it("podrazumevani reranker nije postavljen (deterministički)", () => {
    expect(commandOptions([]).reranker).toBeUndefined();
    expect(commandOptions(["--reranker", "deterministic"]).reranker).toBe(
      "deterministic",
    );
  });

  it("prihvata --reranker cohere uz stvarne embeddings", () => {
    const options = commandOptions([
      "--embedding-mode",
      "real",
      "--reranker",
      "cohere",
      "--confirm-live",
    ]);
    expect(options.reranker).toBe("cohere");
    expect(options.embeddingMode).toBe("real");
  });

  it("prihvata --reranker=cohere uz --embedding-mode=real", () => {
    const options = commandOptions([
      "--embedding-mode=real",
      "--reranker=cohere",
      "--confirm-live",
    ]);
    expect(options.reranker).toBe("cohere");
  });

  it("odbija nepoznatu vrednost reranker opcije", () => {
    expect(() => commandOptions(["--reranker", "bogus"])).toThrow(
      /--reranker mora biti/,
    );
    expect(() => commandOptions(["--reranker"])).toThrow(
      /--reranker mora biti/,
    );
  });

  it("odbija cohere uz lažni ili podrazumevani embedding režim", () => {
    expect(() =>
      commandOptions(["--embedding-mode", "fake", "--reranker", "cohere"]),
    ).toThrow(/zahteva --embedding-mode real/);
    expect(() => commandOptions(["--reranker=cohere"])).toThrow(
      /zahteva --embedding-mode real/,
    );
  });

  it("odbija stvarni embedding režim bez --confirm-live", () => {
    expect(() => commandOptions(["--embedding-mode", "real"])).toThrow(
      /zahteva izričito --confirm-live/,
    );
    expect(() =>
      commandOptions(["--embedding-mode=real", "--reranker=cohere"]),
    ).toThrow(/zahteva izričito --confirm-live/);
  });

  it("prihvata stvarni embedding režim uz --confirm-live", () => {
    const options = commandOptions([
      "--embedding-mode",
      "real",
      "--confirm-live",
    ]);
    expect(options.confirmLive).toBe(true);
    expect(options.embeddingMode).toBe("real");
  });

  it("odbija --confirm-live u lažnom ili podrazumevanom režimu", () => {
    expect(() =>
      commandOptions(["--embedding-mode", "fake", "--confirm-live"]),
    ).toThrow(/nema smisla/);
    expect(() => commandOptions(["--confirm-live"])).toThrow(/nema smisla/);
  });

  it("runner odbija stvarni režim bez potvrde pre čitanja skupa podataka", async () => {
    await expect(
      runOfflineRagEvaluation({
        embeddingMode: "real",
        datasetPath: "ne-postoji.json",
      }),
    ).rejects.toThrow(/--confirm-live/);
  });

  it("procena poziva broji samo upite koji nisu u kešu", () => {
    const profile = {
      age: 62,
      sex: "male",
      hba1c: { value: 8.1, unit: "%" },
    };
    const cached = new Set<string>();
    const store = {
      getCachedEmbedding: (_model: string, hash: string) =>
        cached.has(hash) ? [0] : undefined,
    };
    const cold = estimateLiveCalls([{ profile }], store, "m", true);
    expect(cold.maxEmbeddingRequests).toBe(1);
    expect(cold.maxCohereCalls).toBe(1);
    expect(cold.uncachedQueryTexts).toBe(cold.totalQueryTexts);
    const warm = estimateLiveCalls(
      [{ profile }],
      { getCachedEmbedding: () => [0] },
      "m",
      false,
    );
    expect(warm.maxEmbeddingRequests).toBe(0);
    expect(warm.uncachedQueryTexts).toBe(0);
    expect(warm.maxCohereCalls).toBe(0);
  });
});
