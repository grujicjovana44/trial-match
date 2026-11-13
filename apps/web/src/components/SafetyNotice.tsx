import { copy } from "../copy.js";

export function SafetyNotice({ dataSynthetic }: { dataSynthetic: boolean }) {
  return (
    <aside className="safety-notice" aria-label={copy.safety.label}>
      <strong>{copy.safety.strong}</strong> {copy.safety.body}
      {dataSynthetic && <> {copy.safety.demo}</>}
    </aside>
  );
}
