import { describe, expect, it } from "vitest";
import { commandOptions } from "./rag-offline.js";

describe("RAG offline evaluator opcije", () => {
  it("podrazumevani reranker nije postavljen (deterministički)", () => {
    expect(commandOptions([]).reranker).toBeUndefined();
    expect(
      commandOptions(["--reranker", "deterministic"]).reranker,
    ).toBe("deterministic");
  });

  it("prihvata --reranker cohere uz stvarne embeddings", () => {
    const options = commandOptions([
      "--embedding-mode",
      "real",
      "--reranker",
      "cohere",
    ]);
    expect(options.reranker).toBe("cohere");
    expect(options.embeddingMode).toBe("real");
  });

  it("prihvata --reranker=cohere uz --embedding-mode=real", () => {
    const options = commandOptions([
      "--embedding-mode=real",
      "--reranker=cohere",
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
});
