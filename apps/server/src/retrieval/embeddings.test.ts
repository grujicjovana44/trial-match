import { describe, expect, it } from "vitest";
import {
  createOpenAIEmbeddingClient,
  OpenAIEmbeddingClient,
  parseEmbeddingConfig,
} from "./embeddings.js";
import { EMBEDDING_DIMENSIONS } from "./config.js";

const vector = Array.from({ length: EMBEDDING_DIMENSIONS }, (_, index) =>
  index === 0 ? 1 : 0,
);

function response(model = "text-embedding-3-small") {
  return new Response(
    JSON.stringify({
      data: [{ index: 0, embedding: vector }],
      model,
      usage: { prompt_tokens: 3 },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("OpenAI embeddings adapter", () => {
  it("dozvoljava samo odobreni model bez fallback-a", () => {
    expect(() =>
      parseEmbeddingConfig({
        OPENAI_API_KEY: "test-key",
        EMBEDDING_MODEL: "text-embedding-3-large",
      }),
    ).toThrow(/samo text-embedding-3-small/);
    expect(
      () => new OpenAIEmbeddingClient("test-key", "text-embedding-3-large"),
    ).toThrow(/samo text-embedding-3-small/);
  });

  it("šalje samo tekst, vraća dimenziju i broj tokena, ne beleži ključ", async () => {
    let requestBody: string | undefined;
    let authorization: string | undefined;
    const client = createOpenAIEmbeddingClient(
      {
        OPENAI_API_KEY: "test-key",
        EMBEDDING_MODEL: "text-embedding-3-small",
      },
      {
        maxRetries: 0,
        transport: async (_input, init) => {
          requestBody = String(init?.body);
          authorization =
            new Headers(init?.headers).get("Authorization") ?? undefined;
          return response();
        },
      },
    );

    await expect(client.embed(["type 2 diabetes"])).resolves.toEqual({
      vectors: [vector],
      dimensions: EMBEDDING_DIMENSIONS,
      tokens: 3,
    });
    expect(JSON.parse(requestBody ?? "{}")).toEqual({
      input: ["type 2 diabetes"],
      model: "text-embedding-3-small",
      encoding_format: "float",
    });
    expect(authorization).toBe("Bearer test-key");
  });

  it("greška eksplicitno odbija neočekivan model ili dimenziju odgovora", async () => {
    const wrongModel = new OpenAIEmbeddingClient(
      "test-key",
      "text-embedding-3-small",
      "https://api.openai.com/v1",
      async () => response("text-embedding-3-large"),
      1000,
      0,
    );
    await expect(wrongModel.embed(["x"])).rejects.toThrow(/umesto traženog/);

    const wrongDimensions = new OpenAIEmbeddingClient(
      "test-key",
      "text-embedding-3-small",
      "https://api.openai.com/v1",
      async () =>
        new Response(
          JSON.stringify({
            data: [{ index: 0, embedding: [1] }],
            model: "text-embedding-3-small",
            usage: { prompt_tokens: 1 },
          }),
          { status: 200 },
        ),
      1000,
      0,
    );
    await expect(wrongDimensions.embed(["x"])).rejects.toThrow(/dimenzija/);
  });

  it("ograničeno ponavlja HTTP 429/5xx i nevažeći JSON odgovor", async () => {
    for (const firstResponse of [
      new Response("busy", { status: 503 }),
      new Response("{", { status: 200 }),
    ]) {
      let calls = 0;
      const client = new OpenAIEmbeddingClient(
        "test-key",
        "text-embedding-3-small",
        "https://api.openai.com/v1",
        async () => {
          calls += 1;
          return calls === 1 ? firstResponse : response();
        },
        1000,
        1,
      );
      await expect(client.embed(["type 2 diabetes"])).resolves.toMatchObject({
        dimensions: EMBEDDING_DIMENSIONS,
      });
      expect(calls).toBe(2);
    }
  });
});
