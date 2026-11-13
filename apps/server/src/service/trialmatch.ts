import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import {
  DatasetManifestSchema,
  ExtractionSchema,
  ProfileSchema,
  RunResponseSchema,
  TrialSchema,
  type DatasetManifest,
  type Profile,
  type ProfileField,
  type Question,
  type RunResponse,
  type Trial,
  type DerivedValue,
  type Extraction,
} from "../../../../packages/shared/src/index.js";
import type { AppConfig } from "../config/index.js";
import {
  normalizeCreatinine,
  normalizeHba1c,
  normalizeHeight,
  normalizeWeight,
  parseLocalizedNumber,
} from "../derived/units.js";
import { verifyCitation } from "../citations/verify.js";
import { evaluateCriteria } from "../matcher/evaluate-criteria.js";
import { retrieveTrials } from "../retrieval/retrieve.js";
import { ToolExecutionError, ToolExecutor } from "../tools/executor.js";
import { RunStore, type RunState } from "../store/run-store.js";
import {
  InvalidProfileTextError,
  MockLlmAdapter,
} from "../llm/mock-adapter.js";
import { GeminiAdapter } from "../llm/gemini-adapter.js";
import type { LlmAdapter } from "../llm/adapter.js";
import { ModelSession } from "../llm/session.js";
import { ModelRequestError } from "../llm/generate-structured.js";
import { RunBudgetError } from "../budget/run-budget.js";

export type ServiceOptions = {
  config: AppConfig;
  store?: RunStore;
  adapter?: LlmAdapter;
  trials?: Trial[];
  manifest?: DatasetManifest;
  now?: () => number;
  toolOverrides?: Record<string, (input: unknown) => unknown>;
};
export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly info: { category: string; message: string; retryable: boolean },
  ) {
    super(info.message);
    this.name = "HttpError";
  }
}
export async function loadTrials(dataDir = "data/fixtures"): Promise<Trial[]> {
  return TrialSchema.array().parse(
    JSON.parse(await readFile(resolve(dataDir, "trials.json"), "utf8")),
  );
}
const ExplanationSchema = z
  .object({
    text: z.string().min(1),
    references: z.array(
      z
        .object({
          criterionId: z.string().min(1),
          sourceId: z.string().min(1),
          quote: z.string().min(1),
        })
        .strict(),
    ),
  })
  .strict();
const forbidden = (extraction: Extraction) =>
  ["diagnosis_request", "treatment_advice", "inclusion_decision"].includes(
    extraction.intent,
  );
