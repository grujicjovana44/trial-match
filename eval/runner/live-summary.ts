import type { SafeTrace } from "../../apps/server/src/trace/redact.js";

export type CaseStatus = SafeTrace["status"];
type TraceEvent = SafeTrace["events"][number];

export type CaseRecord = {
  caseId: string;
  status: CaseStatus;
  executionMode: SafeTrace["execution_mode"];
};

export type GroupTally = {
  passed: number;
  executed: number;
  /** Preskočeni i dry-run slučajevi: ne ulaze ni u brojilac ni u imenilac. */
  notExecuted: number;
};

export type GroupedResults = {
  functional: GroupTally;
  safety: GroupTally;
  deterministicAndFault: GroupTally;
  ungrouped: string[];
};

/** Različite verzije prompta redom prve upotrebe. */
export function distinctPromptVersions(
  events: ReadonlyArray<{ promptVersion?: string | undefined }>,
): string[] {
  const seen: string[] = [];
  for (const event of events)
    if (event.promptVersion && !seen.includes(event.promptVersion))
      seen.push(event.promptVersion);
  return seen;
}

/** Vrednost za `prompt_version` u trace-u: "a+b" ili "none" bez poziva modela. */
export function tracePromptVersion(
  events: ReadonlyArray<{ promptVersion?: string | undefined }>,
): string {
  const versions = distinctPromptVersions(events);
  return versions.length ? versions.join("+") : "none";
}

export function caseGroup(
  caseId: string,
): "functional" | "safety" | "deterministicAndFault" | null {
  const match = /^EV-(\d{2})$/u.exec(caseId);
  if (!match) return null;
  const number = Number(match[1]);
  if (number >= 1 && number <= 9) return "functional";
  if (number === 10) return "safety";
  if (number >= 11 && number <= 16) return "deterministicAndFault";
  return null;
}

/**
 * Funkcionalni EV-01..09, bezbednosni EV-10 i deterministički/fault EV-11..16
 * ostaju odvojeni; samo izvršeni slučajevi (passed/failed) ulaze u imenilac.
 */
export function groupResults(records: readonly CaseRecord[]): GroupedResults {
  const tally = (): GroupTally => ({
    passed: 0,
    executed: 0,
    notExecuted: 0,
  });
  const grouped: GroupedResults = {
    functional: tally(),
    safety: tally(),
    deterministicAndFault: tally(),
    ungrouped: [],
  };
  for (const record of records) {
    const group = caseGroup(record.caseId);
    if (!group) {
      grouped.ungrouped.push(record.caseId);
      continue;
    }
    const target = grouped[group];
    if (record.status === "passed") {
      target.passed++;
      target.executed++;
    } else if (record.status === "failed") target.executed++;
    else target.notExecuted++;
  }
  return grouped;
}

export type TraceTotals = {
  modelEvents: number;
  toolEvents: number;
  modelDurationMs: number;
};

export function traceTotals(
  events: ReadonlyArray<Pick<TraceEvent, "step" | "durationMs">>,
): TraceTotals {
  return {
    modelEvents: events.filter((e) => e.step === "model").length,
    toolEvents: events.filter((e) => e.step === "tool").length,
    modelDurationMs: events
      .filter((e) => e.step === "model")
      .reduce((sum, e) => sum + e.durationMs, 0),
  };
}

export type LiveSummaryInput = {
  label: string;
  commit: string;
  dirty: boolean;
  caseSetHash: string;
  provider: string;
  model: string;
  dataVersion: string;
  dataName: string;
  schemaVersion: string;
  status: string;
  startedAt: string;
  finishedAt: string;
  aborted: string | null;
  limits: Record<string, unknown>;
  records: readonly CaseRecord[];
  promptVersions: readonly string[];
  usage: {
    attempts: number;
    attemptsWithoutUsage: number;
    inputTokens: number;
    outputTokens: number;
  };
  totals: TraceTotals;
};

export function buildLiveSummary(input: LiveSummaryInput) {
  const grouped = groupResults(input.records);
  return {
    label: input.label,
    status: input.status,
    ...(input.aborted ? { aborted: input.aborted } : {}),
    commit: input.commit,
    dirty: input.dirty,
    caseSetHash: input.caseSetHash,
    provider: input.provider,
    model: input.model,
    dataVersion: input.dataVersion,
    dataName: input.dataName,
    schemaVersion: input.schemaVersion,
    promptVersions: [...input.promptVersions],
    limits: input.limits,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    // Tri odvojene grupe; nikada jedna spojena "AI tačnost".
    results: {
      functional: { cases: "EV-01..EV-09", ...grouped.functional },
      safety: { cases: "EV-10", ...grouped.safety },
      deterministicAndFault: {
        cases: "EV-11..EV-16",
        ...grouped.deterministicAndFault,
      },
      ungrouped: grouped.ungrouped,
    },
    totals: {
      attempts: input.usage.attempts,
      attemptsWithoutUsage: input.usage.attemptsWithoutUsage,
      inputTokens: input.usage.inputTokens,
      outputTokens: input.usage.outputTokens,
      totalDurationMs:
        Date.parse(input.finishedAt) - Date.parse(input.startedAt),
      modelDurationMs: input.totals.modelDurationMs,
      modelCalls: input.totals.modelEvents,
      toolCalls: input.totals.toolEvents,
    },
  };
}
