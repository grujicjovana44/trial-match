import { useEffect, useReducer, useRef, useState } from "react";
import { MotionConfig } from "motion/react";
import { postJson } from "./api/client.js";
import {
  canStartOver,
  initialRunState,
  isBusy,
  isHypothesisResult,
  runReducer,
  resultIsStale,
  showSavedNotice,
  type LastRequest,
} from "./state/run-state.js";
import { ResultPanel } from "./components/ResultPanel.js";
import { ProfileForm } from "./components/ProfileForm.js";
import { ErrorPanel } from "./components/ErrorPanel.js";
import { SiteHeader } from "./components/SiteHeader.js";
import { SafetyNotice } from "./components/SafetyNotice.js";
import { copy } from "./copy.js";
import { ProcessingStatus } from "./components/ProcessingStatus.js";
import { useSlowNotice } from "./hooks/useSlowNotice.js";

export function App() {
  const [profileText, setProfileText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const clarificationRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLElement>(null);
  const [state, dispatch] = useReducer(runReducer, initialRunState);
  const result = state.result;
  const busy = isBusy(state);
  const slow = useSlowNotice(busy);

  async function send(request: LastRequest) {
    if (isBusy(state)) return;
    request = {
      ...request,
      idempotencyKey: request.idempotencyKey ?? crypto.randomUUID(),
    };
    dispatch({ type: "submit", request });
    const outcome = await postJson(
      request.path,
      request.body,
      request.kind,
      request.idempotencyKey,
    );
    if (outcome.ok) {
      dispatch({ type: "succeeded", response: outcome.response });
    } else {
      dispatch({ type: "failed", error: outcome.error });
    }
  }

  function startOver() {
    if (isBusy(state)) return;
    dispatch({ type: "reset" });
    setProfileText("");
  }

  useEffect(() => {
    if (state.focusToken === 0) return;
    if (state.phase === "error") {
      errorRef.current?.focus();
    } else if (state.phase === "result") {
      if (state.result?.status === "needs_clarification") {
        clarificationRef.current?.focus();
      } else {
        headingRef.current?.focus();
      }
    } else if (state.phase === "idle") {
      textareaRef.current?.focus();
    }
  }, [state.focusToken]);

  return (
    <MotionConfig reducedMotion="user">
      <main className="page-shell">
        <SiteHeader meta={state.meta} />

        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow">{copy.intro.eyebrow}</p>
          <h1 id="page-title">{copy.intro.title}</h1>
          <p>{copy.intro.lead}</p>
        </section>

        <SafetyNotice dataSynthetic={state.meta?.dataSynthetic === true} />

        <ProfileForm
          text={profileText}
          onTextChange={setProfileText}
          onSubmit={(event) => {
            event.preventDefault();
            void send({
              kind: "run",
              path: "/api/runs",
              body: { profileText },
              userText: profileText,
            });
          }}
          busy={busy}
          canStartOver={canStartOver(state)}
          onStartOver={startOver}
          textareaRef={textareaRef}
        />

        {busy && <ProcessingStatus slow={slow} />}
        {state.error && (
          <ErrorPanel
            error={state.error}
            hasPreviousResult={state.result !== null}
            busy={busy}
            onRetry={() => {
              if (state.lastRequest) void send(state.lastRequest);
            }}
            onStartOver={startOver}
            panelRef={errorRef}
          />
        )}

        <div className="results-region" aria-live="polite">
          {result && (
            <ResultPanel
              key={result.runId}
              result={result}
              stale={resultIsStale(state)}
              headingRef={headingRef}
              sourceText={state.sourceText}
              showSaved={showSavedNotice(state)}
              busy={busy}
              onAnswer={(text) => {
                if (!result || result.status !== "needs_clarification") return;
                void send({
                  kind: "answer",
                  path: `/api/runs/${encodeURIComponent(result.runId)}/answer`,
                  body: { answer: text },
                  userText: text,
                });
              }}
              clarificationRef={clarificationRef}
              resultSeq={state.resultSeq}
              onHypothesis={(text) => {
                if (!result || result.stage !== "completed") return;
                void send({
                  kind: "hypothesis",
                  path: `/api/runs/${encodeURIComponent(result.runId)}/hypothesis`,
                  body: { profileText: text },
                  userText: text,
                });
              }}
              isHypothesis={isHypothesisResult(state)}
              hypothesisText={state.hypothesisText}
            />
          )}
        </div>

        <footer className="site-footer">
          <span>{copy.footer.note}</span>
        </footer>
      </main>
    </MotionConfig>
  );
}
