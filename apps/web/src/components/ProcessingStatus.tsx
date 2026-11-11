import { motion } from "motion/react";
import { copy } from "../copy.js";
import { enter } from "../motion/motion-presets.js";

export function ProcessingStatus({ slow }: { slow: boolean }) {
  return (
    <motion.div
      className="state-message"
      role="status"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={enter}
    >
      <span className="shimmer-text">{copy.processing.line}</span>
      {slow && <span className="state-detail">{copy.processing.slow}</span>}
    </motion.div>
  );
}
