import { copy } from "../copy.js";

export function SafetyNotice({ demoMode }: { demoMode: boolean }) {
  return (
    <aside className="safety-notice" aria-label={copy.safety.label}>
      <strong>{copy.safety.strong}</strong> {copy.safety.body}
      {demoMode && <> {copy.safety.demo}</>}
    </aside>
  );
}
