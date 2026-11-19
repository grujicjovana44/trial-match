import { motion } from "motion/react";
import { copy } from "../copy.js";
import { enter } from "../motion/motion-presets.js";

export function ProcessingStatus({ slow }: { slow: boolean }) {
  return (
    <motion.section
      className="loading-state"
      role="status"
      aria-label={copy.processing.line}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={enter}
    >
      <h2>{copy.processing.line}</h2>
      <p>{slow ? copy.processing.slow : copy.processing.short}</p>
      <span className="skeleton skeleton-title" aria-hidden="true" />
      <span className="skeleton" aria-hidden="true" />
      <span className="skeleton skeleton-short" aria-hidden="true" />
    </motion.section>
  );
}
