import type { z } from "zod";

export type AdapterRequest = {
  promptId: "extract_profile.v1" | "explain_results.v1";
  instruction: string;
  input: unknown;
  schema: z.ZodType;
  repair?: string;
};
export type AdapterContext = {
  signal: AbortSignal;
  deadline: number;
  maxOutputTokens?: number;
};
export type AdapterResult = {
  candidate: unknown;
  usage: { inputTokens: number; outputTokens: number } | null;
  finish: "complete" | "refused" | "truncated";
};
export interface LlmAdapter {
  readonly modelId: string;
  readonly providerId: string;
  generate(
    request: AdapterRequest,
    context: AdapterContext,
  ): Promise<AdapterResult>;
}