export class TrialMatchService {
  readonly store: RunStore;
  readonly adapter: LlmAdapter;
  readonly sessions = new Map<string, ModelSession>();
  private readonly caches = new Map<
    string,
    Map<string, { key: string; value: DerivedValue }>
  >();
  private manifest: DatasetManifest | undefined;
  private trials: Trial[] | undefined;
  private readonly now: () => number;
  private readonly config: AppConfig;
  constructor(private readonly options: ServiceOptions) {
    this.config = options.config;
    this.store = options.store ?? new RunStore();
    this.adapter =
      options.adapter ??
      (this.config.DEMO_MODE
        ? new MockLlmAdapter()
        : new GeminiAdapter(this.config.GEMINI_API_KEY ?? ""));
    this.now = options.now ?? Date.now;
    this.manifest = options.manifest
      ? DatasetManifestSchema.parse(options.manifest)
      : undefined;
  }
  async initialize(): Promise<void> {
    if (!this.manifest)
      this.manifest = DatasetManifestSchema.parse(
        JSON.parse(
          await readFile(
            resolve(
              this.config.DATA_DIR === "data/fixtures"
                ? "data/manifest.json"
                : this.config.DATA_DIR + "/manifest.json",
            ),
            "utf8",
          ),
        ),
      );
    if (
      !this.manifest.synthetic &&
      /nepotvrđeno|unconfirmed|unverified/iu.test(this.manifest.license)
    )
      throw new Error("Licenca korpusa nije potvrđena za upotrebu.");
    const trials =
      this.trials ??
      TrialSchema.array().parse(
        this.options.trials ?? (await loadTrials(this.config.DATA_DIR)),
      );
    if (
      this.manifest.includedCount !== undefined &&
      this.manifest.includedCount !== trials.length
    )
      throw new Error("Broj studija se ne podudara sa manifestom korpusa.");
    if (
      !this.manifest.synthetic &&
      trials.some((trial) => !trial.criteria.length)
    )
      throw new Error("Realni korpus sadrži studiju bez pregledanih pravila.");
    this.trials = trials;
  }
  private input(body: unknown, field: "answer" | "profileText"): string {
    const parsed = z
      .object({ [field]: z.string().min(1) })
      .strict()
      .safeParse(body);
    if (!parsed.success)
      throw this.badRequest(
        "invalid_request",
        "Zahtev nije ispravan. Proverite unos.",
      );
    const text = parsed.data[field]!;
    if (text.length > this.config.MAX_INPUT_CHARS)
      throw new HttpError(413, {
        category: "input_too_large",
        message: "Unos je duži od dozvoljene granice.",
        retryable: false,
      });
    return text;
  }
  async start(body: unknown): Promise<RunResponse> {
    const text = this.input(body, "profileText");
    await this.initialize();
    const runId = randomUUID();
    const session = new ModelSession(this.now(), this.config, this.now);
    this.sessions.set(runId, session);
    const trials = this.trials;
    if (!trials)
      throw new Error("Validirani skup studija nije učitan pri startu.");
    try {
      const extraction = await this.extract(text, session);
      if (forbidden(extraction))
        return this.save(runId, {}, trials, 0, {
          status: "rejected",
          stage: "rejected",
          profile: null,
          explanation:
            "TrialMatch ne daje dijagnozu, savet o lečenju niti odluku o uključivanju.",
        });
      if (extraction.intent === "source_question")
        return this.save(runId, {}, trials, 0, {
          status: "insufficient_evidence",
          stage: "completed",
          profile: null,
          reason: "not_in_sources",
          explanation:
            "Dostupni lokalni izvori ne sadrže odgovor na traženo pitanje.",
        });
      const ambiguity = extraction.profile.ambiguities?.[0];
      if (ambiguity) {
        const field =
          ambiguity.field === "egfr"
            ? "creatinine"
            : ambiguity.field === "bmi"
              ? "height"
              : ambiguity.field;
        const text =
          ambiguity.field === "hba1c"
            ? "Da li je navedena vrednost HbA1c (%) ili glukoza (mmol/L)?"
            : "Navedite jasno vrednost i jedinicu traženog podatka.";
        return this.save(runId, extraction.profile, trials, 0, {
          status: "needs_clarification",
          stage: "awaiting_input",
          question: { field, text, trialsResolved: [] },
          explanation:
            "Nedostaje jasnoća u unosu; potrebna je dopuna sintetičkog profila.",
        });
      }
      return await this.evaluate(
        runId,
        this.withProvenance(extraction.profile, "initial_input", 0),
        trials,
        0,
        text,
      );
    } catch (error) {
      if (error instanceof HttpError) throw error;
      return this.fail(runId, {}, trials, 0, error);
    }
  }
  async answer(runId: string, body: unknown): Promise<RunResponse> {
    const text = this.input(body, "answer");
    const state = this.requireRun(runId);
    if (state.response.status !== "needs_clarification")
      throw this.badRequest(
        "invalid_transition",
        "Ova radnja nije dostupna u trenutnom stanju provere.",
      );
    try {
      this.sessions.get(runId)!.assertTime();
      if (state.questionRounds >= this.config.MAX_QUESTION_ROUNDS)
        throw new ToolExecutionError("question_round_limit");
      return await this.evaluate(
        runId,
        this.applyAnswer(
          state.profile,
          state.response.question,
          text,
          state.questionRounds + 1,
        ),
        state.trials,
        state.questionRounds + 1,
      );
    } catch (error) {
      if (error instanceof HttpError) throw error;
      return this.fail(
        runId,
        state.profile,
        state.trials,
        state.questionRounds,
        error,
      );
    }
  }
  async hypothesis(runId: string, body: unknown): Promise<RunResponse> {
    const text = this.input(body, "profileText");
    const state = this.requireRun(runId);
    if (state.response.stage !== "completed")
      throw this.badRequest(
        "invalid_transition",
        "Ova radnja nije dostupna u trenutnom stanju provere.",
      );
    try {
      const extraction = await this.extract(text, this.sessions.get(runId)!);
      if (forbidden(extraction))
        throw this.badRequest(
          "forbidden_intent",
          "Unesite samo izmenu sintetičkog profila.",
        );
      if (
        extraction.intent !== "eligibility_check" ||
        extraction.profile.ambiguities?.length ||
        Object.keys(extraction.profile).length === 0
      )
        throw this.badRequest(
          "ambiguous_hypothesis",
          "Hipotetička izmena nije jasna. Navedite vrednost i jedinicu.",
        );
      const patch = this.withProvenance(
        extraction.profile,
        "hypothesis",
        state.questionRounds,
      );
      const profile = ProfileSchema.parse({
        ...state.profile,
        ...patch,
        provenance: { ...state.profile.provenance, ...patch.provenance },
      });
      return await this.evaluate(
        runId,
        profile,
        state.trials,
        state.questionRounds,
      );
    } catch (error) {
      if (error instanceof HttpError) throw error;
      return this.fail(
        runId,
        state.profile,
        state.trials,
        state.questionRounds,
        error,
      );
    }
  }
  private async extract(
    text: string,
    session: ModelSession,
  ): Promise<Extraction> {
    try {
      return await session.generate(
        this.adapter,
        "extract_profile.v1",
        { text },
        ExtractionSchema,
        (extraction) => {
          if (extraction.profile.provenance)
            throw new Error("Model ne određuje poreklo.");
          this.validateTechnicalRanges(extraction.profile);
          // A model must not introduce a numeric fact absent from the supplied text.
          const numbers =
            text
              .match(/-?\d+(?:[.,]\d+)?/gu)
              ?.map((n) => Number(n.replace(",", "."))) ?? [];
          const measurements: Array<{
            value: number;
            original: number;
            field: string;
          }> = [];
          if (extraction.profile.age !== undefined)
            measurements.push({
              value: extraction.profile.age,
              original: extraction.profile.age,
              field: "age",
            });
          for (const [field, measurement] of [
            ["hba1c", extraction.profile.hba1c],
            ["creatinine", extraction.profile.creatinine],
            ["height", extraction.profile.height],
            ["weight", extraction.profile.weight],
          ] as const) {
            if (!measurement) continue;
            let normalized = measurement.value;
            if (field === "creatinine")
              normalized = normalizeCreatinine(measurement).value;
            else if (field === "height")
              normalized = normalizeHeight(measurement).value;
            else if (field === "weight")
              normalized = normalizeWeight(measurement).value;
            measurements.push({
              value: normalized,
              original: measurement.value,
              field,
            });
          }
          for (const item of measurements)
            if (
              !numbers.some(
                (value) => value === item.original || value === item.value,
              )
            )
              throw new Error(`Vrednost nije u unosu: ${item.field}.`);
        },
      );
    } catch (error) {
      if (
        error instanceof InvalidProfileTextError ||
        error instanceof z.ZodError ||
        error instanceof RangeError
      )
        throw this.badRequest(
          "invalid_profile",
          "Podaci profila nisu ispravni. Proverite vrednosti i jedinice.",
        );
      throw error;
    }
  }
  private async evaluate(
    runId: string,
    profile: Profile,
    trials: Trial[],
    rounds: number,
    inputText = "",
  ): Promise<RunResponse> {
    const session = this.sessions.get(runId)!;
    session.assertTime();
    const derived: DerivedValue[] = [];
    const tools = new ToolExecutor(
      this.config.MAX_TOOL_CALLS_PER_RUN - session.toolCalls,
      Math.min(this.config.TOOL_TIMEOUT_MS, session.remaining()),
      evaluateCriteria,
      this.options.toolOverrides,
    );
    const invoke = async (name: string, input: unknown): Promise<unknown> => {
      session.assertTime();
      const started = this.now();
      const before = tools.callCount;
      let outcome = "complete";
      try {
        const result = await tools.execute(name, input);
        session.assertTime();
        return result;
      } catch (error) {
        outcome =
          error instanceof ToolExecutionError ? error.category : "tool_error";
        throw error;
      } finally {
        session.toolCalls += tools.callCount - before;
        session.events.push({
          step: "tool",
          tool: name,
          durationMs: this.now() - started,
          outcome,
        });
      }
    };
    const cache =
      this.caches.get(runId) ??
      new Map<string, { key: string; value: DerivedValue }>();
    this.caches.set(runId, cache);
    const compute = async (
      name: "compute_egfr" | "compute_bmi",
      input: unknown,
    ) => {
      const key = JSON.stringify(input);
      const cached = cache.get(name);
      if (cached?.key === key) {
        derived.push(cached.value);
        return;
      }
      const { DerivedValueSchema } =
        await import("../../../../packages/shared/src/index.js");
      const value = DerivedValueSchema.parse(await invoke(name, input));
      cache.set(name, { key, value });
      derived.push(value);
    };
    if (profile.age !== undefined && profile.sex && profile.creatinine)
      await compute("compute_egfr", {
        age: profile.age,
        sex: profile.sex,
        creatinine: normalizeCreatinine(profile.creatinine),
      });
    if (profile.height && profile.weight)
      await compute("compute_bmi", {
        height: normalizeHeight(profile.height),
        weight: normalizeWeight(profile.weight),
      });
    const retrieval = retrieveTrials(profile, trials, {
      maxCandidates: 10,
      maxSnippets: 5,
      maxContextChars: this.config.MAX_CONTEXT_CHARS,
      derived,
      excludeFields:
        /(?:\bbez\b|\bne\s+(?:koristi|koriste|uključuje|ukljucuje|uključuju|ukljucuju|primenjuje|primenjuju)\b).{0,32}\b(?:bmi|indeks(?:a)?\s+telesne\s+mase)\b/iu.test(
          inputText,
        )
          ? ["bmi"]
          : [],
    });
    if (retrieval.trials.length === 0)
      return this.save(runId, profile, trials, rounds, {
        status: "insufficient_evidence",
        stage: "completed",
        reason: "not_in_sources",
        derived,
        explanation: "Nema odgovarajućih izvora u dostupnom skupu.",
      });
    const { TrialResultSchema, QuestionSchema } =
      await import("../../../../packages/shared/src/index.js");
    const evaluated = z
      .object({ results: TrialResultSchema.array() })
      .strict()
      .parse(
        await invoke("evaluate_criteria", {
          profile,
          trials: retrieval.trials,
          derived,
        }),
      ).results;
    for (const trial of evaluated)
      for (const criterion of trial.criteria)
        if (!verifyCitation(criterion.citation, retrieval.sourceTexts))
          throw new ToolExecutionError("invalid_tool_result");
    let question = QuestionSchema.nullable().parse(
      await invoke("select_next_question", {
        profile,
        trials: retrieval.trials,
        results: evaluated,
        derived,
      }),
    );
    if (profile.ambiguities?.length) {
      const field = profile.ambiguities[0]!.field;
      question = {
        field: field === "egfr" || field === "bmi" ? "creatinine" : field,
        text: "Navedite jasno vrednost i jedinicu traženog podatka.",
        trialsResolved: retrieval.trials.map((t) => t.trialId),
      };
    }
    if (question) {
      if (rounds >= this.config.MAX_QUESTION_ROUNDS)
        throw new ToolExecutionError("question_round_limit");
      return this.save(
        runId,
        profile,
        trials,
        rounds,
        {
          status: "needs_clarification",
          stage: "awaiting_input",
          derived,
          results: evaluated,
          question,
          explanation:
            "Nedostaje podatak; potrebna je dopuna sintetičkog profila.",
        },
        retrieval.sourceTexts,
      );
    }
    if (evaluated.every((t) => t.verdict === "excluded"))
      return this.save(
        runId,
        profile,
        trials,
        rounds,
        {
          status: "insufficient_evidence",
          stage: "completed",
          reason: "no_matching_trial",
          derived,
          excludedTrials: evaluated,
          explanation:
            "Sve procenjene studije su isključene prema navedenim kriterijumima.",
        },
        retrieval.sourceTexts,
      );
    const fallback =
      "Ovo je preliminarna provera kriterijuma. Nepoznati i ručno proveravani uslovi zahtevaju procenu lekara.";
    const allowed = new Map(
      retrieval.sourceIds.map((id) => [id, retrieval.sourceTexts.get(id)!]),
    );
    let supported = false;
    try {
      const explanation = await session.generate(
        this.adapter,
        "explain_results.v1",
        {
          results: evaluated.map((t) => ({
            trialId: t.trialId,
            verdict: t.verdict,
            criteria: t.criteria.filter((c) => allowed.has(c.sourceId)),
          })),
          sources: Object.fromEntries(allowed),
        },
        ExplanationSchema,
      );
      supported =
        explanation.references.length > 0 &&
        explanation.references.every(
          (ref) =>
            evaluated.some((t) =>
              t.criteria.some(
                (c) => c.id === ref.criterionId && c.sourceId === ref.sourceId,
              ),
            ) && verifyCitation(ref, allowed),
        );
    } catch {
      // The matcher result is complete; an unverified explanation is optional.
      session.events.push({
        step: "grounding",
        durationMs: 0,
        outcome: "fallback_after_explanation_error",
      });
    }
    // Exact quotes do not establish semantic support: until human review, use the verified status template.
    session.events.push({
      step: "grounding",
      durationMs: 0,
      outcome: supported ? "semantic_review_required" : "fallback",
      sourceIds: [...allowed.keys()],
    });
    return this.save(
      runId,
      profile,
      trials,
      rounds,
      {
        status: "ok",
        stage: "completed",
        derived,
        results: evaluated,
        explanation: fallback,
      },
      retrieval.sourceTexts,
    );
  }
  private save(
    runId: string,
    profile: Profile,
    trials: Trial[],
    rounds: number,
    fields: Record<string, unknown>,
    sources = new Map<string, string>(),
  ): RunResponse {
    const session = this.sessions.get(runId)!;
    const response = RunResponseSchema.parse({
      runId,
      profile,
      derived: [],
      results: [],
      excludedTrials: [],
      question: null,
      reason: null,
      error: null,
      ...fields,
      meta: {
        modelId: this.adapter.modelId,
        providerId: this.adapter.providerId,
        promptVersion: "phase2.v1",
        schemaVersion: "2.0.0",
        dataVersion: this.manifest!.version,
        dataSnapshotDate: this.manifest!.date,
        dataOrigin: this.manifest!.origin,
        dataSynthetic: this.manifest!.synthetic,
        durationMs: Math.max(0, this.now() - session.createdAt),
        modelCalls: session.calls,
        modelAttempts: session.attempts,
        toolCalls: session.toolCalls,
        tokens: session.tokens,
        demoMode: this.adapter.providerId === "mock",
      },
    });
    this.store.set({
      runId,
      profile,
      trials,
      response,
      questionRounds: rounds,
      createdAt: session.createdAt,
      availableSources: sources,
    });
    return response;
  }
  private fail(
    runId: string,
    profile: Profile,
    trials: Trial[],
    rounds: number,
    error: unknown,
  ): RunResponse {
    const category =
      error instanceof RunBudgetError || error instanceof ToolExecutionError
        ? error.category
        : error instanceof ModelRequestError
          ? error.timedOut
            ? "model_timeout"
            : error.statusCode === 429
              ? "provider_rate_limit"
              : error.statusCode === 401 || error.statusCode === 403
                ? "provider_auth_error"
                : error.statusCode === 400 || error.statusCode === 404
                  ? "provider_config_error"
                  : "provider_unavailable"
          : "invalid_model_output";
    const retryable = [
      "model_timeout",
      "provider_rate_limit",
      "provider_unavailable",
    ].includes(category);
    const message = "Provera nije završena. Počnite novu proveru.";
    return this.save(runId, profile, trials, rounds, {
      status: "error",
      stage: "failed",
      explanation: message,
      error: { category, message, retryable },
    });
  }
  private requireRun(runId: string): RunState {
    const state = this.store.get(runId);
    if (!state)
      throw new HttpError(404, {
        category: "run_not_found",
        message: "Provera nije pronađena. Počnite iznova.",
        retryable: false,
      });
    return state;
  }
  private badRequest(category: string, message: string): HttpError {
    return new HttpError(400, { category, message, retryable: false });
  }
  private applyAnswer(
    profile: Profile,
    question: Question,
    answer: string,
    round: number,
  ): Profile {
    const lower = answer.trim().toLocaleLowerCase("sr");
    const patch: Partial<Profile> = {};
    if (question.field === "insulin_last_3_months") {
      if (["ne", "no", "nije"].includes(lower))
        patch.insulin_last_3_months = false;
      else if (["da", "yes", "jeste"].includes(lower))
        patch.insulin_last_3_months = true;
    } else if (question.field === "sex") {
      if (["ženski", "zenski", "žena", "female"].includes(lower))
        patch.sex = "female";
      else if (["muški", "muski", "muškarac", "male"].includes(lower))
        patch.sex = "male";
    } else if (question.field === "age") {
      const age = parseLocalizedNumber(answer);
      if (age !== undefined && Number.isInteger(age) && age >= 0 && age <= 120)
        patch.age = age;
    } else if (
      ["hba1c", "creatinine", "height", "weight"].includes(question.field)
    ) {
      const measurement = this.parseAnswerMeasurement(question.field, answer);
      if (measurement !== undefined)
        Object.assign(patch, { [question.field]: measurement });
    }
    const provenance = { ...profile.provenance };
    for (const field of Object.keys(patch) as ProfileField[]) {
      provenance[field] = { origin: "answer", round };
    }
    const clarifiesGlucose =
      question.field === "hba1c" && /\b(glukoza|šećer)\b/u.test(lower);
    const ambiguities = (profile.ambiguities ?? []).filter(
      (item) => item.field !== question.field,
    );
    if (!Object.hasOwn(patch, question.field) && !clarifiesGlucose) {
      ambiguities.push({
        field: question.field,
        reason: "Odgovor nije mogao pouzdano da se protumači.",
      });
    }
    return ProfileSchema.parse({
      ...profile,
      ...patch,
      ambiguities,
      provenance,
    });
  }

