import { z } from "zod";

const integerSetting = (fallback: number, maximum = Number.MAX_SAFE_INTEGER) =>
  z.coerce.number().int().positive().max(maximum).default(fallback);

const ConfigSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    HOST: z.string().min(1).default("127.0.0.1"),
    PORT: integerSetting(3000, 65535),
    WEB_ORIGIN: z
      .string()
      .url()
      .refine((value) =>
        ["localhost", "127.0.0.1", "[::1]"].includes(new URL(value).hostname),
      )
      .default("http://127.0.0.1:4173"),
    WEB_PORT: integerSetting(5173, 65535),
    DEMO_MODE: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    LLM_PROVIDER: z.literal("gemini").default("gemini"),
    LLM_MODEL: z
      .literal("gemini-3.5-flash-lite")
      .default("gemini-3.5-flash-lite"),
    GEMINI_API_KEY: z.string().min(1).optional(),
    DATA_DIR: z.string().min(1).default("data/fixtures"),
    MAX_INPUT_CHARS: integerSetting(4000),
    MAX_CONTEXT_CHARS: integerSetting(12000),
    MAX_MODEL_CALLS_PER_RUN: integerSetting(4),
    MAX_TOOL_CALLS_PER_RUN: integerSetting(10),
    MODEL_TIMEOUT_MS: integerSetting(20000),
    RUN_TIMEOUT_MS: integerSetting(60000),
    MAX_RETRIES: z.coerce.number().int().min(0).max(2).default(2),
    MAX_QUESTION_ROUNDS: integerSetting(5),
    TOOL_TIMEOUT_MS: integerSetting(2000),
    RATE_LIMIT_MAX: integerSetting(20),
    RATE_LIMIT_WINDOW_MS: integerSetting(60000),
  })
  .strict();

export type AppConfig = z.infer<typeof ConfigSchema>;

export function configEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.keys(ConfigSchema.shape)
      .filter((key) => env[key] !== undefined)
      .map((key) => [key, env[key]]),
  );
}

export function parseConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const isProcessEnvironment =
    env === process.env ||
    ["PATH", "HOME", "PWD", "SHELL"].some((key) => Object.hasOwn(env, key));
  const source = isProcessEnvironment ? configEnvironment(env) : env;
  const config = ConfigSchema.parse(source);
  if (!config.DEMO_MODE && !config.GEMINI_API_KEY)
    throw new Error(
      "Stvarni model zahteva GEMINI_API_KEY u serverskom okruženju.",
    );
  return config;
}
