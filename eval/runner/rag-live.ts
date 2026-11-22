import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import {
  configEnvironment,
  parseConfig,
  type AppConfig,
} from "../../apps/server/src/config/index.js";

const SampleSchema = z
  .object({
    sampleId: z.string().min(1),
    question: z.string().min(1),
    answer: z.string().min(1),
    answerClaims: z.array(z.string().min(1)),
    contexts: z.array(z.string().min(1)),
    referenceFacts: z.array(z.string().min(1)),
  })
  .strict();

export const RagasDatasetSchema = z
  .object({
    schemaVersion: z.literal(1),
    datasetId: z.string().min(1),
    synthetic: z.literal(true),
    reviewStatus: z.literal("human-reviewed"),
    samples: z.array(SampleSchema).min(1).max(20),
  })
  .strict()
  .superRefine((dataset, ctx) => {
    if (
      new Set(dataset.samples.map(({ sampleId }) => sampleId)).size !==
      dataset.samples.length
    )
      ctx.addIssue({
        code: "custom",
        message: "ID uzorka RAGAS skupa mora biti jedinstven.",
      });
  });

const ApprovalSchema = z
  .object({
    reviewer: z.string().min(1),
    approvedAt: z.string().datetime({ offset: true }),
    provider: z.literal("gemini"),
    model: z.literal("gemini-3.5-flash-lite"),
    command: z.string().min(1),
    datasetHash: z.string().regex(/^[a-f0-9]{64}$/),
    sampleCount: z.number().int().positive(),
    maxModelCalls: z.number().int().positive(),
    maxInputBytes: z.number().int().positive(),
    maxOutputTokens: z.number().int().positive(),
    maxCost: z.number().positive().nullable(),
    currency: z.string().nullable(),
    priceSnapshot: z.string().nullable(),
    costUnavailableAcknowledged: z.boolean(),
  })
  .strict();

const ScoreSchema = z
  .object({
    faithfulness: z.number().finite().min(0).max(1),
    answerRelevancy: z.number().finite().min(0).max(1),
    contextPrecision: z.number().finite().min(0).max(1),
    contextRecall: z.number().finite().min(0).max(1),
  })
  .strict();

