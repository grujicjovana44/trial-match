import { motion } from "motion/react";
import type { CriteriaSummary } from "../result-view-model.js";
import { AnimatedNumber } from "./AnimatedNumber.js";
import { easeOut } from "./motion-presets.js";

const segments = [
  { key: "met", className: "seg-met" },
  { key: "notMet", className: "seg-not-met" },
  { key: "unknown", className: "seg-unknown" },
] as const;

export function CriteriaSummaryBar({ summary }: { summary: CriteriaSummary }) {
  if (summary.total === 0) return null;
  return (
    <div className="criteria-summary">
      <p className="criteria-summary-line">
        <span className="visually-hidden">{summary.label}</span>
        <span aria-hidden="true">
          <strong className="criteria-summary-count">
            <AnimatedNumber value={summary.met} />
          </strong>{" "}
          {summary.label.replace(/^\d+/, "").trim()}
        </span>
      </p>
      <div className="criteria-summary-bar" aria-hidden="true">
        {segments.map(({ key, className }) =>
          summary[key] > 0 ? (
            <motion.span
              key={key}
              className={className}
              style={{ flexGrow: summary[key], originX: 0 }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5, ease: easeOut, delay: 0.1 }}
            />
          ) : null,
        )}
      </div>
    </div>
  );
}
