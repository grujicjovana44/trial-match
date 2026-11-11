import { useEffect, useRef, useState, type FormEvent, type Ref } from "react";
import type { Question } from "../../../../packages/shared/src/index.js";
import { copy } from "../copy.js";
import { enter, pressable } from "../motion/motion-presets.js";
import { motion } from "motion/react";

export function ClarificationForm({
  question,
  busy,
  onAnswer,
  headingRef,
}: {
  question: Question;
  busy: boolean;
  onAnswer: (text: string) => void;
  headingRef: Ref<HTMLHeadingElement> | undefined;
}) {
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const wasBusy = useRef(busy);

  useEffect(() => {
    if (wasBusy.current && !busy) setSelected(null);
    wasBusy.current = busy;
  }, [busy]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const answer = text.trim();
    if (answer.length > 0) onAnswer(answer);
  }

  const options = question.options ?? [];
  return (
    <motion.form
      className="follow-up"
      onSubmit={submit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...enter, delay: 0.1 }}
    >
      <h3 ref={headingRef} tabIndex={-1}>
        {copy.clarify.heading}
      </h3>
      <label htmlFor="answer">{question.text}</label>
      {options.length > 0 && (
        <>
          <div
            className="answer-options"
            role="group"
            aria-label={copy.clarify.optionsLabel}
          >
            {options.map((option) => (
              <motion.button
                key={option}
                type="button"
                className="secondary-button"
                aria-pressed={selected === option}
                disabled={busy}
                onClick={() => {
                  setSelected(option);
                  onAnswer(option);
                }}
                {...pressable}
              >
                {option}
              </motion.button>
            ))}
          </div>
          <p className="form-hint">{copy.clarify.hint}</p>
        </>
      )}
      <input
        id="answer"
        value={text}
        onChange={(event) => setText(event.target.value)}
        disabled={busy}
      />
      <motion.button
        type="submit"
        disabled={busy || text.trim().length === 0}
        {...pressable}
      >
        {copy.clarify.submit}
      </motion.button>
    </motion.form>
  );
}