const GeminiResponseSchema = z
  .object({
    candidates: z
      .array(
        z
          .object({
            content: z
              .object({
                parts: z.array(z.object({ text: z.string().optional() })),
              })
              .optional(),
            finishReason: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
    usageMetadata: z
      .object({
        promptTokenCount: z.number().int().nonnegative(),
        candidatesTokenCount: z.number().int().nonnegative(),
      })
      .optional(),
  })
  .passthrough();

type ValidatedRagLiveRun = {
  config: AppConfig;
  samples: z.infer<typeof SampleSchema>[];
  datasetId: string;
  datasetHash: string;
  label: string;
  maxModelCalls: number;
  maxInputBytes: number;
  maxOutputTokens: number;
  approval: z.infer<typeof ApprovalSchema>;
};

function parseArgs(args: string[]): Map<string, string> {
  const allowed = new Set([
    "--confirm-live",
    "--dataset",
    "--label",
    "--max-model-calls",
    "--max-input-bytes",
    "--max-output-tokens",
    "--approval",
  ]);
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index]!;
    if (!allowed.has(key)) throw new Error(`Nepoznata opcija ${key}.`);
    if (values.has(key))
      throw new Error(`Opcija ${key} je navedena više puta.`);
    const value = args[index + 1];
    if (key !== "--confirm-live" && (!value || value.startsWith("--")))
      throw new Error(`Nedostaje vrednost za ${key}.`);
    values.set(key, key === "--confirm-live" ? "true" : value!);
    if (key !== "--confirm-live") index += 1;
  }
  return values;
}

export async function validateRagLiveRun(
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<ValidatedRagLiveRun> {
  const values = parseArgs(args);
  if (values.get("--confirm-live") !== "true")
    throw new Error("Nedostaje --confirm-live.");
  if (values.get("--dataset") !== "eval/rag/ragas-dataset.json")
    throw new Error(
      "Live RAGAS evaluator prima samo odobreni sintetički skup.",
    );
  const label = values.get("--label") ?? "";
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/iu.test(label))
    throw new Error("Neispravna oznaka pokretanja.");
  const maxModelCalls = Number(values.get("--max-model-calls"));
  const maxInputBytes = Number(values.get("--max-input-bytes"));
  const maxOutputTokens = Number(values.get("--max-output-tokens"));
  if (
    ![maxModelCalls, maxInputBytes, maxOutputTokens].every(
      Number.isSafeInteger,
    ) ||
    [maxModelCalls, maxInputBytes, maxOutputTokens].some((value) => value < 1)
  )
    throw new Error("Nedostaju validna ograničenja poziva, ulaza i izlaza.");
  const approvalPath = values.get("--approval");
  if (!approvalPath || /\.env(?:\.|$)/iu.test(approvalPath))
    throw new Error("Nedostaje validan approval fajl.");

  const config = parseConfig({ ...configEnvironment(env), DEMO_MODE: "false" });
  const rawDataset: unknown = JSON.parse(
    await readFile("eval/rag/ragas-dataset.json", "utf8"),
  );
  const dataset = RagasDatasetSchema.parse(rawDataset);
  const datasetHash = createHash("sha256")
    .update(JSON.stringify(dataset))
    .digest("hex");
  const approval = ApprovalSchema.parse(
    JSON.parse(await readFile(approvalPath, "utf8")),
  );
  if (
    approval.provider !== config.LLM_PROVIDER ||
    approval.model !== config.LLM_MODEL ||
    approval.command !== process.argv.join(" ") ||
    approval.datasetHash !== datasetHash ||
    approval.sampleCount !== dataset.samples.length ||
    maxModelCalls > approval.maxModelCalls ||
    maxInputBytes > approval.maxInputBytes ||
    maxOutputTokens > approval.maxOutputTokens
  )
    throw new Error(
      "RAGAS approval se ne odnosi na ovu komandu, skup ili limite.",
    );
  if (approval.maxCost !== null || !approval.costUnavailableAcknowledged)
    throw new Error(
      "Cena zahteva maxCost=null i eksplicitno priznanje da nije dostupna.",
    );
  if (maxModelCalls < dataset.samples.length)
    throw new Error("Broj poziva je manji od broja sintetičkih uzoraka.");
  if (maxOutputTokens < dataset.samples.length * 64)
    throw new Error(
      "Odobreni izlazni limit nije dovoljan za ograničen izlaz svakog uzorka.",
    );
  return {
    config,
    samples: dataset.samples,
    datasetId: dataset.datasetId,
    datasetHash,
    label,
    maxModelCalls,
    maxInputBytes,
    maxOutputTokens,
    approval,
  };
}

export async function runRagLiveEvaluation(args: string[]): Promise<void> {
  const validated = await validateRagLiveRun(args);
  const outputDirectory = resolve("eval/results/rag/live-" + validated.label);
  await mkdir(resolve("eval/results/rag"), { recursive: true });
  await mkdir(outputDirectory, { recursive: false });
  const report: {
    status: "running" | "completed" | "failed";
    datasetId: string;
    datasetHash: string;
    provider: string;
    model: string;
    cost: null;
    approval: { reviewer: string; approvedAt: string };
    results: Array<Record<string, unknown>>;
  } = {
    status: "running",
    datasetId: validated.datasetId,
    datasetHash: validated.datasetHash,
    provider: "gemini",
    model: validated.config.LLM_MODEL,
    cost: null,
    approval: {
      reviewer: validated.approval.reviewer,
      approvedAt: validated.approval.approvedAt,
    },
    results: [],
  };
  await writeFile(
    resolve(outputDirectory, "manifest.json"),
    JSON.stringify(report, null, 2),
    { flag: "wx" },
  );
  let inputBytes = 0;
  let outputTokens = 0;
  try {
    for (const sample of validated.samples) {
      if (report.results.length >= validated.maxModelCalls)
        throw new Error("Dostignuto je odobreno ograničenje model poziva.");
      const requestBody = JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: "Evaluate the supplied answer and retrieved contexts using the four RAGAS-style metrics. Return scores from 0 to 1 only. Do not infer clinical eligibility or provide medical advice.",
            },
          ],
        },
        contents: [{ role: "user", parts: [{ text: JSON.stringify(sample) }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseJsonSchema: z.toJSONSchema(ScoreSchema),
          maxOutputTokens: Math.min(
            512,
            Math.floor(
              (validated.maxOutputTokens - outputTokens) /
                (validated.samples.length - report.results.length),
            ),
          ),
        },
      });
      const callBytes = Buffer.byteLength(requestBody, "utf8") + 512;
      if (inputBytes + callBytes > validated.maxInputBytes)
        throw new Error("Dostignut je odobreni limit ulaznih bajtova.");
      inputBytes += callBytes;
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${validated.config.LLM_MODEL}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": validated.config.GEMINI_API_KEY!,
          },
          body: requestBody,
          signal: AbortSignal.timeout(validated.config.MODEL_TIMEOUT_MS),
        },
      );
      if (!response.ok)
        throw new Error(
          `Gemini RAGAS evaluator nije uspeo (HTTP ${response.status}).`,
        );
      const payload: unknown = await response.json();
      const parsed = GeminiResponseSchema.parse(payload);
      const candidate = parsed.candidates?.[0];
      if (candidate?.finishReason !== "STOP")
        throw new Error("Gemini RAGAS evaluator vratio je nepotpun odgovor.");
      const text =
        candidate.content?.parts.map((part) => part.text ?? "").join("") ?? "";
      const score = ScoreSchema.parse(JSON.parse(text));
      const usage = parsed.usageMetadata;
      if (!usage)
        throw new Error(
          "Gemini nije vratio token usage; prekidam radi budžetske zaštite.",
        );
      outputTokens += usage.candidatesTokenCount;
      if (outputTokens > validated.maxOutputTokens)
        throw new Error("Gemini izlaz je premašio odobreni token limit.");
      report.results.push({ sampleId: sample.sampleId, ...score, usage });
      await writeFile(
        resolve(outputDirectory, "results.json"),
        JSON.stringify(report, null, 2),
        { flag: "w" },
      );
    }
    report.status = "completed";
  } catch (error) {
    report.status = "failed";
    await writeFile(
      resolve(outputDirectory, "results.json"),
      JSON.stringify(report, null, 2),
      { flag: "w" },
    );
    throw error;
  }
  await writeFile(
    resolve(outputDirectory, "results.json"),
    JSON.stringify(report, null, 2),
    { flag: "w" },
  );
  console.log(`Sačuvan live RAGAS izveštaj: ${outputDirectory}`);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve("dist/eval/runner/rag-live.js")
)
  await runRagLiveEvaluation(process.argv.slice(2));
