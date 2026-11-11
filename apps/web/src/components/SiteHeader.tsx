import type { RunResponse } from "../../../../packages/shared/src/index.js";
import { copy } from "../copy.js";
import { ModeBadge } from "./ModeBadge.js";

export function SiteHeader({ meta }: { meta: RunResponse["meta"] | null }) {
  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label={copy.brand.homeLabel}>
        <span className="brand-mark" aria-hidden="true">
          T
        </span>
        <span>{copy.brand.name}</span>
      </a>
      <ModeBadge meta={meta} />
    </header>
  );
}
