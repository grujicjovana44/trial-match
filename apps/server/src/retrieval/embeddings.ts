import { z } from "zod";
import {
  DEFAULT_EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MAX_RETRIES,
  EMBEDDING_MODEL_ALLOWLIST,
  EMBEDDING_TIMEOUT_MS,
} from "./config.js";

const EmbeddingEnvironmentSchema = z
  .object({
    OPENAI_API_KEY: z.string().trim().min(1, "OPENAI_API_KEY nije podešen."),
    EMBEDDING_MODEL: z
      .enum(EMBEDDING_MODEL_ALLOWLIST)
      .default(DEFAULT_EMBEDDING_MODEL),
    OPENAI_BASE_URL: z.string().url().optional(),
  })
  .strict();

const EmbeddingResponseSchema = z
  .object({
    data: z
      .array(
        z
          .object({
            index: z.number().int().nonnegative(),
            embedding: z.array(z.number().finite()).min(1),
          })
          .passthrough(),
      )
      .min(1),
    model: z.string(),
    usage: z
      .object({ prompt_tokens: z.number().int().nonnegative() })
      .passthrough(),
  })
  .passthrough();

export type EmbeddingFailureReason =
  | "embedding_timeout"
  | "embedding_http_429"
  | `embedding_http_${number}`
  | "embedding_invalid"
  | "embedding_network_error"
  | "embedding_error";

export class EmbeddingError extends Error {
  constructor(
    readonly reason: EmbeddingFailureReason,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "EmbeddingError";
  }
}

class NonRetryableEmbeddingError extends EmbeddingError {}

export function embeddingFailureReason(error: unknown): EmbeddingFailureReason {
  if (error instanceof EmbeddingError) return error.reason;
  if (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  )
    return "embedding_timeout";
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "ETIMEDOUT" || error.code === "ABORT_ERR")
  )
    return "embedding_timeout";
  return "embedding_error";
}

export type EmbeddingConfig = z.infer<typeof EmbeddingEnvironmentSchema>;
export type EmbeddingBatch = {
  vectors: number[][];
  dimensions: number;
  tokens: number;
};

export interface Embedder {
  readonly model: string;
  embed(input: readonly string[]): Promise<EmbeddingBatch>;
}

export function parseEmbeddingConfig(
  env: NodeJS.ProcessEnv = process.env,
): EmbeddingConfig {
  const rawModel = env.EMBEDDING_MODEL;
  if (
    rawModel !== undefined &&
    !EMBEDDING_MODEL_ALLOWLIST.some((model) => model === rawModel)
  ) {
    throw new Error(
      `Embedding model '${rawModel}' nije dozvoljen. Dozvoljen je samo ${DEFAULT_EMBEDDING_MODEL}.`,
    );
  }
  const config = EmbeddingEnvironmentSchema.safeParse({
    OPENAI_API_KEY: env.OPENAI_API_KEY,
    EMBEDDING_MODEL: rawModel,
    ...(env.OPENAI_BASE_URL === undefined
      ? {}
      : { OPENAI_BASE_URL: env.OPENAI_BASE_URL }),
  });
  if (!config.success) {
    const firstIssue = config.error.issues[0];
    throw new Error(
      firstIssue?.message ?? "OpenAI embeddings konfiguracija nije ispravna.",
    );
  }
  return config.data;
}

export class OpenAIEmbeddingClient implements Embedder {
  readonly model: string;
  private readonly baseUrl: string;

