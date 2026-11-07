import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { ProfileSchema, TrialSchema } from "../../packages/shared/src/index.js";
import { createApp } from "../../apps/server/src/api/app.js";
import { parseConfig } from "../../apps/server/src/config/index.js";
import { evaluateCriteria } from "../../apps/server/src/matcher/evaluate-criteria.js";
import { redactTrace } from "../../apps/server/src/trace/redact.js";
import {
  StructuredOutputError,
  generateStructured,
  ModelRequestError,
  retryModelRequest,
} from "../../apps/server/src/llm/generate-structured.js";
import { verifyCitation } from "../../apps/server/src/citations/verify.js";
import {
  ToolExecutionError,
  ToolExecutor,
} from "../../apps/server/src/tools/executor.js";
import { loadCases } from "./cases.js";
import { writeRunResults, type RunOutcome } from "./results.js";

type CaseOutcome = RunOutcome;

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function runOfflineCase(caseId: string): Promise<string> {
  if (caseId === "EV-11") {
    const app = createApp({
      config: parseConfig({ NODE_ENV: "test", MAX_INPUT_CHARS: "4000" }),
    });
    try {
      const tooLong = await app.inject({
        method: "POST",
        url: "/api/runs",
        payload: { profileText: "x".repeat(4001) },
      });
      assert(
        tooLong.statusCode === 413,
        "API nije odbio predug unos sa HTTP 413.",
      );
      const invalid = await app.inject({
        method: "POST",
        url: "/api/runs",
        payload: { profileText: "Muškarac, -5 godina, HbA1c abc." },
      });
      assert(
        invalid.statusCode === 400,
        "API nije odbio nevalidan profil sa HTTP 400.",
      );
      return "API je odbio predug i nevalidan profil bez poziva modela.";
    } finally {
      await app.close();
    }
  }
  if (caseId === "EV-12") {
    let calls = 0;
    await expectRejected(
      generateStructured(
        async () => ({ age: "62" }),
        ProfileSchema,
        () => {
          calls += 1;
        },
      ),
      StructuredOutputError,
    );
    assert(
      calls === 2,
      "Izvršeno je više ili manje od jednog pokušaja popravke.",
    );
    return "Nevalidan strukturisani izlaz je pao posle tačno jednog pokušaja popravke.";
  }
  if (caseId === "EV-13") {
    const allowed = new Map([["T-A#inc-1", "Uzrast od 18 do 75 godina."]]);
    assert(
      !verifyCitation(
        { sourceId: "UNKNOWN#source", quote: "neproveren odlomak" },
        allowed,
      ),
      "Nepoznat izvor je prihvaćen.",
    );
    return "Citiranje izvora van tekuće allowlist-e je odbijeno.";
  }
  if (caseId === "EV-14") {
    const tools = new ToolExecutor(10, 2000, () => []);
    await expectRejected(
      tools.execute("export_all", {}),
      ToolExecutionError,
      "unknown_tool",
    );
    await expectRejected(
      tools.execute("evaluate_criteria", { profile: { age: -1 }, trials: [] }),
      ToolExecutionError,
      "invalid_tool_arguments",
    );
    assert(
      tools.callCount === 0,
      "Nevalidan alat ili argument je brojao kao izvršeni poziv.",
    );
    return "Nepoznat alat i nevalidni argumenti su odbijeni pre izvršavanja.";
  }
  if (caseId === "EV-15") {
    let attempts = 0;
    const delays: number[] = [];
    await expectRejected(
      retryModelRequest(
        async () => {
          attempts += 1;
          throw new ModelRequestError(429);
        },
        {
          maxRetries: 2,
          delaysMs: [500, 1500],
          sleep: async (delay) => {
            delays.push(delay);
          },
        },
      ),
      ModelRequestError,
    );
    assert(
      attempts === 3 && delays.join(",") === "500,1500",
      "Broj retry pokušaja ili pauza nije očekivan.",
    );
    return "Izvršen je početni pokušaj i najviše dva mrežna retry pokušaja.";
  }
  if (caseId === "EV-16") {
    const rawTrials: unknown = JSON.parse(
      await readFile(resolve("data/fixtures/trials.json"), "utf8"),
    );
    const trials = TrialSchema.array().parse(rawTrials);
    const invalidProfile = ProfileSchema.parse({
      age: 62,
      sex: "male",
      creatinine: { value: 1.3, unit: "unknown" },
    });
    const tools = new ToolExecutor(10, 2000, evaluateCriteria);
    await expectRejected(
      tools.execute("evaluate_criteria", { profile: invalidProfile, trials }),
      RangeError,
    );
    assert(
      tools.callCount === 1,
      "Fault provera nije ograničena na jedan poziv alata.",
    );
    return "Greška u determinističkoj proceni nije proizvela rezultat kriterijuma.";
  }
  throw new Error(`Nije definisan offline izvršilac za ${caseId}.`);
}

