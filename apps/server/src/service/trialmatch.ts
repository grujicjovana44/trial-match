import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  ProfileSchema,
  RunResponseSchema,
  TrialSchema,
  type ErrorInfoSchema,
  type Extraction,
  type Profile,
  type ProfileField,
  type Question,
  type RunResponse,
  type Trial,
} from "../../../../packages/shared/src/index.js";
import { z } from "zod";
import type { AppConfig } from "../config/index.js";
import {
  normalizeCreatinine,
  normalizeHba1c,
  normalizeHeight,
  normalizeWeight,
  parseLocalizedNumber,
} from "../derived/units.js";
import { verifyCitation } from "../citations/verify.js";
import {
  getDerivedValues,
  evaluateCriteria,
} from "../matcher/evaluate-criteria.js";
import { selectNextQuestion } from "../questions/select-next-question.js";
import { retrieveTrials } from "../retrieval/retrieve.js";
import { ToolExecutionError, ToolExecutor } from "../tools/executor.js";
import { RunStore, type RunState } from "../store/run-store.js";
import {
  InvalidProfileTextError,
  MockLlmAdapter,
} from "../llm/mock-adapter.js";
import { RunBudget, RunBudgetError } from "../budget/run-budget.js";
import { canTransition } from "../workflow/state-machine.js";

type ErrorInfo = z.infer<typeof ErrorInfoSchema>;
export type ServiceOptions = {
  config: AppConfig;
  store?: RunStore;
  adapter?: MockLlmAdapter;
  trials?: Trial[];
  now?: () => number;
};

const initialProfileSchema = z
  .object({ profileText: z.string().min(1) })
  .strict();
const answerSchema = z.object({ answer: z.string().min(1) }).strict();
const hypothesisSchema = z.object({ profileText: z.string().min(1) }).strict();

export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly info: ErrorInfo,
  ) {
    super(info.message);
    this.name = "HttpError";
  }
}

export async function loadTrials(dataDir = "data/fixtures"): Promise<Trial[]> {
  const file = resolve(process.cwd(), dataDir, "trials.json");
  const raw: unknown = JSON.parse(await readFile(file, "utf8"));
  return TrialSchema.array().parse(raw);
}

export class TrialMatchService {
  readonly store: RunStore;
  readonly adapter: MockLlmAdapter;
  private readonly config: AppConfig;
  private readonly now: () => number;
  private readonly fixedTrials: Trial[] | undefined;

  constructor(options: ServiceOptions) {
    this.config = options.config;
    this.store = options.store ?? new RunStore();
    this.adapter = options.adapter ?? new MockLlmAdapter();
    this.now = options.now ?? Date.now;
    this.fixedTrials = options.trials;
  }

  private createBudget(startedAt: number, modelCalls = 0): RunBudget {
    return new RunBudget({
      maxModelCalls: this.config.MAX_MODEL_CALLS_PER_RUN,
      modelTimeoutMs: this.config.MODEL_TIMEOUT_MS,
      runTimeoutMs: this.config.RUN_TIMEOUT_MS,
      startedAt,
      initialModelCalls: modelCalls,
      now: this.now,
    });
  }

  async start(body: unknown): Promise<RunResponse> {
    const request = initialProfileSchema.safeParse(body);
    if (!request.success)
      throw this.badRequest("invalid_request", "Zahtev nije validan.");
    if (request.data.profileText.length > this.config.MAX_INPUT_CHARS) {
      throw new HttpError(413, {
        category: "input_too_large",
        message: "Unos je duži od dozvoljene granice.",
        retryable: false,
      });
    }
    const started = this.now();
    const callsBefore = this.adapter.callCount;
    const extraction = this.extractProfile(request.data.profileText);
    const modelCalls = this.adapter.callCount - callsBefore;
    if (
      ["diagnosis_request", "treatment_advice", "inclusion_decision"].includes(
        extraction.intent,
      )
    ) {
      const runId = randomUUID();
      const response = this.baseResponse(
        runId,
        "rejected",
        "rejected",
        null,
        [],
        [],
        "TrialMatch ne daje dijagnozu, savet o lečenju niti odluku o uključivanju.",
        null,
        null,
        this.meta(modelCalls, 0, started),
      );
      return this.validate(response);
    }
    const runId = randomUUID();
    const trials = this.fixedTrials ?? (await loadTrials(this.config.DATA_DIR));
    if (extraction.intent === "source_question") {
      const response = this.baseResponse(
        runId,
        "insufficient_evidence",
        "completed",
        null,
        [],
        [],
        "Dostupni lokalni izvori ne sadrže odgovor na traženo pitanje.",
        "not_in_sources",
        null,
        this.meta(modelCalls, 0, started),
      );
      return this.validate(response);
    }
    const profile = this.withProvenance(extraction.profile, "initial_input", 0);
    if (profile.ambiguities?.length) {
      const ambiguous = profile.ambiguities[0];
      const field = ambiguous?.field;
      const question: Question = {
        field: field && field !== "egfr" && field !== "bmi" ? field : "hba1c",
        text: "Da li je navedena vrednost HbA1c (%) ili glukoza (mmol/L)?",
        options: ["HbA1c (%)", "Glukoza (mmol/L)"],
        trialsResolved: trials.map((trial) => trial.trialId).sort(),
      };
      const response = this.baseResponse(
        runId,
        "needs_clarification",
        "awaiting_input",
        profile,
        [],
        [],
        "Vrednost nije dovoljno jasna za procenu; potrebna je dopuna.",
        null,
        question,
        this.meta(modelCalls, 0, started),
      );
      this.store.set(
        this.newState(runId, profile, trials, response, new Map(), 0, started),
      );
      return this.validate(response);
    }
    return this.evaluateAndStore(
      runId,
      profile,
      trials,
      0,
      started,
      new Map(),
      modelCalls,
    );
  }

