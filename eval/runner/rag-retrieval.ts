import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { ProfileSchema, TrialSchema } from "../../packages/shared/src/index.js";
import { verifyCitation } from "../../apps/server/src/citations/verify.js";
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
  })
  .strict();

const RetrievalDatasetSchema = z
  .object({
    datasetId: z.string().min(1),
    corpusSnapshotId: z.string().min(1),
    annotationStatus: z.literal("pending_human_review"),
    annotationMethod: z.string().min(1),
    corpus: z.array(CorpusSnapshotSchema).min(1),
    cases: z.array(RetrievalCaseSchema).min(1),
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
): RankingMetrics | null {
  if (relevantIds.length === 0) return null;
  const relevant = new Set(relevantIds);
  const top = rankedIds.slice(0, k);
  const hits = top.filter((id) => relevant.has(id)).length;
  const firstRelevantRank = rankedIds.findIndex((id) => relevant.has(id));
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

function passageIdsInContext(
  contextText: string,
  trialIds: Set<string>,
  trials: z.infer<typeof TrialSchema>[],
): string[] {
  const retrieved: string[] = [];
  for (const trial of trials) {
    if (!trialIds.has(trial.trialId)) continue;
    for (const criterion of trial.criteria) {
      const snippet = `${criterion.sourceId}: ${criterion.sourceQuote}`;
      if (contextText.includes(snippet) && !retrieved.includes(criterion.id))
        retrieved.push(criterion.id);
    }
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
  const datasetPath = resolve(root, "eval/rag/retrieval-v1.json");
  const baselinePath = resolve(root, "eval/rag/baseline-v1.json");
  const dataset = RetrievalDatasetSchema.parse(
    JSON.parse(await readFile(datasetPath, "utf8")),
  );
  const snapshots = [];
  const trials = [];
  for (const source of dataset.corpus) {
    const bytes = await readFile(resolve(root, source.path));
    const actualHash = createHash("sha256").update(bytes).digest("hex");
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
  const trialIds = allTrials.map((trial) => trial.trialId);
  if (new Set(trialIds).size !== trialIds.length)
    throw new Error("ID studije se ponavlja između izvora korpusa.");
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
    const started = performance.now();
    const result = retrieveTrials(testCase.profile, allTrials, {
      maxCandidates: 10,
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
      maxCandidates: 10,
      maxSnippets: 5,
      maxContextChars: 12000,
    });
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
      studyMetrics: Object.fromEntries(
        [1, 3, 5].map((k) => [
          `at${k}`,
          rankingMetrics(retrievedTrialIds, testCase.relevantTrialIds, k),
        ]),
      ),
      passageMetrics:
        testCase.relevantPassageIds.length === 0
          ? null
          : Object.fromEntries(
              [1, 3, 5].map((k) => [
                `at${k}`,
                rankingMetrics(
                  retrievedPassageIds,
                  testCase.relevantPassageIds,
                  k,
                ),
              ]),
            ),
    };
  });
  const aggregate = (key: "studyMetrics" | "passageMetrics") => {
    const cases = caseResults.filter((item) => item[key] !== null);
    return Object.fromEntries(
      [1, 3, 5].map((k) => {
        const values = cases.map(
          (item) => item[key]?.[`at${k}` as "at1" | "at3" | "at5"] ?? null,
        );
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
    baselineId: "mini-search-rag-retrieval-v1",
    retrievalImplementation: "current MiniSearch retrieveTrials",
    datasetId: dataset.datasetId,
    corpusSnapshotId: dataset.corpusSnapshotId,
    annotationStatus: dataset.annotationStatus,
    annotationMethod: dataset.annotationMethod,
    gitCommit: process.env.GIT_COMMIT ?? "unavailable",
    limits: { maxCandidates: 10, maxSnippets: 5, maxContextChars: 12000 },
    corpus: snapshots,
    cases: caseResults,
    aggregate: {
      studies: aggregate("studyMetrics"),
      passages: aggregate("passageMetrics"),
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
  console.log(`Sačuvan nepromenljiv MiniSearch baseline: ${baselinePath}`);
  console.log(JSON.stringify(report.aggregate, null, 2));
  console.log(JSON.stringify(report.checks, null, 2));
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve("dist/eval/runner/rag-retrieval.js")
) {
  await buildMiniSearchBaseline();
}
