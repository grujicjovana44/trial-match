import type {
  Profile,
  RunResponse,
  Trial,
} from "../../../../packages/shared/src/index.js";

const RUN_RETENTION_MS = 30 * 60 * 1000;
const MAX_RUNS = 1000;

export type RunState = {
  runId: string;
  profile: Profile;
  trials: Trial[];
  response: RunResponse;
  questionRounds: number;
  createdAt: number;
  availableSources: Map<string, string>;
};

export class RunStore {
  private readonly runs = new Map<string, RunState>();
  // Ids uklonjeni internim čišćenjem, još neprijavljeni pozivaocu (prune/set).
  private pendingRemoved: string[] = [];

  constructor(
    private readonly now: () => number = Date.now,
    private readonly retentionMs = RUN_RETENTION_MS,
    private readonly maxRuns = MAX_RUNS,
  ) {}

  get(runId: string): RunState | undefined {
    this.sweep();
    return this.runs.get(runId);
  }

  set(state: RunState): string[] {
    this.sweep();
    this.runs.delete(state.runId);
    this.runs.set(state.runId, state);
    while (this.runs.size > this.maxRuns) {
      const oldest = this.runs.keys().next().value;
      if (oldest === undefined) break;
      this.runs.delete(oldest);
      this.pendingRemoved.push(oldest);
    }
    return this.drainRemoved();
  }

  /** Vraća sve ids uklonjene od prethodnog prune()/set() poziva, svaki samo jednom. */
  prune(): string[] {
    this.sweep();
    return this.drainRemoved();
  }

  private drainRemoved(): string[] {
    const removed = this.pendingRemoved;
    this.pendingRemoved = [];
    return removed;
  }

  private sweep(): void {
    const now = this.now();
    for (const [runId, state] of this.runs) {
      if (now - state.createdAt >= this.retentionMs) {
        this.runs.delete(runId);
        this.pendingRemoved.push(runId);
      }
    }
  }

  delete(runId: string): boolean {
    return this.runs.delete(runId);
  }

  get size(): number {
    this.sweep();
    return this.runs.size;
  }
}
