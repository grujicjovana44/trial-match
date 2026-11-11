import type { Ref } from "react";
import { motion } from "motion/react";
import { copy } from "../copy.js";
import { enter, pressable } from "../motion/motion-presets.js";
import type { UiError } from "../api/ui-error.js";
import { useCountdown } from "../hooks/useCountdown.js";
import { DEFAULT_RETRY_AFTER_SECONDS } from "../copy.js";

export function ErrorPanel({
  error,
  hasPreviousResult,
  busy,
  onRetry,
  onStartOver,
  panelRef,
}: {
  error: UiError;
  hasPreviousResult: boolean;
  busy: boolean;
  onRetry: () => void;
  onStartOver: () => void;
  panelRef?: Ref<HTMLElement>;
}) {
  const startSeconds =
    error.action === "wait_retry"
      ? (error.retryAfterSeconds ?? DEFAULT_RETRY_AFTER_SECONDS)
      : 0;
  const left = useCountdown(startSeconds);

  return (
    <motion.section
      className="error-panel"
      role="alert"
      tabIndex={-1}
      ref={panelRef}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={enter}
    >
      <h2>{copy.errors[error.kind].title}</h2>
      <p>{copy.errors[error.kind].body}</p>
      {error.action === "retry" && <p>{copy.errors.hintRetry}</p>}
      {error.action === "restart" && <p>{copy.errors.hintRestart}</p>}
      {error.action === "wait_retry" && (
        <>
          <p aria-hidden="true">
            {left > 0 ? copy.errors.waitSeconds(left) : copy.errors.waitDone}
          </p>
          <p className="visually-hidden">
            {copy.errors.waitForScreenReader(startSeconds)}
          </p>
        </>
      )}
      {error.serverMessage && (
        <p className="server-message">
          {copy.errors.serverMessage} {error.serverMessage}
        </p>
      )}
      {hasPreviousResult && <p>{copy.errors.previousKept}</p>}
      <div className="form-actions">
        {(error.action === "retry" || error.action === "wait_retry") && (
          <motion.button
            type="button"
            disabled={busy || (error.action === "wait_retry" && left > 0)}
            onClick={onRetry}
            {...pressable}
          >
            {copy.errors.retry}
          </motion.button>
        )}
        {(error.action === "retry" || error.action === "wait_retry") && (
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
        {error.action === "restart" && (
          <motion.button
            type="button"
            disabled={busy}
            onClick={onStartOver}
            {...pressable}
          >
            {copy.form.startOver}
          </motion.button>
        )}
      </div>
    </motion.section>
  );
}
