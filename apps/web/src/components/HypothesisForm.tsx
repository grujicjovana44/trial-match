import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { MAX_INPUT_CHARS, copy } from "../copy.js";
import { pressable } from "../motion/motion-presets.js";

export function HypothesisForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const hypothesis = text.trim();
    if (hypothesis.length > 0) onSubmit(hypothesis);
  }

  return (
    <form className="follow-up hypothesis" onSubmit={submit}>
      <h3>{copy.hypothesis.heading}</h3>
      <label htmlFor="hypothesis">{copy.hypothesis.label}</label>
      <input
        id="hypothesis"
        value={text}
        onChange={(event) => setText(event.target.value)}
        maxLength={MAX_INPUT_CHARS}
        placeholder={copy.hypothesis.placeholder}
        disabled={busy}
      />
      <motion.button
        type="submit"
        disabled={busy || text.trim().length === 0}
        {...pressable}
      >
        {copy.hypothesis.submit}
      </motion.button>
      <p>{copy.hypothesis.note}</p>
    </form>
  );
}
