import { useState, type FormEvent } from "react";
import {
  ApiErrorRequestSchema,
  RunResponseSchema,
  type RunResponse,
} from "../../../packages/shared/src/index.js";
import {
  criterionStatusLabel,
  missingProfileFields,
  statusLabel,
} from "./result-view-model.js";

async function postJson(path: string, payload: unknown): Promise<RunResponse> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    const error = ApiErrorRequestSchema.parse(body);
    throw new Error(error.error.message);
  }
  return RunResponseSchema.parse(body);
}

export function App() {
  const [profileText, setProfileText] = useState("");
  const [answer, setAnswer] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [result, setResult] = useState<RunResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(action: () => Promise<RunResponse>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await action());
      setAnswer("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Zahtev nije mogao da se obradi.",
      );
    } finally {
      setBusy(false);
    }
  }

  function startRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(() => postJson("/api/runs", { profileText }));
  }

  function sendAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!result || result.status !== "needs_clarification") return;
    void submit(() =>
      postJson(`/api/runs/${encodeURIComponent(result.runId)}/answer`, {
        answer,
      }),
    );
  }

  function sendHypothesis(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!result || result.stage !== "completed") return;
    void submit(() =>
      postJson(`/api/runs/${encodeURIComponent(result.runId)}/hypothesis`, {
        profileText: hypothesis,
      }),
    );
  }

  return (
    <main className="page-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="TrialMatch početna stranica">
          <span className="brand-mark" aria-hidden="true">
            T
          </span>
          <span>TrialMatch</span>
        </a>
        <span className="demo-badge">DEMO REŽIM</span>
      </header>

      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">Preliminarna provera kriterijuma</p>
        <h1 id="page-title">Uporedite sintetički profil sa studijama</h1>
        <p>
          Unesite samo izmišljene podatke. Rezultat prikazuje dokaze i
          nepoznanice za pregled zdravstvenog radnika.
        </p>
      </section>

      <aside className="safety-notice" aria-label="Važno medicinsko upozorenje">
        <strong>Važno:</strong> TrialMatch ne postavlja dijagnozu, ne
        preporučuje lečenje i ne odlučuje o uključivanju u studiju. Jezički
        model čita pravila i objašnjava rezultat. Odluku donosi deterministički
        kod. Konačnu odluku uvek donosi lekar. Ovaj demo koristi isključivo
        sintetičke studije i profile.
      </aside>

      <section className="panel" aria-labelledby="profile-heading">
        <h2 id="profile-heading">Sintetički profil ili pitanje o studiji</h2>
        <form onSubmit={startRun}>
          <label htmlFor="profile-text">Opis profila ili pitanje</label>
          <textarea
            id="profile-text"
            value={profileText}
            onChange={(event) => setProfileText(event.target.value)}
            maxLength={4000}
            required
            rows={5}
            placeholder="Primer: Muškarac, 62 godine, dijabetes tip 2, HbA1c 8,1%, kreatinin 1,3 mg/dL, visina 178 cm, težina 92 kg."
          />
          <div className="form-footer">
            <span>{profileText.length}/4000 znakova</span>
            <button
              type="submit"
              disabled={busy || profileText.trim().length === 0}
            >
              {busy && result === null ? "Obrada…" : "Proveri kriterijume"}
            </button>
          </div>
        </form>
      </section>

      {busy && (
        <p className="state-message" role="status">
          Provera je u toku…
        </p>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}

      {result && (
        <section
          className="panel results-panel"
          aria-labelledby="results-heading"
          aria-live="polite"
        >
          <div className="results-heading">
            <div>
              <p className="eyebrow">Rezultat provere</p>
              <h2 id="results-heading">{statusLabel(result.status)}</h2>
            </div>
            <span className={`status-tag status-${result.status}`}>
              {result.status.replaceAll("_", " ")}
            </span>
          </div>
          <p>{result.explanation}</p>

          {result.profile && (
            <div className="unknown-fields">
              <strong>Podaci koji nisu navedeni:</strong>
              <span>
                {missingProfileFields(result.profile).join(", ") || "Nema."}
              </span>
            </div>
          )}

          {result.derived.length > 0 && (
            <section aria-labelledby="derived-heading">
              <h3 id="derived-heading">Deterministički izvedene vrednosti</h3>
              <ul className="derived-list">
                {result.derived.map((item) => (
                  <li key={item.name}>
                    <strong>
                      {item.name}: {item.value} {item.unit}
                    </strong>
                    <span>
                      {item.formulaName}. Izvor: {item.sourceReference}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {result.results.length > 0 && (
            <div className="trial-list">
              {result.results.map((trial) => (
                <article className="trial-card" key={trial.trialId}>
                  <div className="trial-heading">
                    <div>
                      <p className="eyebrow">{trial.trialId}</p>
                      <h3>{trial.title}</h3>
                    </div>
                    <span className={`status-tag verdict-${trial.verdict}`}>
                      {trial.verdict}
                    </span>
                  </div>
                  <ul className="criteria-list">
                    {trial.criteria.map((criterion) => (
                      <li key={criterion.id}>
                        <strong>
                          {criterionStatusLabel(criterion.status)}
                        </strong>
                        <span>{criterion.text}</span>
                        <blockquote>
                          <q>{criterion.citation.quote}</q>
                          <cite>Izvor: {criterion.citation.sourceId}</cite>
                        </blockquote>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}

          {result.status === "needs_clarification" && result.question && (
            <form className="follow-up" onSubmit={sendAnswer}>
              <h3>Potrebna dopuna</h3>
              <label htmlFor="answer">{result.question.text}</label>
              <div className="answer-options">
                {result.question.options?.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className="secondary-button"
                    onClick={() => setAnswer(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <input
                id="answer"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                required
              />
              <button
                type="submit"
                disabled={busy || answer.trim().length === 0}
              >
                Pošalji dopunu
              </button>
            </form>
          )}

          {(result.status === "ok" ||
            (result.status === "insufficient_evidence" &&
              result.reason === "no_matching_trial")) && (
            <form className="follow-up" onSubmit={sendHypothesis}>
              <h3>Šta ako?</h3>
              <label htmlFor="hypothesis">
                Unesite samo hipotetičku izmenu profila
              </label>
              <input
                id="hypothesis"
                value={hypothesis}
                onChange={(event) => setHypothesis(event.target.value)}
                maxLength={4000}
                placeholder="Na primer: A šta ako je HbA1c 9,0%?"
                required
              />
              <button
                type="submit"
                disabled={busy || hypothesis.trim().length === 0}
              >
                Ponovi proveru
              </button>
              <p>
                Izmena se proverava u okviru istog izvršavanja i ne menja
                izvorni profil.
              </p>
            </form>
          )}

          <footer className="result-meta">
            <span>Skup podataka: {result.meta.dataVersion}</span>
            <span>DEMO režim — bez poziva stvarnom modelu</span>
          </footer>
        </section>
      )}

      <footer className="site-footer">
        <span>Sintetički demo podaci · Nije medicinski savet</span>
        <span>Verzija skupa: synthetic-trials-v1 · 7. novembar 2026.</span>
      </footer>
    </main>
  );
}
