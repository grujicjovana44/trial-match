import type {
  CriterionResult,
  RunResponse,
  TrialResult,
} from "../../../../packages/shared/src/index.js";

// Pomoćni graditelji odgovora servera za testove. Nisu deo aplikacije.
type Meta = RunResponse["meta"];
type OkResponse = Extract<RunResponse, { status: "ok" }>;
type ClarificationResponse = Extract<
  RunResponse,
  { status: "needs_clarification" }
>;
type InsufficientResponse = Extract<
  RunResponse,
  { status: "insufficient_evidence" }
>;
type RejectedResponse = Extract<RunResponse, { status: "rejected" }>;
type ErrorResponse = Extract<RunResponse, { status: "error" }>;

export function metaOf(overrides: Partial<Meta> = {}): Meta {
  return {
    modelId: "mock",
    promptVersion: "demo.v1",
    schemaVersion: "1.0.0",
    dataVersion: "synthetic-trials-v1",
    durationMs: 1,
    modelCalls: 1,
    toolCalls: 0,
    tokens: null,
    demoMode: true,
    ...overrides,
  };
}

export function criterionOf(
  trialId: string,
  index: number,
  status: CriterionResult["status"],
  observedValue: CriterionResult["observedValue"],
): CriterionResult {
  const id = `${trialId}#inc-${index}`;
  return {
    id,
    text: `Uslov ${index}`,
    status,
    observedValue,
    sourceId: id,
    citation: { sourceId: id, quote: `Citat ${index} za ${trialId}` },
  };
}

const verdicts: TrialResult["verdict"][] = ["candidate", "pending", "excluded"];

export function trialsOf(count: number, idPrefix = "T-"): TrialResult[] {
  return Array.from({ length: count }, (_, i) => {
    const trialId = `${idPrefix}${i + 1}`;
    return {
      trialId,
      title: `Studija ${i + 1}`,
      verdict: verdicts[i % verdicts.length] ?? "candidate",
      criteria: [
        criterionOf(trialId, 1, "met", 62),
        criterionOf(trialId, 2, "not_met", true),
        criterionOf(trialId, 3, "unknown", null),
      ],
    };
  });
}

function baseFields(): Pick<
  OkResponse,
  "runId" | "profile" | "derived" | "explanation" | "meta"
> {
  return {
    runId: "run-1",
    profile: {
      age: 62,
      sex: "male",
      hba1c: { value: 8.1, unit: "%" },
      provenance: { age: { origin: "initial_input", round: 0 } },
    },
    derived: [
      {
        name: "eGFR",
        value: 62.11,
        unit: "mL/min/1.73 m²",
        formulaName: "CKD-EPI 2021",
        sourceReference: "docs/project-brief.md",
      },
    ],
    explanation: "Preliminarna provera; lekar donosi odluku.",
    meta: metaOf(),
  };
}

export function okResponse(overrides: Partial<OkResponse> = {}): OkResponse {
  return {
    ...baseFields(),
    status: "ok",
    stage: "completed",
    results: trialsOf(3),
    question: null,
    reason: null,
    error: null,
    ...overrides,
  };
}

export function clarificationResponse(
  overrides: Partial<ClarificationResponse> = {},
): ClarificationResponse {
  return {
    ...baseFields(),
    status: "needs_clarification",
    stage: "awaiting_input",
    results: [],
    question: {
      field: "insulin_last_3_months",
      text: "Da li je osoba koristila insulin?",
      options: ["Da", "Ne"],
      trialsResolved: ["T-1"],
    },
    reason: null,
    error: null,
    ...overrides,
  };
}

export function noMatchResponse(): InsufficientResponse {
  return {
    ...baseFields(),
    status: "insufficient_evidence",
    stage: "completed",
    results: [],
    question: null,
    reason: "no_matching_trial",
    error: null,
  };
}

export function notInSourcesResponse(): InsufficientResponse {
  return {
    ...baseFields(),
    profile: null,
    derived: [],
    status: "insufficient_evidence",
    stage: "completed",
    results: [],
    question: null,
    reason: "not_in_sources",
    error: null,
  };
}

export function rejectedResponse(): RejectedResponse {
  return {
    ...baseFields(),
    profile: null,
    derived: [],
    status: "rejected",
    stage: "rejected",
    results: [],
    question: null,
    reason: null,
    error: null,
  };
}

export function runErrorResponse(
  category: string,
  retryable: boolean,
  overrides: Partial<ErrorResponse> = {},
): ErrorResponse {
  return {
    ...baseFields(),
    profile: null,
    derived: [],
    status: "error",
    stage: "failed",
    results: [],
    question: null,
    reason: null,
    error: { category, message: "Poruka servera.", retryable },
    ...overrides,
  };
}

export function httpErrorBody(category: string, retryable: boolean) {
  return {
    status: "error" as const,
    error: { category, message: "Poruka servera.", retryable },
  };
}

// Lažni `Response` sa samo onim delovima koje interfejs koristi.
function fakeResponse(
  status: number,
  headers: Record<string, string>,
  json: () => Promise<unknown>,
) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string): string | null => headers[name.toLowerCase()] ?? null,
    },
    json,
  };
}

export function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return fakeResponse(status, headers, () =>
    Promise.resolve(body),
  ) as unknown as Response;
}

export function nonJsonResponse(status: number): Response {
  return fakeResponse(status, {}, () =>
    Promise.reject(new SyntaxError("Unexpected token <")),
  ) as unknown as Response;
}
