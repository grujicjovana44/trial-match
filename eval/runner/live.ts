import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { loadCases } from "./cases.js";
import {
  configEnvironment,
  parseConfig,
} from "../../apps/server/src/config/index.js";

const ApprovalSchema = z
  .object({
    reviewer: z.string().min(1),
    approvedAt: z.string().datetime({ offset: true }),
    provider: z.literal("gemini"),
    model: z.literal("gemini-3.5-flash-lite"),
    command: z.string().min(1),
    caseSetHash: z.string().regex(/^[a-f0-9]{64}$/),
    caseCount: z.literal(16),
    maxAttempts: z.number().int().positive(),
    maxInputTokens: z.number().int().positive(),
    maxOutputTokens: z.number().int().positive(),
    maxCost: z.number().positive().nullable(),
    currency: z.string().nullable(),
    priceSnapshot: z.string().nullable(),
    costUnavailableAcknowledged: z.boolean(),
  })
  .strict();
export async function validateLiveRun(
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
) {
  const values = new Map<string, string>();
  const allowedFlags = new Set([
    "--confirm-live",
    "--dataset",
    "--label",
    "--max-model-attempts",
    "--max-input-tokens",
    "--max-output-tokens",
    "--approval",
  ]);
  for (let i = 0; i < args.length; i++) {
    const key = args[i]!;
    if (!allowedFlags.has(key)) throw new Error(`Nepoznata opcija ${key}.`);
    if (values.has(key))
      throw new Error(`Opcija ${key} je navedena više puta.`);
    if (key.startsWith("--") && args[i + 1] && !args[i + 1]!.startsWith("--"))
      values.set(key, args[++i]!);
    else values.set(key, "true");
  }
  if (values.get("--confirm-live") !== "true")
    throw new Error("Nedostaje --confirm-live.");
  if (values.get("--dataset") !== "fixtures")
    throw new Error("Live evaluacija prima samo sintetičke fixtures.");
  const label = values.get("--label");
  if (!label || !/^[a-z0-9][a-z0-9._-]{0,63}$/i.test(label))
    throw new Error("Neispravna oznaka pokretanja.");
  const limits = [
    "--max-model-attempts",
    "--max-input-tokens",
    "--max-output-tokens",
  ] as const;
  for (const flag of limits)
    if (!/^[1-9]\d*$/.test(values.get(flag) ?? ""))
      throw new Error(`Nedostaje validno ograničenje ${flag}.`);
  const approvalPath = values.get("--approval");
  if (!approvalPath) throw new Error("Nedostaje approval fajl.");
  const config = parseConfig({ ...configEnvironment(env), DEMO_MODE: "false" });
  if (approvalPath.endsWith(".env") || approvalPath.endsWith(".env.local"))
    throw new Error("Approval zapis nije putanja ka environment fajlu.");
  const cases = await loadCases();
  if (
    cases.length !== 16 ||
    cases.some((c) => c.execution_mode === "real_model" && !c.input.trim())
  )
    throw new Error("EV skup nije potpun.");
  const caseSetHash = createHash("sha256")
    .update(cases.map((c) => JSON.stringify(c)).join("\n"))
    .digest("hex");
  const raw: unknown = JSON.parse(await readFile(approvalPath, "utf8"));
  const approval = ApprovalSchema.parse(raw);
  if (
    approval.caseSetHash !== caseSetHash ||
    approval.command !== process.argv.join(" ") ||
    Number(values.get(limits[0])) > approval.maxAttempts ||
    Number(values.get(limits[1])) > approval.maxInputTokens ||
    Number(values.get(limits[2])) > approval.maxOutputTokens
  )
    throw new Error(
      "Approval se ne odnosi na ovu komandu, slučajeve ili limite.",
    );
  if (approval.maxCost !== null)
    throw new Error(
      "Cost enforcement is unavailable; approve maxCost=null with costUnavailableAcknowledged=true.",
    );
  if (approval.maxCost === null && !approval.costUnavailableAcknowledged)
    throw new Error("Cena nije poznata i to mora biti eksplicitno odobreno.");
  return {
    config,
    cases,
    approval,
    caseSetHash,
    label,
    maxAttempts: Number(values.get(limits[0])),
    maxInputTokens: Number(values.get(limits[1])),
    maxOutputTokens: Number(values.get(limits[2])),
  };
}