  constructor(
    private readonly apiKey: string,
    model: string = DEFAULT_EMBEDDING_MODEL,
    baseUrl = "https://api.openai.com/v1",
    private readonly transport: typeof fetch = fetch,
    private readonly timeoutMs = EMBEDDING_TIMEOUT_MS,
    private readonly maxRetries = EMBEDDING_MAX_RETRIES,
  ) {
    if (!EMBEDDING_MODEL_ALLOWLIST.some((allowed) => allowed === model))
      throw new Error(
        `Embedding model '${model}' nije dozvoljen. Dozvoljen je samo ${DEFAULT_EMBEDDING_MODEL}.`,
      );
    if (!apiKey.trim())
      throw new Error("OpenAI embeddings zahtevaju OPENAI_API_KEY.");
    const parsedBaseUrl = new URL(baseUrl);
    if (
      parsedBaseUrl.protocol !== "https:" &&
      !["localhost", "127.0.0.1", "[::1]"].includes(parsedBaseUrl.hostname)
    )
      throw new Error("OPENAI_BASE_URL mora koristiti HTTPS.");
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0)
      throw new Error("Embedding timeout mora biti pozitivan ceo broj.");
    if (!Number.isSafeInteger(maxRetries) || maxRetries < 0 || maxRetries > 5)
      throw new Error("Embedding retries moraju biti između 0 i 5.");
    this.model = model;
    this.baseUrl = parsedBaseUrl.toString().replace(/\/+$/u, "");
  }

  async embed(input: readonly string[]): Promise<EmbeddingBatch> {
    if (input.length === 0 || input.some((text) => !text.trim()))
      throw new NonRetryableEmbeddingError(
        "embedding_invalid",
        "Embedding ulaz mora sadržati neprazne tekstove.",
      );

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        return await this.embedOnce(input);
      } catch (error) {
        if (
          attempt === this.maxRetries ||
          error instanceof NonRetryableEmbeddingError
        )
          throw error;
        await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** attempt));
      }
    }
    throw new EmbeddingError(
      "embedding_error",
      "OpenAI embeddings zahtev nije uspeo nakon ponovnih pokušaja.",
    );
  }

  private async embedOnce(input: readonly string[]): Promise<EmbeddingBatch> {
    let response: Response;
    try {
      response = await this.transport(`${this.baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input,
          model: this.model,
          encoding_format: "float",
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      const reason = embeddingFailureReason(error);
      throw new EmbeddingError(
        reason === "embedding_timeout" ? reason : "embedding_network_error",
        "OpenAI embeddings transport nije uspeo.",
        { cause: error },
      );
    }
    if (!response.ok) {
      const message = `OpenAI embeddings zahtev nije uspeo (HTTP ${response.status}); proverite ključ, model i pristup endpoint-u.`;
      if (response.status !== 429 && response.status < 500)
        throw new NonRetryableEmbeddingError(
          `embedding_http_${response.status}`,
          message,
        );
      throw new EmbeddingError(`embedding_http_${response.status}`, message);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw new EmbeddingError(
        "embedding_invalid",
        "OpenAI embeddings odgovor nije validan JSON.",
        { cause: error },
      );
    }
    const parsed = EmbeddingResponseSchema.safeParse(payload);
    if (!parsed.success)
      throw new EmbeddingError(
        "embedding_invalid",
        "OpenAI embeddings odgovor nema očekivanu strukturu ili dimenziju.",
      );
    if (parsed.data.model !== this.model)
      throw new EmbeddingError(
        "embedding_invalid",
        `OpenAI embeddings endpoint je vratio model '${parsed.data.model}' umesto traženog '${this.model}'.`,
      );
    const data = [...parsed.data.data].sort(
      (left, right) => left.index - right.index,
    );
    if (
      data.length !== input.length ||
      data.some((entry, index) => entry.index !== index)
    )
      throw new EmbeddingError(
        "embedding_invalid",
        "OpenAI embeddings odgovor nema vektor za svaki ulaz.",
      );
    const dimensions = data[0]!.embedding.length;
    if (
      dimensions !== EMBEDDING_DIMENSIONS ||
      data.some((entry) => entry.embedding.length !== dimensions)
    )
      throw new EmbeddingError(
        "embedding_invalid",
        `OpenAI embeddings dimenzija nije očekivanih ${EMBEDDING_DIMENSIONS}.`,
      );
    return {
      vectors: data.map((entry) => entry.embedding),
      dimensions,
      tokens: parsed.data.usage.prompt_tokens,
    };
  }
}

export function createOpenAIEmbeddingClient(
  env: NodeJS.ProcessEnv = process.env,
  options: {
    transport?: typeof fetch;
    maxRetries?: number;
    timeoutMs?: number;
  } = {},
): OpenAIEmbeddingClient {
  const config = parseEmbeddingConfig(env);
  return new OpenAIEmbeddingClient(
    config.OPENAI_API_KEY,
    config.EMBEDDING_MODEL,
    config.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
    options.transport ?? fetch,
    options.timeoutMs ?? EMBEDDING_TIMEOUT_MS,
    options.maxRetries ?? EMBEDDING_MAX_RETRIES,
  );
}