  async answer(runId: string, body: unknown): Promise<RunResponse> {
    const request = answerSchema.safeParse(body);
    if (!request.success)
      throw this.badRequest("invalid_request", "Odgovor nije validan.");
    const state = this.requireRun(runId);
    if (
      state.response.status !== "needs_clarification" ||
      state.response.question === null
    ) {
      throw this.badRequest(
        "invalid_transition",
        "Ovo izvršavanje ne čeka odgovor.",
      );
    }
    if (!canTransition("awaiting_input", "ready"))
      throw this.badRequest(
        "invalid_transition",
        "Nedozvoljen prelaz izvršavanja.",
      );
    const rounds = state.questionRounds + 1;
    if (rounds > this.config.MAX_QUESTION_ROUNDS) {
      const response = this.errorResponse(
        runId,
        state.profile,
        "question_round_limit",
        "Dostignut je broj dozvoljenih dopuna.",
        false,
        state.response.meta,
      );
      state.response = response;
      state.questionRounds = rounds;
      this.store.set(state);
      return this.validate(response);
    }
    const updated = this.applyAnswer(
      state.profile,
      state.response.question,
      request.data.answer,
      rounds,
    );
    return this.evaluateAndStore(
      runId,
      updated,
      state.trials,
      rounds,
      state.createdAt,
      state.availableSources,
      state.response.meta.modelCalls,
      state.response.meta.toolCalls,
    );
  }

  async hypothesis(runId: string, body: unknown): Promise<RunResponse> {
    const request = hypothesisSchema.safeParse(body);
    if (!request.success)
      throw this.badRequest(
        "invalid_hypothesis",
        "Hipotetička izmena nije validna.",
      );
    if (request.data.profileText.length > this.config.MAX_INPUT_CHARS) {
      throw new HttpError(413, {
        category: "input_too_large",
        message: "Unos je duži od dozvoljene granice.",
        retryable: false,
      });
    }
    const state = this.requireRun(runId);
    if (state.response.stage !== "completed")
      throw this.badRequest(
        "invalid_transition",
        "Hipoteza je dostupna tek nakon završenog rezultata.",
      );
    const budget = this.createBudget(
      state.createdAt,
      state.response.meta.modelCalls,
    );
    try {
      budget.consumeModelCall();
    } catch (error) {
      if (!(error instanceof RunBudgetError)) throw error;
      const response = this.errorResponse(
        runId,
        state.profile,
        error.category,
        error.message,
        false,
        state.response.meta,
      );
      state.response = response;
      this.store.set(state);
      return this.validate(response);
    }
    const callsBefore = this.adapter.callCount;
    const extraction = this.extractProfile(request.data.profileText);
    if (
      ["diagnosis_request", "treatment_advice", "inclusion_decision"].includes(
        extraction.intent,
      )
    ) {
      throw this.badRequest(
        "forbidden_intent",
        "Hipotetička izmena ne može tražiti dijagnozu, lečenje ili odluku o uključivanju.",
      );
    }
    if (
      extraction.profile.ambiguities?.length ||
      Object.keys(extraction.profile).length === 0
    ) {
      throw this.badRequest(
        "ambiguous_hypothesis",
        "Hipotetička izmena nije dovoljno jasna; sačuvano izvršavanje nije promenjeno.",
      );
    }
    const modelCalls =
      state.response.meta.modelCalls + this.adapter.callCount - callsBefore;
    const patch = this.withProvenance(
      extraction.profile,
      "hypothesis",
      state.questionRounds,
    );
    const merged = ProfileSchema.parse({
      ...state.profile,
      ...patch,
      provenance: { ...state.profile.provenance, ...patch.provenance },
    });
    return this.evaluateAndStore(
      runId,
      merged,
      state.trials,
      state.questionRounds,
      state.createdAt,
      state.availableSources,
      modelCalls,
      state.response.meta.toolCalls,
    );
  }