async function expectRejected<T extends Error>(
  promise: Promise<unknown>,
  errorType: new (...args: never[]) => T,
  category?: string,
): Promise<void> {
  try {
    await promise;
  } catch (error) {
    assert(error instanceof errorType, "Dobijen je neočekivan tip greške.");
    if (category)
      assert(
        error instanceof ToolExecutionError && error.category === category,
        "Kategorija greške nije očekivana.",
      );
    return;
  }
  throw new Error("Očekivana je kontrolisana greška, ali operacija je uspela.");
}

async function main(): Promise<void> {
  const cases = await loadCases();
  const outcomes: CaseOutcome[] = [];
  for (const item of cases) {
    if (item.execution_mode === "real_model") {
      outcomes.push({
        case_id: item.case_id,
        execution_mode: item.execution_mode,
        status: ["EV-07", "EV-08", "EV-09"].includes(item.case_id)
          ? "dry_run"
          : "skipped",
        details: "Živi model je isključen u Fazi 1; ovaj zapis nije EV prolaz.",
      });
      continue;
    }
    try {
      const details = await runOfflineCase(item.case_id);
      outcomes.push({
        case_id: item.case_id,
        execution_mode: item.execution_mode,
        status: "passed",
        details,
      });
    } catch (error) {
      outcomes.push({
        case_id: item.case_id,
        execution_mode: item.execution_mode,
        status: "failed",
        details: error instanceof Error ? error.message : "Nepoznata greška.",
      });
    }
  }
  const commit = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const label = `offline-${new Date().toISOString().replaceAll(":", "-")}-${randomUUID().slice(0, 8)}`;
  const outputDir = resolve("eval/results", label);
  const summary = {
    label,
    commit,
    data_version: "synthetic-trials-v1",
    schema_version: "1.0.0",
    model_id: "mock/offline",
    real_model: {
      executed: 0,
      skipped: outcomes.filter(
        (item) =>
          item.execution_mode === "real_model" && item.status === "skipped",
      ).length,
      dry_run: outcomes.filter(
        (item) =>
          item.execution_mode === "real_model" && item.status === "dry_run",
      ).length,
    },
    offline_and_fault: {
      passed: outcomes.filter((item) => item.status === "passed").length,
      failed: outcomes.filter((item) => item.status === "failed").length,
    },
    results_file: "results.jsonl" as const,
  };
  const traces = outcomes.map((outcome) =>
    redactTrace({
      case_id: outcome.case_id,
      run_id: randomUUID(),
      status: outcome.status,
      execution_mode: outcome.execution_mode,
      model_id: "mock/offline",
      data_version: "synthetic-trials-v1",
      schema_version: "1.0.0",
      prompt_version: "demo.v1",
      commit,
    }),
  );
  await writeRunResults(outputDir, outcomes, summary, traces);
  console.log(`Rezultati: ${outputDir}`);
  console.log(JSON.stringify(summary, null, 2));
  if (summary.offline_and_fault.failed > 0) process.exitCode = 1;
}

await main();