  private parseAnswerMeasurement(
    field: ProfileField,
    answer: string,
  ): { value: number; unit: string } | undefined {
    const match = /^\s*(-?\d+(?:[.,]\d+)?)\s*([^\d\s].*?)?\s*$/u.exec(answer);
    const number = match?.[1] ? parseLocalizedNumber(match[1]) : undefined;
    const rawUnit = match?.[2]?.trim();
    if (number === undefined || !rawUnit) return undefined;
    const measurement = { value: number, unit: rawUnit };
    try {
      let normalized: { value: number; unit: string } | undefined;
      switch (field) {
        case "hba1c":
          normalized = normalizeHba1c(measurement);
          break;
        case "creatinine":
          normalized = normalizeCreatinine(measurement);
          break;
        case "height":
          normalized = normalizeHeight(measurement);
          break;
        case "weight":
          normalized = normalizeWeight(measurement);
          break;
        default:
          return undefined;
      }
      if (!normalized) return undefined;
      this.validateTechnicalRanges(
        ProfileSchema.parse({ [field]: normalized }),
      );
      return normalized;
    } catch (error) {
      if (error instanceof RangeError) return undefined;
      throw error;
    }
  }

  private withProvenance(
    profile: Profile,
    origin: "initial_input" | "hypothesis",
    round: number,
  ): Profile {
    const provenance = { ...profile.provenance };
    const fields: ProfileField[] = [
      "age",
      "sex",
      "hba1c",
      "creatinine",
      "height",
      "weight",
      "insulin_last_3_months",
      "medications",
      "stated_diagnoses",
    ];
    for (const field of fields) {
      if (Object.hasOwn(profile, field)) provenance[field] = { origin, round };
    }
    return ProfileSchema.parse({ ...profile, provenance });
  }

  private validateTechnicalRanges(profile: Profile): void {
    const measuredRanges: Array<{
      value:
        | Profile["hba1c"]
        | Profile["creatinine"]
        | Profile["height"]
        | Profile["weight"];
      normalize: (measurement: { value: number; unit: string }) => {
        value: number;
      };
      minimum: number;
      maximum: number;
    }> = [
      {
        value: profile.hba1c,
        normalize: normalizeHba1c,
        minimum: 3,
        maximum: 20,
      },
      {
        value: profile.creatinine,
        normalize: normalizeCreatinine,
        minimum: 0.1,
        maximum: 20,
      },
      {
        value: profile.height,
        normalize: normalizeHeight,
        minimum: 50,
        maximum: 250,
      },
      {
        value: profile.weight,
        normalize: normalizeWeight,
        minimum: 2,
        maximum: 400,
      },
    ];
    for (const range of measuredRanges) {
      if (!range.value) continue;
      const normalized = range.normalize(range.value);
      if (
        normalized.value < range.minimum ||
        normalized.value > range.maximum
      ) {
        throw new RangeError("Vrednost je van tehničke granice unosa.");
      }
    }
  }
}