  private async evaluateAndStore(
    runId: string,
    profile: Profile,
    trials: Trial[],
    rounds: number,
    started: number,
    priorSources = new Map<string, string>(),
    modelCalls = 0,
    priorToolCalls = 0,
  ): Promise<RunResponse> {
    const retrieval = retrieveTrials(profile, trials, {
      maxCandidates: 10,
      maxSnippets: 5,
      maxContextChars: this.config.MAX_CONTEXT_CHARS,
    });
    const availableSources = new Map([
      ...priorSources,
      ...retrieval.sourceTexts,
    ]);
    if (this.createBudget(started, modelCalls).isRunTimedOut()) {
      const response = this.errorResponse(
        runId,
        profile,
        "run_timeout",
        "Prekoračeno je ukupno dozvoljeno trajanje provere.",
        false,
        this.meta(modelCalls, priorToolCalls, started),
      );
      this.store.set(
        this.newState(
          runId,
          profile,
          trials,
          response,
          availableSources,
          rounds,
          started,
        ),
      );
      return this.validate(response);
    }
    if (retrieval.trials.length === 0) {
      const response = this.baseResponse(
        runId,
        "insufficient_evidence",
        "completed",
        profile,
        getDerivedValues(profile),
        [],
        "Nijedna dostupna studija ne odgovara izdvojenom profilu.",
        "no_matching_trial",
        null,
        this.meta(modelCalls, priorToolCalls, started),
      );
      this.store.set(
        this.newState(
          runId,
          profile,
          trials,
          response,
          availableSources,
          rounds,
          started,
        ),
      );
      return this.validate(response);
    }
    const tools = new ToolExecutor(
      Math.max(0, this.config.MAX_TOOL_CALLS_PER_RUN - priorToolCalls),
      this.config.TOOL_TIMEOUT_MS,
      evaluateCriteria,
    );
    let evaluated: ReturnType<typeof evaluateCriteria>;
    try {
      const output = await tools.execute("evaluate_criteria", {
        profile,
        trials: retrieval.trials,
      });
      evaluated = output.results;
    } catch (error) {
      const category =
        error instanceof ToolExecutionError ? error.category : "tool_error";
      const response = this.errorResponse(
        runId,
        profile,
        category,
        "Automatska provera nije mogla bezbedno da se završi.",
        false,
        this.meta(modelCalls, priorToolCalls + tools.callCount, started),
      );
      this.store.set(
        this.newState(
          runId,
          profile,
          trials,
          response,
          availableSources,
          rounds,
          started,
        ),
      );
      return this.validate(response);
    }
    for (const result of evaluated) {
      for (const criterion of result.criteria) {
        if (!verifyCitation(criterion.citation, availableSources)) {
          const response = this.errorResponse(
            runId,
            profile,
            "citation_validation_failed",
            "Izvor kriterijuma nije dostupan za ovu proveru.",
            false,
            this.meta(modelCalls, priorToolCalls + tools.callCount, started),
          );
          this.store.set(
            this.newState(
              runId,
              profile,
              trials,
              response,
              availableSources,
              rounds,
              started,
            ),
          );
          return this.validate(response);
        }
      }
    }
    const question = selectNextQuestion(profile, retrieval.trials, evaluated);
    if (question && rounds < this.config.MAX_QUESTION_ROUNDS) {
      const response = this.baseResponse(
        runId,
        "needs_clarification",
        "awaiting_input",
        profile,
        getDerivedValues(profile),
        evaluated,
        "Nedostaje podatak za deo kriterijuma; prikazani statusi ostaju nepoznati dok se profil ne dopuni.",
        null,
        question,
        this.meta(modelCalls, priorToolCalls + tools.callCount, started),
      );
      this.store.set(
        this.newState(
          runId,
          profile,
          trials,
          response,
          availableSources,
          rounds,
          started,
        ),
      );
      return this.validate(response);
    }
    if (question && rounds >= this.config.MAX_QUESTION_ROUNDS) {
      const response = this.errorResponse(
        runId,
        profile,
        "question_round_limit",
        "Dostignut je broj dozvoljenih dopuna.",
        false,
        this.meta(modelCalls, priorToolCalls + tools.callCount, started),
      );
      this.store.set(
        this.newState(
          runId,
          profile,
          trials,
          response,
          availableSources,
          rounds,
          started,
        ),
      );
      return this.validate(response);
    }
    if (evaluated.every((result) => result.verdict === "excluded")) {
      const response = this.baseResponse(
        runId,
        "insufficient_evidence",
        "completed",
        profile,
        getDerivedValues(profile),
        [],
        "Nijedna dostupna studija ne odgovara profilu prema proverljivim kriterijumima.",
        "no_matching_trial",
        null,
        this.meta(modelCalls, priorToolCalls + tools.callCount, started),
      );
      this.store.set(
        this.newState(
          runId,
          profile,
          trials,
          response,
          availableSources,
          rounds,
          started,
        ),
      );
      return this.validate(response);
    }
    const response = this.baseResponse(
      runId,
      "ok",
      "completed",
      profile,
      getDerivedValues(profile),
      evaluated,
      "Ovo je preliminarna provera kriterijuma. Nepoznati i ručno proveravani uslovi zahtevaju procenu lekara.",
      null,
      null,
      this.meta(modelCalls, priorToolCalls + tools.callCount, started),
    );
    this.store.set(
      this.newState(
        runId,
        profile,
        trials,
        response,
        availableSources,
        rounds,
        started,
      ),
    );
    return this.validate(response);
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

  private newState(
    runId: string,
    profile: Profile,
    trials: Trial[],
    response: RunResponse,
    availableSources: Map<string, string>,
    questionRounds = 0,
    createdAt = this.now(),
  ): RunState {
    return {
      runId,
      profile,
      trials,
      response,
      questionRounds,
      createdAt,
      availableSources,
    };
  }

  private requireRun(runId: string): RunState {
    const state = this.store.get(runId);
    if (!state)
      throw new HttpError(404, {
        category: "run_not_found",
        message: "Izvršavanje nije pronađeno. Pokrenite novu proveru.",
        retryable: false,
      });
    return state;
  }

  private badRequest(category: string, message: string): HttpError {
    return new HttpError(400, { category, message, retryable: false });
  }

  private extractProfile(text: string): Extraction {
    try {
      const extraction = this.adapter.extract(text);
      this.validateTechnicalRanges(extraction.profile);
      return extraction;
    } catch (error) {
      if (
        error instanceof InvalidProfileTextError ||
        error instanceof z.ZodError
      ) {
        throw this.badRequest(
          "invalid_profile",
          "Jedna ili više vrednosti profila nisu validne.",
        );
      }
      if (error instanceof RangeError) {
        throw this.badRequest(
          "invalid_profile",
          "Jedinica ili tehnička granica unosa nije podržana.",
        );
      }
      throw error;
    }
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

  private baseResponse(
    runId: string,
    status: RunResponse["status"],
    stage: RunResponse["stage"],
    profile: Profile | null,
    derived: ReturnType<typeof getDerivedValues>,
    results: ReturnType<typeof evaluateCriteria>,
    explanation: string,
    reason: "no_matching_trial" | "not_in_sources" | null,
    question: Question | null,
    meta = this.meta(0, 0, this.now()),
  ): RunResponse {
    return RunResponseSchema.parse({
      runId,
      status,
      stage,
      profile,
      derived,
      results,
      explanation,
      reason,
      question,
      error: null,
      meta,
    });
  }

  private errorResponse(
    runId: string,
    profile: Profile | null,
    category: string,
    message: string,
    retryable: boolean,
    meta: RunResponse["meta"],
  ): RunResponse {
    return this.validate({
      runId,
      status: "error",
      stage: "failed",
      profile,
      derived: [],
      results: [],
      explanation: message,
      question: null,
      reason: null,
      error: { category, message, retryable },
      meta,
    });
  }

  private meta(
    modelCalls: number,
    toolCalls: number,
    started: number,
  ): RunResponse["meta"] {
    return {
      modelId: this.adapter.modelId,
      promptVersion: "demo.v1",
      schemaVersion: "1.0.0",
      dataVersion: "synthetic-trials-v1",
      durationMs: Math.max(0, this.now() - started),
      modelCalls,
      toolCalls,
      tokens: null,
      demoMode: true,
    };
  }

  private validate(response: unknown): RunResponse {
    return RunResponseSchema.parse(response);
  }
}
