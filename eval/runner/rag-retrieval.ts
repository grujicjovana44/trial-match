import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { ProfileSchema, TrialSchema } from "../../packages/shared/src/index.js";
import { verifyCitation } from "../../apps/server/src/citations/verify.js";
import { hashRagSourceContent } from "../../apps/server/src/retrieval/corpus.js";
import { retrieveTrials } from "../../apps/server/src/retrieval/retrieve.js";

const CorpusSnapshotSchema = z
  .object({
    path: z.string().min(1),
    version: z.string().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

const RetrievalCaseSchema = z
  .object({
    caseId: z.string().min(1),
    language: z.enum(["sr", "en", "none"]),
    profile: ProfileSchema,
    relevantTrialIds: z.array(z.string().min(1)),
    relevantPassageIds: z.array(z.string().min(1)),
    rationale: z.string().min(1),
    relevanceRule: z.string().min(1),
    labelStatus: z.enum(["proposed", "confirmed", "disputed"]),
    reviewer: z.string().trim().min(1),
    reviewedAt: z.union([
      z.literal("TODO"),
      z.string().datetime({ offset: true }),
    ]),
    kind: z.enum(["ranking", "behavior", "negative", "injection", "language"]),
    split: z.enum(["dev", "test"]),
    behaviorExpectation: z
      .enum(["all_studies_selected", "stable_fallback_order"])
      .optional(),
  })
  .strict();

export const RetrievalDatasetSchema = z
  .object({
    schemaVersion: z.literal(2),
    datasetId: z.string().min(1),
    corpusSnapshotId: z.string().min(1),
    annotationStatus: z.literal("pending_human_review"),
    annotationMethod: z.string().min(1),
    corpus: z.array(CorpusSnapshotSchema).min(1),
    cases: z.array(RetrievalCaseSchema).min(1),
    plannedPatterns: z
      .array(
        z
          .object({
            pattern: z.string().min(1),
            kind: z.enum(["negative", "injection", "language"]),
            description: z.string().min(1),
            corpusVersionRequired: z.literal("corpus-v1"),
            status: z.literal("description_only"),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .superRefine((dataset, ctx) => {
    if (
      new Set(dataset.cases.map((testCase) => testCase.caseId)).size !==
      dataset.cases.length
    )
      ctx.addIssue({
        code: "custom",
        message: "ID slučaja mora biti jedinstven.",
      });
    if (
      new Set(dataset.corpus.map((source) => source.path)).size !==
      dataset.corpus.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Putanja korpusa mora biti jedinstvena.",
      });
    for (const [index, testCase] of dataset.cases.entries()) {
      if (
        (testCase.labelStatus === "proposed" &&
          (testCase.reviewer !== "TODO" || testCase.reviewedAt !== "TODO")) ||
        (testCase.labelStatus !== "proposed" &&
          (testCase.reviewer === "TODO" || testCase.reviewedAt === "TODO"))
      )
        ctx.addIssue({
          code: "custom",
          path: ["cases", index],
          message:
            "Predložene oznake čekaju pregled; potvrđene ili osporene oznake zahtevaju ime pregledavaoca i reviewedAt.",
        });
      if (
        (testCase.kind === "behavior") !==
        (testCase.behaviorExpectation !== undefined)
      )
        ctx.addIssue({
          code: "custom",
          path: ["cases", index, "behaviorExpectation"],
          message: "Samo behavior slučaj mora imati behaviorExpectation.",
        });
      if (
        (testCase.kind === "ranking" &&
          testCase.relevantTrialIds.length === 0) ||
        (testCase.kind === "behavior" &&
          (testCase.relevantTrialIds.length > 0 ||
            testCase.relevantPassageIds.length > 0))
      )
        ctx.addIssue({
          code: "custom",
          path: ["cases", index],
          message:
            "Rangirajući slučajevi traže relevantne ID-jeve; behavior slučajevi ne smeju nositi rangirajuće oznake.",
        });
    }
  });

type RankingMetrics = {
  recall: number;
  precision: number;
  reciprocalRank: number;
  ndcg: number;
};

export function rankingMetrics(
  rankedIds: string[],
  relevantIds: string[],
  k: number,
  corpusSize: number,
): RankingMetrics | null {
  if (
    !Number.isSafeInteger(corpusSize) ||
    corpusSize < 1 ||
    !Number.isSafeInteger(k) ||
    k < 1 ||
    k > Math.floor(corpusSize / 2)
  )
    return null;
  if (relevantIds.length === 0) return null;
  const relevant = new Set(relevantIds);
  const top = rankedIds.slice(0, k);
  const hits = top.filter((id) => relevant.has(id)).length;
  const firstRelevantRank = top.findIndex((id) => relevant.has(id));
  const dcg = top.reduce(
    (score, id, index) =>
      score + (relevant.has(id) ? 1 / Math.log2(index + 2) : 0),
    0,
  );
  const idealHits = Math.min(relevant.size, k);
  const idealDcg = Array.from(
    { length: idealHits },
    (_, index) => 1 / Math.log2(index + 2),
  ).reduce((sum, score) => sum + score, 0);
  return {
    recall: hits / relevant.size,
    precision: hits / k,
    reciprocalRank: firstRelevantRank < 0 ? 0 : 1 / (firstRelevantRank + 1),
    ndcg: idealDcg === 0 ? 0 : dcg / idealDcg,
  };
}

export function rankingCutoffs(corpusSize: number): number[] {
  if (!Number.isSafeInteger(corpusSize) || corpusSize < 1)
    throw new Error("Veličina korpusa mora biti pozitivan ceo broj.");
  return Array.from(
    { length: Math.floor(corpusSize / 2) },
    (_, index) => index + 1,
  );
}

export function isMetricEligibleCase(testCase: {
  kind: z.infer<typeof RetrievalCaseSchema>["kind"];
  labelStatus: z.infer<typeof RetrievalCaseSchema>["labelStatus"];
}): boolean {
  return testCase.kind === "ranking" && testCase.labelStatus === "confirmed";
}

export function passageIdsInContext(
  contextText: string,
  trialIds: Set<string>,
  trials: z.infer<typeof TrialSchema>[],
): string[] {
  const criteriaBySourceId = new Map(
    trials
      .filter((trial) => trialIds.has(trial.trialId))
      .flatMap((trial) =>
        trial.criteria.map(
          (criterion) => [criterion.sourceId, criterion] as const,
        ),
      ),
  );
  const retrieved: string[] = [];
  for (const line of contextText.split("\n")) {
    const separator = line.indexOf(": ");
    if (separator < 0) continue;
    const criterion = criteriaBySourceId.get(line.slice(0, separator));
    if (criterion && !retrieved.includes(criterion.id))
      retrieved.push(criterion.id);
  }
  return retrieved;
}

function average(values: Array<number | null>): number | null {
  const included = values.filter((value): value is number => value !== null);
  return included.length
    ? included.reduce((sum, value) => sum + value, 0) / included.length
    : null;
}

export async function buildMiniSearchBaseline(): Promise<void> {
  const root = process.cwd();
  const datasetPath = resolve(root, "eval/rag/retrieval-v2.json");
  const baselinePath = resolve(root, "eval/rag/baseline-v2.json");
  const dataset = RetrievalDatasetSchema.parse(
    JSON.parse(await readFile(datasetPath, "utf8")),
  );
  const snapshots = [];
  const trials = [];
  for (const source of dataset.corpus) {
    const bytes = await readFile(resolve(root, source.path));
    const actualHash = hashRagSourceContent(bytes);
    if (actualHash !== source.sha256)
      throw new Error(
        `Korpus se razlikuje od zamrznutog snimka: ${source.path}`,
      );
    snapshots.push({ ...source, observedSha256: actualHash });
    trials.push(
      ...TrialSchema.array().parse(JSON.parse(bytes.toString("utf8"))),
    );
  }
  const allTrials = TrialSchema.array().parse(trials);
  const metricCutoffs = rankingCutoffs(allTrials.length);
  const passageCount = allTrials.reduce(
    (count, trial) => count + trial.criteria.length,
    0,
  );
  const passageMetricCutoffs = rankingCutoffs(passageCount);
  const trialIds = allTrials.map((trial) => trial.trialId);
  if (new Set(trialIds).size !== trialIds.length)
    throw new Error("ID studije se ponavlja između izvora korpusa.");
  const sortedTrialIds = [...trialIds].sort((left, right) =>
    left.localeCompare(right, "en"),
  );
  for (const testCase of dataset.cases) {
    const knownTrialIds = new Set(trialIds);
    const knownPassages = new Set(
      allTrials.flatMap((trial) =>
        trial.criteria.map((criterion) => criterion.id),
      ),
    );
    if (testCase.relevantTrialIds.some((id) => !knownTrialIds.has(id)))
      throw new Error(`Nepoznata ručno označena studija u ${testCase.caseId}.`);
    if (testCase.relevantPassageIds.some((id) => !knownPassages.has(id)))
      throw new Error(`Nepoznat ručno označen odlomak u ${testCase.caseId}.`);
  }

  const caseResults = dataset.cases.map((testCase) => {
    const metricsEligible =
      isMetricEligibleCase(testCase) && metricCutoffs.length > 0;
    const started = performance.now();
    const result = retrieveTrials(testCase.profile, allTrials, {
      maxCandidates: Math.min(10, allTrials.length),
      maxSnippets: 5,
      maxContextChars: 12000,
    });
    const elapsedMs = performance.now() - started;
    const retrievedTrialIds = result.trials.map((trial) => trial.trialId);
    const retrievedPassageIds = passageIdsInContext(
      result.contextText,
      new Set(retrievedTrialIds),
      allTrials,
    );
    const repeated = retrieveTrials(testCase.profile, allTrials, {
      maxCandidates: Math.min(10, allTrials.length),
      maxSnippets: 5,
      maxContextChars: 12000,
    });
    const behaviorPassed =
      testCase.behaviorExpectation === "all_studies_selected"
        ? retrievedTrialIds.length === allTrials.length &&
          new Set(retrievedTrialIds).size === allTrials.length
        : testCase.behaviorExpectation === "stable_fallback_order"
          ? JSON.stringify(retrievedTrialIds) ===
            JSON.stringify(
              sortedTrialIds.slice(0, Math.min(10, allTrials.length)),
            )
          : null;
    const citationsValid = result.trials.every((trial) =>
      trial.criteria
        .filter((criterion) =>
          result.contextText.includes(
            `${criterion.sourceId}: ${criterion.sourceQuote}`,
          ),
        )
        .every((criterion) =>
          verifyCitation(
            { sourceId: criterion.sourceId, quote: criterion.sourceQuote },
            result.sourceTexts,
          ),
        ),
    );
    return {
      caseId: testCase.caseId,
      language: testCase.language,
      kind: testCase.kind,
      split: testCase.split,
      labelStatus: testCase.labelStatus,
      metricsEligible,
      behaviorPassed,
      retrievedTrialIds,
      retrievedPassageIds,
      contextChars: result.contextText.length,
      latencyMs: elapsedMs,
      deterministic:
        JSON.stringify(retrievedTrialIds) ===
          JSON.stringify(repeated.trials.map((trial) => trial.trialId)) &&
        JSON.stringify(retrievedPassageIds) ===
          JSON.stringify(
            passageIdsInContext(
              repeated.contextText,
              new Set(repeated.trials.map((trial) => trial.trialId)),
              allTrials,
            ),
          ),
      citationsValid,
      studyMetrics: metricsEligible
        ? Object.fromEntries(
            metricCutoffs.map((k) => [
              `at${k}`,
              rankingMetrics(
                retrievedTrialIds,
                testCase.relevantTrialIds,
                k,
                allTrials.length,
              ),
            ]),
          )
        : null,
      passageMetrics:
        !metricsEligible || testCase.relevantPassageIds.length === 0
          ? null
          : Object.fromEntries(
              passageMetricCutoffs.map((k) => [
                `at${k}`,
                rankingMetrics(
                  retrievedPassageIds,
                  testCase.relevantPassageIds,
                  k,
                  passageCount,
                ),
              ]),
            ),
    };
  });
  const aggregate = (
    key: "studyMetrics" | "passageMetrics",
    split: "dev" | "test",
  ) => {
    const cases = caseResults.filter(
      (item) =>
        item.metricsEligible && item.split === split && item[key] !== null,
    );
    return Object.fromEntries(
      metricCutoffs.map((k) => {
        const values = cases.map((item) => item[key]?.[`at${k}`] ?? null);
        return [
          `at${k}`,
          {
            recall: average(values.map((value) => value?.recall ?? null)),
            precision: average(values.map((value) => value?.precision ?? null)),
            mrr: average(values.map((value) => value?.reciprocalRank ?? null)),
            ndcg: average(values.map((value) => value?.ndcg ?? null)),
          },
        ];
      }),
    );
  };
  const report = {
    baselineId: "mini-search-rag-retrieval-v2",
    retrievalImplementation: "current MiniSearch retrieveTrials",
    datasetId: dataset.datasetId,
    corpusSnapshotId: dataset.corpusSnapshotId,
    annotationStatus: dataset.annotationStatus,
    annotationMethod: dataset.annotationMethod,
    gitCommit: process.env.GIT_COMMIT ?? "unavailable",
    limits: {
      maxCandidates: Math.min(10, allTrials.length),
      maxSnippets: 5,
      maxContextChars: 12000,
      maxMetricK: Math.floor(allTrials.length / 2),
    },
    corpus: snapshots,
    cases: caseResults,
    aggregate: {
      dev: {
        studies: aggregate("studyMetrics", "dev"),
        passages: aggregate("passageMetrics", "dev"),
      },
      test: {
        studies: aggregate("studyMetrics", "test"),
        passages: aggregate("passageMetrics", "test"),
      },
    },
    metricEligibility: {
      includedCaseIds: caseResults
        .filter((item) => item.metricsEligible)
        .map((item) => item.caseId),
      excludedCaseIds: caseResults
        .filter((item) => !item.metricsEligible)
        .map((item) => item.caseId),
      reason:
        "Metrike rangiranja računaju se samo za ranking slučajeve sa potvrđenim oznakama.",
      cutoffs: metricCutoffs,
      passageCutoffs: passageMetricCutoffs,
    },
    checks: {
      allContextsWithinLimit: caseResults.every(
        (item) => item.contextChars <= 12000,
      ),
      allCitationsValid: caseResults.every((item) => item.citationsValid),
      deterministicAcrossRepeatedRuns: caseResults.every(
        (item) => item.deterministic,
      ),
    },
  };
  await writeFile(baselinePath, `${JSON.stringify(report, null, 2)}\n`, {
    flag: "wx",
  });
  console.log(`Sačuvan nepromenljiv MiniSearch baseline v2: ${baselinePath}`);
  console.log(JSON.stringify(report.aggregate, null, 2));
  console.log(JSON.stringify(report.checks, null, 2));
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve("dist/eval/runner/rag-retrieval.js")
) {
  await buildMiniSearchBaseline();
}
