export type WorkflowStage =
  | "received"
  | "awaiting_input"
  | "ready"
  | "running_tool"
  | "completed"
  | "failed"
  | "rejected";

const transitions: Record<WorkflowStage, WorkflowStage[]> = {
  received: ["ready", "awaiting_input", "completed", "failed", "rejected"],
  awaiting_input: ["ready", "failed"],
  ready: ["running_tool", "completed", "awaiting_input", "failed"],
  running_tool: ["completed", "awaiting_input", "failed"],
  completed: ["received"],
  failed: [],
  rejected: [],
};

export function canTransition(from: WorkflowStage, to: WorkflowStage): boolean {
  return transitions[from].includes(to);
}

export function transition(
  from: WorkflowStage,
  to: WorkflowStage,
): WorkflowStage {
  if (!canTransition(from, to))
    throw new Error(`Nedozvoljen prelaz workflow-a: ${from} → ${to}.`);
  return to;
}
