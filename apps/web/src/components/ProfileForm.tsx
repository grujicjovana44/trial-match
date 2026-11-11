import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEventHandler,
  type ReactNode,
  type RefObject,
} from "react";
import { MAX_INPUT_CHARS, copy } from "../copy.js";
import { pressable } from "../motion/motion-presets.js";
import { motion } from "motion/react";

type Validity = "empty" | "too_long" | "valid";

export function ProfileForm({
  text,
  onTextChange,
  onSubmit,
  busy,
  canStartOver,
  onStartOver,
  textareaRef,
  children,
}: {
  text: string;
  onTextChange: (text: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  busy: boolean;
  canStartOver: boolean;
  onStartOver: () => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  children?: ReactNode;
}) {
  const [touched, setTouched] = useState(false);
  const hadResult = useRef(canStartOver);
  const validity: Validity =
    text.trim().length === 0
      ? "empty"
      : text.length > MAX_INPUT_CHARS
        ? "too_long"
        : "valid";
  const tooLong = validity === "too_long";
  const showError = tooLong || (validity === "empty" && touched);

  useEffect(() => {
    if (text === "" && !canStartOver && hadResult.current) {
      setTouched(false);
    }
    hadResult.current = canStartOver;
  }, [text, canStartOver]);

  function changeText(event: ChangeEvent<HTMLTextAreaElement>) {
    setTouched(true);
    onTextChange(event.target.value);
  }

  const hint =
    validity === "too_long"
      ? copy.form.errorTooLong(text.length - MAX_INPUT_CHARS)
      : validity === "empty"
        ? touched
          ? copy.form.errorEmpty
          : copy.form.hintEmpty
        : copy.form.hint;

  return (
    <section className="panel" aria-labelledby="profile-heading">
      <h2 id="profile-heading">{copy.form.heading}</h2>
      <form onSubmit={onSubmit}>
        <label htmlFor="profile-text">{copy.form.label}</label>
        <textarea
          id="profile-text"
          ref={textareaRef}
          value={text}
          onChange={changeText}
          onBlur={() => setTouched(true)}
          rows={5}
          aria-describedby="profile-hint"
          aria-invalid={showError ? true : undefined}
          placeholder={copy.form.placeholder}
        />
        {children}
        <p
          id="profile-hint"
          className={showError ? "form-hint field-error" : "form-hint"}
          aria-live="polite"
        >
          {hint}
        </p>
        <div className="form-footer">
          <span className={tooLong ? "field-error" : undefined}>
            {copy.form.counter(text.length)}
          </span>
          <div className="form-actions">
            {canStartOver && (
              <motion.button
                type="button"
                className="secondary-button"
                disabled={busy}
                onClick={onStartOver}
                {...pressable}
              >
                {copy.form.startOver}
              </motion.button>
            )}
            <motion.button
              type="submit"
              disabled={busy || validity !== "valid"}
              {...pressable}
            >
              {copy.form.submit}
            </motion.button>
          </div>
        </div>
      </form>
    </section>
  );
}
