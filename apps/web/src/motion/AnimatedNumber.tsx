import { useEffect } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { easeOut } from "./motion-presets.js";

/** Vizuelni brojač; tačan broj za čitače ekrana daje roditelj kroz tekst. */
export function AnimatedNumber({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const count = useMotionValue(reduce ? value : 0);
  const rounded = useTransform(count, (v) => Math.round(v).toString());

  useEffect(() => {
    if (reduce) {
      count.set(value);
      return;
    }
    const controls = animate(count, value, { duration: 0.6, ease: easeOut });
    return () => controls.stop();
  }, [count, value, reduce]);

  return <motion.span aria-hidden="true">{rounded}</motion.span>;
}
