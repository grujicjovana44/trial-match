import type { RunResponse } from "../../../../packages/shared/src/index.js";
import { copy } from "../copy.js";

export function ResultMeta({ meta }: { meta: RunResponse["meta"] }) {
  return (
    <footer className="result-meta">
      <span>{copy.meta.dataVersion(meta.dataVersion)}</span>
      {meta.demoMode ? (
        <span>{copy.meta.demo}</span>
      ) : (
        <span>
          {meta.modelId ? copy.meta.live(meta.modelId) : copy.meta.liveNoId}
        </span>
      )}
    </footer>
  );
}
