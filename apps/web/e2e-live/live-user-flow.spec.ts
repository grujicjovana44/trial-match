// Opt-in živi UI prolaz (CAP-02/CAP-03/CAP-04): sintetički profil → dopunsko
// pitanje → rezultat sa citatom i linkom ka registru → „Šta ako?“ u istom runId.
// Stvarni Gemini model; pokreće se samo kroz `pnpm test:e2e:live` uz
// TRIALMATCH_LIVE_E2E=confirm. Dokazi se upisuju u eval/results/ui-live/<oznaka>/
// i postojeći direktorijum se nikada ne prepisuje.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page, type Response } from "@playwright/test";
import type { RunResponse } from "../../../packages/shared/src/index.js";

const PROFILE =
  "Muškarac, 62 godine, dijabetes tip 2, HbA1c 8,1%, kreatinin 1,3 mg/dL, visina 178 cm, težina 92 kg.";
const HYPOTHESIS = "Šta ako je HbA1c 10,5%?";
const API_HEALTH = "http://127.0.0.1:43174/health";

const label =
  process.env.TRIALMATCH_LIVE_LABEL ??
  `ui-live-${new Date().toISOString().replace(/[:.]/g, "-")}`;
if (!/^[A-Za-z0-9._-]+$/.test(label))
  throw new Error(
    "TRIALMATCH_LIVE_LABEL sme da sadrži samo slova, brojeve, . _ i -.",
  );
const outDir = path.join("eval", "results", "ui-live", label);

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

type Step = {
  step: string;
  endpoint: string;
  httpStatus: number;
  runId: string;
  status: RunResponse["status"];
  stage: RunResponse["stage"];
  reason: string | null;
  question: { field: string; text: string; options: string[] } | null;
  results: Array<{
    trialId: string;
    verdict: string;
    criteria: number;
    unknown: number;
  }>;
  excludedTrials: string[];
  explanationSource: string | null;
  error: unknown;
  meta: Record<string, unknown>;
};

function summarize(step: string, response: Response, body: RunResponse): Step {
  const { meta } = body;
  return {
    step,
    endpoint: new URL(response.url()).pathname.replace(body.runId, "<runId>"),
    httpStatus: response.status(),
    runId: body.runId,
    status: body.status,
    stage: body.stage,
    reason: body.reason,
    question:
      body.question === null
        ? null
        : {
            field: body.question.field,
            text: body.question.text,
            options: body.question.options ?? [],
          },
    results: body.results.map((trial) => ({
      trialId: trial.trialId,
      verdict: trial.verdict,
      criteria: trial.criteria.length,
      unknown: trial.criteria.filter((c) => c.status === "unknown").length,
    })),
    excludedTrials: body.excludedTrials.map((trial) => trial.trialId),
    explanationSource: body.explanationSource ?? null,
    error: body.error,
    meta: {
      providerId: meta.providerId,
      modelId: meta.modelId,
      demoMode: meta.demoMode,
      retrievalMode: meta.retrievalMode,
      retrievalFallbackReason: meta.retrievalFallbackReason,
      dataOrigin: meta.dataOrigin,
      dataVersion: meta.dataVersion,
      dataSnapshotDate: meta.dataSnapshotDate,
      promptVersion: meta.promptVersion,
      schemaVersion: meta.schemaVersion,
      modelAttempts: meta.modelAttempts,
      modelCalls: meta.modelCalls,
      toolCalls: meta.toolCalls,
      tokens: meta.tokens,
      durationMs: meta.durationMs,
    },
  };
}

async function capture(
  page: Page,
  step: string,
  matcher: (url: string) => boolean,
  action: () => Promise<void>,
): Promise<{ summary: Step; body: RunResponse }> {
  const [response] = await Promise.all([
    page.waitForResponse(
      (candidate) =>
        candidate.request().method() === "POST" && matcher(candidate.url()),
      { timeout: 150_000 },
    ),
    action(),
  ]);
  const body = (await response.json()) as RunResponse;
  return { summary: summarize(step, response, body), body };
}

