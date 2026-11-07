export type RunBudgetErrorCategory =
  "model_call_limit" | "model_timeout" | "run_timeout";

export class RunBudgetError extends Error {
  constructor(readonly category: RunBudgetErrorCategory) {
    const messages: Record<RunBudgetErrorCategory, string> = {
      model_call_limit: "Dostignuto je ograničenje poziva modela.",
      model_timeout: "Poziv modela je prekoračio dozvoljeno trajanje.",
      run_timeout: "Prekoračeno je ukupno dozvoljeno trajanje provere.",
    };
    super(messages[category]);
    this.name = "RunBudgetError";
  }
}

export type RunBudgetOptions = {
  maxModelCalls: number;
  modelTimeoutMs: number;
  runTimeoutMs: number;
  startedAt: number;
  initialModelCalls?: number;
  now?: () => number;
};

export class RunBudget {
  private modelCalls: number;
  private networkAttempts = 0;
  private readonly now: () => number;

  constructor(private readonly options: RunBudgetOptions) {
    this.modelCalls = options.initialModelCalls ?? 0;
    this.now = options.now ?? Date.now;
  }

  get modelCallCount(): number {
    return this.modelCalls;
  }

  get networkAttemptCount(): number {
    return this.networkAttempts;
  }

  isRunTimedOut(): boolean {
    return this.now() - this.options.startedAt >= this.options.runTimeoutMs;
  }

  recordNetworkAttempt(): void {
    this.networkAttempts += 1;
  }

  consumeModelCall(): void {
    if (this.isRunTimedOut()) throw new RunBudgetError("run_timeout");
    if (this.modelCalls >= this.options.maxModelCalls)
      throw new RunBudgetError("model_call_limit");
    this.modelCalls += 1;
  }

  async runModelCall<T>(request: () => Promise<T>): Promise<T> {
    this.consumeModelCall();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new RunBudgetError("model_timeout")),
        this.options.modelTimeoutMs,
      );
    });
    try {
      return await Promise.race([Promise.resolve().then(request), timeout]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }
}
