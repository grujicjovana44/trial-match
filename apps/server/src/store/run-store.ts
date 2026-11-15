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

  constructor(
    private readonly now: () => number = Date.now,
    private readonly retentionMs = RUN_RETENTION_MS,
    private readonly maxRuns = MAX_RUNS,
  ) {}

  get(runId: string): RunState | undefined {
    this.prune();
    return this.runs.get(runId);
  }

  set(state: RunState): string[] {
    const removed = this.prune();
    this.runs.delete(state.runId);
    this.runs.set(state.runId, state);
    while (this.runs.size > this.maxRuns) {
      const oldest = this.runs.keys().next().value;
      if (oldest === undefined) break;
      this.runs.delete(oldest);
      removed.push(oldest);
    }
    return removed;
  }

  prune(): string[] {
    const removed: string[] = [];
    const now = this.now();
    for (const [runId, state] of this.runs) {
      if (now - state.createdAt >= this.retentionMs) {
        this.runs.delete(runId);
        removed.push(runId);
      }
    }
    return removed;
  }

  delete(runId: string): boolean {
    return this.runs.delete(runId);
  }

  get size(): number {
    this.prune();
    return this.runs.size;
  }
}
