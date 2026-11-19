import { copy } from "../copy.js";

export function SafetyNotice({ dataSynthetic }: { dataSynthetic: boolean }) {
  return (
    <aside className="safety-notice" aria-label={copy.safety.label}>
      <strong>{copy.safety.strong}</strong> {copy.safety.short}
      <details>
        <summary>{copy.safety.details}</summary>
        <p>{copy.safety.body}</p>
        {dataSynthetic && <p>{copy.safety.demo}</p>}
        <p>{copy.voice.note}</p>
      </details>
    </aside>
  );
}
