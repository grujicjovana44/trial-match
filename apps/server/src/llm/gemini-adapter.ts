import { z } from "zod";
import type {
  AdapterContext,
  AdapterRequest,
  AdapterResult,
  LlmAdapter,
} from "./adapter.js";
import { ModelRequestError } from "./generate-structured.js";

const ResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z
          .object({
            parts: z.array(
              z.object({
                text: z.string().optional(),
                thought: z.boolean().optional(),
              }),
            ),
          })
          .optional(),
        finishReason: z.string().optional(),
      }),
    )
    .optional(),
  promptFeedback: z.object({ blockReason: z.string().optional() }).optional(),
  usageMetadata: z
    .object({
      promptTokenCount: z.number().int().nonnegative(),
      candidatesTokenCount: z.number().int().nonnegative(),
    })
    .optional(),
});

export class GeminiAdapter implements LlmAdapter {
  readonly providerId = "gemini";
  readonly modelId = "gemini-3.5-flash-lite";
  constructor(
    private readonly apiKey: string,
    private readonly transport: typeof fetch = fetch,
  ) {
    if (!apiKey.trim())
      throw new Error("Stvarni model zahteva serverski ključ.");
  }
  async generate(
    request: AdapterRequest,
    context: AdapterContext,
  ): Promise<AdapterResult> {
    let response: Response;
    try {
      response = await this.transport(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.modelId}:generateContent`,
        {
          method: "POST",
          signal: context.signal,
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": this.apiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: request.instruction }] },
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: JSON.stringify({
                      input: request.input,
                      repair: request.repair ?? null,
                    }),
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0,
              responseMimeType: "application/json",
              responseJsonSchema: z.toJSONSchema(request.schema),
              maxOutputTokens: context.maxOutputTokens ?? 2048,
            },
          }),
        },
      );
    } catch {
      throw new ModelRequestError(undefined, true);
    }
    if (!response.ok) throw new ModelRequestError(response.status);
    const parsed = ResponseSchema.safeParse(await response.json());
    if (!parsed.success)
      return { candidate: null, usage: null, finish: "truncated" };
    const payload = parsed.data;
    const usage = payload.usageMetadata
      ? {
          inputTokens: payload.usageMetadata.promptTokenCount,
          outputTokens: payload.usageMetadata.candidatesTokenCount,
        }
      : null;
    const candidate = payload.candidates?.[0];
    if (
      payload.promptFeedback?.blockReason ||
      ["SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT"].includes(
        candidate?.finishReason ?? "",
      )
    )
      return { candidate: null, usage, finish: "refused" };
    if (candidate?.finishReason !== "STOP")
      return { candidate: null, usage, finish: "truncated" };
    const text =
      candidate.content?.parts
        .filter((part) => !part.thought)
        .map((part) => part.text ?? "")
        .join("") ?? "";
    try {
      return {
        candidate: JSON.parse(text) as unknown,
        usage,
        finish: "complete",
      };
    } catch {
      return { candidate: null, usage, finish: "complete" };
    }
  }
}
