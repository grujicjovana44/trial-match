import type { RunResponse } from "../../../../packages/shared/src/index.js";
import { formatSnapshotDate } from "../result-view-model.js";
import { copy } from "../copy.js";

export function ResultMeta({ meta }: { meta: RunResponse["meta"] }) {
  // Datum se prikazuje samo kada postoji i ispravan je; inače reda nema (T232).
  const snapshotDate =
    meta.dataSnapshotDate === null
      ? null
      : formatSnapshotDate(meta.dataSnapshotDate);
  return (
    <footer className="result-meta">
      <span>{copy.meta.dataVersion(meta.dataVersion)}</span>
      {snapshotDate !== null && <span>{copy.meta.snapshot(snapshotDate)}</span>}
      <span>
        {meta.dataSynthetic ? copy.meta.syntheticData : copy.meta.realData}
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
