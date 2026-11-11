import type { RunResponse } from "../../../../packages/shared/src/index.js";
import { copy } from "../copy.js";
import { modeBadge } from "../result-view-model.js";

export function ModeBadge({ meta }: { meta: RunResponse["meta"] | null }) {
  const model = modeBadge(meta);
  if (model === null) return null;

  return model.kind === "demo" ? (
    <span className="mode-badge mode-demo">
      <span className="pulse-dot" aria-hidden="true" />
      <span className="visually-hidden">{copy.mode.srPrefix}</span>
      {copy.mode.demo}
    </span>
  ) : (
    <span className="mode-badge mode-live">
      <span className="pulse-dot" aria-hidden="true" />
      <span className="visually-hidden">{copy.mode.srPrefix}</span>
      {copy.mode.live}
      {model.modelId !== null && (
        <span className="mono mode-model">{model.modelId}</span>
      )}
    </span>
  );
}
