import type {
  Profile,
  RunResponse,
  Trial,
} from "../../../../packages/shared/src/index.js";

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

  get(runId: string): RunState | undefined {
    return this.runs.get(runId);
  }

  set(state: RunState): void {
    this.runs.set(state.runId, state);
  }

  delete(runId: string): boolean {
    return this.runs.delete(runId);
  }

  get size(): number {
    return this.runs.size;
  }
}
