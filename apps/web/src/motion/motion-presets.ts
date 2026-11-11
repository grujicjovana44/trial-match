import type { Transition, Variants } from "motion/react";

/**
 * Zajednička podešavanja pokreta. Pokret služi samo da objasni promenu
 * stanja (prepoznavanje, nastavak provere, sačuvan odgovor) i nikada ne
 * odlaže prikaz rezultata. `MotionConfig reducedMotion="user"` u App-u
 * isključuje pomeranja kada korisnik traži smanjen pokret.
 */
export const easeOut: [number, number, number, number] = [0.3, 0.7, 0.2, 1];

export const enter: Transition = { duration: 0.28, ease: easeOut };

export const staggerList: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: enter },
};

export const pressable = {
  whileTap: { scale: 0.96 },
  transition: { type: "spring", stiffness: 500, damping: 30 },
} as const;
