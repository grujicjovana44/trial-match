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
    WEB_PORT: integerSetting(5173, 65535),
    DEMO_MODE: z
      .literal("true")
      .default("true")
      .transform(() => true),
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

export function parseConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const source =
    env === process.env
      ? Object.fromEntries(
          Object.keys(ConfigSchema.shape)
            .filter((key) => env[key] !== undefined)
            .map((key) => [key, env[key]]),
        )
      : env;
  return ConfigSchema.parse(source);
}