test("LIVE: profil → dopuna → rezultat sa citatom → „Šta ako?“ u istom runId", async ({
  page,
  request,
}) => {
  if (existsSync(outDir))
    throw new Error(
      `Direktorijum ${outDir} već postoji; izaberite novu oznaku.`,
    );
  mkdirSync(outDir, { recursive: true });
  const startedAt = new Date().toISOString();
  const steps: Step[] = [];
  const shot = (name: string) =>
    page.screenshot({ path: path.join(outDir, name), fullPage: true });

  const health = (await (await request.get(API_HEALTH)).json()) as Record<
    string,
    unknown
  >;
  expect(health.demoMode).toBe(false);

  await page.goto("/");
  await expect(page.locator(".mode-badge.mode-live")).toBeVisible();
  await page.getByLabel("Opišite profil").fill(PROFILE);
  await shot("01-unos.png");

  // 1. Početni zahtev: profil bez podatka o insulinu.
  const first = await capture(
    page,
    "initial",
    (url) => url.endsWith("/api/runs"),
    () => page.getByRole("button", { name: "Proveri kriterijume" }).click(),
  );
  steps.push(first.summary);
  expect(first.body.status).toBe("needs_clarification");
  const runId = first.body.runId;
  const question = first.body.question;
  if (question === null) throw new Error("Očekivano je dopunsko pitanje.");
  await expect(page.locator("form.follow-up")).toBeVisible();
  await expect(page.locator("form.follow-up label")).toHaveText(question.text);
  await shot("02-dopuna.png");

  // 2. Odgovor na dopunsko pitanje (isti runId).
  const options = question.options ?? [];
  const option = options.find((value) => /^ne\b/i.test(value)) ?? options[0];
  const answered = await capture(
    page,
    "answer",
    (url) => url.endsWith(`/api/runs/${runId}/answer`),
    async () => {
      if (option !== undefined)
        await page
          .locator(".answer-options")
          .getByRole("button", { name: option, exact: true })
          .click();
      else {
        await page.locator("#answer").fill("Ne");
        await page.locator("form.follow-up button[type=submit]").click();
      }
    },
  );
  steps.push(answered.summary);
  expect(answered.body.runId).toBe(runId);
  expect(answered.body.status).toBe("ok");

  // 3. Rezultat: studije, kriterijumi sa citatom i link ka izvoru u registru.
  await expect(page.locator("#results-heading")).toBeVisible();
  const card = page.locator(".trial-card").first();
  await expect(card).toBeVisible();
  await shot("03-rezultat.png");
  await card.locator(".trial-details > summary").click();
  await expect(card.locator(".criterion").first()).toBeVisible();
  const registry = card.locator(".trial-links a");
  await expect(registry).toHaveAttribute(
    "href",
    /^https:\/\/clinicaltrials\.gov\/study\/NCT\d{8}$/,
  );
  await card.scrollIntoViewIfNeeded();
  await shot("04-citat-i-izvor.png");

  const firstTrial = answered.body.results[0];
  if (firstTrial === undefined)
    throw new Error("Rezultat nema nijednu studiju.");
  const cited = firstTrial.criteria.find(
    (criterion) => criterion.citation.quote.trim().length > 0,
  );
  if (cited === undefined) throw new Error("Prva studija nema citat.");
  const registryHref = await registry.getAttribute("href");

  // 4. „Šta ako?“ ponavlja procenu u istom runId, uz sačuvan ostatak profila.
  await page.locator("#hypothesis").fill(HYPOTHESIS);
  const hypothesis = await capture(
    page,
    "hypothesis",
    (url) => url.endsWith(`/api/runs/${runId}/hypothesis`),
    () => page.getByRole("button", { name: "Proveri izmenu" }).click(),
  );
  steps.push(hypothesis.summary);
  expect(hypothesis.body.runId).toBe(runId);
  await expect(page.locator("#results-heading")).toBeVisible();
  await shot("05-sta-ako.png");

  const record = {
    label,
    kind: "ui_live_user_flow",
    startedAt,
    finishedAt: new Date().toISOString(),
    commit: git(["rev-parse", "HEAD"]),
    dirty: git(["status", "--porcelain", "--untracked-files=no"]).length > 0,
    mode: "live",
    dataset: "clinicaltrials-20",
    note: "Sintetički profil; stvarni Gemini model kroz web interfejs i serverski API.",
    health: {
      demoMode: health.demoMode,
      retrievalMode: health.retrievalMode,
      providerId: health.providerId,
      modelId: health.modelId,
    },
    input: { profile: PROFILE, answer: option ?? "Ne", hypothesis: HYPOTHESIS },
    runId,
    steps,
    sampleCitation: {
      trialId: firstTrial.trialId,
      criterionId: cited.id,
      status: cited.status,
      sourceId: cited.citation.sourceId,
      quote: cited.citation.quote,
      registryUrl: registryHref,
    },
    screenshots: [
      "01-unos.png",
      "02-dopuna.png",
      "03-rezultat.png",
      "04-citat-i-izvor.png",
      "05-sta-ako.png",
    ],
  };
  writeFileSync(
    path.join(outDir, "run.json"),
    `${JSON.stringify(record, null, 2)}\n`,
    "utf8",
  );
});
