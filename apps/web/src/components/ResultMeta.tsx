import type { RunResponse } from "../../../../packages/shared/src/index.js";
import { formatSnapshotDate } from "../result-view-model.js";
import { copy } from "../copy.js";

export function ResultMeta({ meta }: { meta: RunResponse["meta"] }) {
  return (
    <footer className="result-meta">
      <span>{copy.meta.dataVersion(meta.dataVersion)}</span>
      <span>{meta.dataSynthetic ? "Sintetički skup" : "Snimak studija"}</span>
      <span>
        {meta.dataSnapshotDate
          ? formatSnapshotDate(meta.dataSnapshotDate)
          : "Datum nije dostupan"}
      </span>
      <span>{meta.dataOrigin}</span>
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
