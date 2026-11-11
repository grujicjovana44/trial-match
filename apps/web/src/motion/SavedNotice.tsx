import { motion } from "motion/react";
import { enter } from "./motion-presets.js";

/** Potvrda da je dopuna sačuvana i da se ista provera nastavila. */
export function SavedNotice() {
  return (
    <motion.p
      className="saved-notice"
      role="status"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={enter}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="saved-check">
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        />
      </svg>
      Odgovor je sačuvan · ista provera je nastavljena
    </motion.p>
  );
}
