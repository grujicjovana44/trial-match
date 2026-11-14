---
description: "Zadaci za funkcionalnost 002: korisnički tok i interfejs TrialMatch (Uloga A)"
---

# Zadaci: Korisnički tok i interfejs TrialMatch (Uloga A)

**Ulazi**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/ui-api.md](contracts/ui-api.md), [contracts/cross-team-requests.md](contracts/cross-team-requests.md), [quickstart.md](quickstart.md).

**Obim**: samo Uloga A. Dozvoljene putanje: `apps/web/**` i dokumenta `docs/spec.md`, `docs/ac-coverage.md`, `docs/demo-script.md`, `docs/ui-motion.md`, `docs/decisions.md`. Zabranjeno: `packages/shared/**`, `apps/server/**`, `eval/**`, `scripts/**`, `data/**`, `README.md`, `package.json`, `pnpm-lock.yaml`, `vite.config.ts`, `vitest.config.ts`, `tsconfig*.json`, `eslint.config.js`, `.github/**`. Ako zadatak izgleda kao da traži izmenu zabranjene putanje, stati i prijaviti.

## Kako čitati zadatke

- Brojevi počinju od T201 da se ne mešaju sa zadacima T001–T075 funkcionalnosti 001.
- `[P]`: može paralelno sa drugim `[P]` zadacima iste faze (različite datoteke).
- `[US1]`–`[US10]`: korisnička priča iz `spec.md`.
- `[BLOCKED: Role B]`, `[BLOCKED: Role C]`: ne počinjati; ispod piše šta se tačno čeka. `[RUČNO]`: radi čovek, ne model.
- Svi tekstovi interfejsa uzimaju se doslovno iz `copy.ts` ([plan.md](plan.md), odeljak 6). Zadatak nikad ne uvodi novi tekst.
- Svi tokeni boja, veličina i razmaka su u [plan.md](plan.md), odeljci 5.2–5.4. Zadatak nikad ne uvodi novu boju ni novu veličinu.
- Lokalni uvozi imaju nastavak `.js`. Bez `any`. Bez `dangerouslySetInnerHTML` i `innerHTML`.
- U `tsconfig.json` je uključen `exactOptionalPropertyTypes`: opciono polje se izostavlja kada nema vrednost; ne postavlja se na `undefined`. Uključen je i `noUncheckedIndexedAccess`: element niza ili zapisa može biti `undefined` i mora se proveriti.
- Test-datoteka koja prikazuje komponente (sve u `test/integration/` i `test/accessibility.test.tsx`) počinje redom `// @vitest-environment jsdom`. Jedinični testovi čistih funkcija (`test/unit/`) taj red nemaju, kao ni postojeći `unit/result-view-model.test.ts`. Testovi ne pozivaju mrežu.
- **Provera** posle svakog zadatka: `pnpm typecheck`, `pnpm lint`, `pnpm test` (sve tri moraju proći), osim gde piše drugačije. Ako verzije nisu tačne ili `pnpm` nije na putanji, prvo u istom PowerShell procesu izvršiti `. .\specs\002-ui-role-a\setup-toolchain.ps1`; lokalni `init.ps1` ne mora prethodno postojati. U novom procesu bez profila ponoviti učitavanje pre provera.
- Zadatak je gotov tek kada je ispunjeno „Gotovo kada“ i kada prolaze sve tri komande.

---

## Faza 1: Priprema

- [ ] T201 Zabeležiti polazno stanje bez izmene datoteka (koren repozitorijuma)
  - **Priprema okruženja**: pre proveravanja verzija u istom PowerShell procesu izvršiti `. .\specs\002-ui-role-a\setup-toolchain.ps1`. Ovo je odobreno podešavanje razvojnih alata, ne implementacija aplikacije. Ako alat ili `init.ps1` nedostaje na konkretnom računaru, skripta instalira pinovane verzije za korisnika i proverava integritet zvaničnih arhiva.
  - **Izmena**: nijedna u aplikacionom kodu. Pokrenuti redom `node --version`, `pnpm --version`, `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm format:check` i zapisati tačan ishod svake.
  - **Gotovo kada**: sve komande prolaze. Ako i posle pokušaja pripreme `node --version` nije `v24.22.1`, `pnpm --version` nije `12.16.1` ili bilo koja komanda padne, **stati i prijaviti tačnu grešku**; ne popravljati ništa van `apps/web/`.
  - **AC/EV**: — | **Zavisi od**: —

- [X] T202 [P] Napraviti `apps/web/src/copy.ts` sa svim tekstovima
  - **Datoteke**: `apps/web/src/copy.ts` (novo), `apps/web/test/unit/copy.test.ts` (novo).
  - **Izmena**: prepisati doslovno blok koda iz [plan.md](plan.md), odeljak 6 (konstante `MAX_INPUT_CHARS`, `REQUEST_TIMEOUT_MS`, `SLOW_NOTICE_MS`, `DEFAULT_RETRY_AFTER_SECONDS`, `SPEECH_LANGUAGE` i objekat `copy`). Ništa ne dodavati i ne menjati.
  - **Test**: `copy.test.ts` rekurzivno prolazi kroz `copy` (funkcije poziva sa `1` ili `"x"`) i proverava da nijedna vrednost ne sadrži, kao celu reč: `needs_clarification`, `insufficient_evidence`, `no_matching_trial`, `not_in_sources`, `rejected`, `candidate`, `pending`, `excluded`, `not_met`, `unknown`, `true`, `false`, `null`, `undefined`, niti ijedan od 18 naziva kategorija iz [research.md](research.md), R-02. Drugi test: `copy.form.label === "Opis profila ili pitanje"`, `copy.form.submit === "Proveri kriterijume"`, `copy.clarify.submit === "Pošalji dopunu"`, `copy.hypothesis.submit === "Ponovi proveru"`.
  - **Gotovo kada**: oba testa prolaze.
  - **AC/EV**: AC-12 | **Zavisi od**: T201

- [X] T203 [P] Napraviti pomoćne graditelje odgovora za testove u `apps/web/test/helpers/responses.ts`
  - **Datoteke**: `apps/web/test/helpers/responses.ts` (novo).
  - **Izmena**: izvesti funkcije (sve tipizirane preko tipova iz `packages/shared/src/index.js`):
    - `metaOf(overrides?)`: podrazumevano `{ modelId: "mock", promptVersion: "demo.v1", schemaVersion: "1.0.0", dataVersion: "synthetic-trials-v1", durationMs: 1, modelCalls: 1, toolCalls: 0, tokens: null, demoMode: true }`.
    - `criterionOf(trialId, index, status, observedValue)`: `id` i `sourceId` su `` `${trialId}#inc-${index}` ``, `text` je `` `Uslov ${index}` ``, `citation.quote` je `` `Citat ${index} za ${trialId}` ``.
    - `trialsOf(count, idPrefix = "T-")`: `count` studija sa `trialId` `` `${idPrefix}${i + 1}` ``, naslovom `` `Studija ${i + 1}` ``, ishodom po redu `candidate`, `pending`, `excluded` (ciklično) i tri kriterijuma: `met` sa vrednošću `62`, `not_met` sa `true`, `unknown` sa `null`.
    - `okResponse(overrides?)`: `runId: "run-1"`, `status: "ok"`, `stage: "completed"`, `profile: { age: 62, sex: "male", hba1c: { value: 8.1, unit: "%" }, provenance: { age: { origin: "initial_input", round: 0 } } }`, `derived: [{ name: "eGFR", value: 62.11, unit: "mL/min/1.73 m²", formulaName: "CKD-EPI 2021", sourceReference: "docs/project-brief.md" }]`, `results: trialsOf(3)`, `explanation: "Preliminarna provera; lekar donosi odluku."`, `question: null`, `reason: null`, `error: null`, `meta: metaOf()`.
    - `clarificationResponse(overrides?)`: kao `okResponse`, uz `status: "needs_clarification"`, `stage: "awaiting_input"`, `results: []`, `question: { field: "insulin_last_3_months", text: "Da li je osoba koristila insulin?", options: ["Da", "Ne"], trialsResolved: ["T-1"] }`.
    - `noMatchResponse()`, `notInSourcesResponse()`: `status: "insufficient_evidence"`, `stage: "completed"`, `results: []`, `reason` redom `no_matching_trial` i `not_in_sources`; druga ima `profile: null`, `derived: []`.
    - `rejectedResponse()`: `status: "rejected"`, `stage: "rejected"`, `profile: null`, `derived: []`, `results: []`.
    - `runErrorResponse(category, retryable)`: `status: "error"`, `stage: "failed"`, `profile: null`, `derived: []`, `results: []`, `error: { category, message: "Poruka servera.", retryable }`.
    - `httpErrorBody(category, retryable)`: `{ status: "error", error: { category, message: "Poruka servera.", retryable } }`.
    - `jsonResponse(body, status = 200, headers = {})`: vraća objekat `{ ok: status >= 200 && status < 300, status, headers: { get: (name: string) => headers[name.toLowerCase()] ?? null }, json: async () => body }` pretvoren u `Response` preko `as unknown as Response`.
    - `nonJsonResponse(status)`: isto, ali `json` baca `new SyntaxError("Unexpected token <")`.
  - **Test**: datoteka nema svoj test; koriste je kasniji testovi.
  - **Gotovo kada**: `pnpm typecheck` prolazi; svaki graditelj prolazi `RunResponseSchema.parse` (proveriti privremeno u jednom od kasnijih testova, ne ovde).
  - **AC/EV**: — | **Zavisi od**: T201

- [X] T204 [P] Dodati primer podešavanja adrese servisa u `apps/web/.env.example`
  - **Datoteke**: `apps/web/.env.example` (novo).
  - **Izmena**: tačno dva reda: `# Adresa servera bez završne kose crte. Prazno znači ista adresa kao interfejs.` i `VITE_API_BASE_URL=`.
  - **Gotovo kada**: datoteka postoji; nijedna tajna nije upisana.
  - **AC/EV**: AC-10 | **Zavisi od**: T201

---

## Faza 2: Osnova (blokira sve priče)

- [X] T205 Premestiti sve boje iz `apps/web/src/styles.css` u tokene na `:root`
  - **Datoteke**: `apps/web/src/styles.css`, `apps/web/test/unit/contrast.test.ts` (novo).
  - **Izmena**: u postojeći blok `:root` dodati sve tokene iz [plan.md](plan.md), odeljak 5.2, doslovno. Zatim zameniti svaku doslovnu boju van `:root`: `#49675d`→`var(--ink-muted)`, `#176f50`→`var(--accent)`, `#17362d`→`var(--ink)`, `#60776d`→`var(--ink-subtle)`, `#e0e9e3`→`var(--border-card)`, `#ffebe8`→`var(--not-met-bg)`, `#e8efea`→`var(--border-soft)`, `#e7f2eb`→`var(--live-bg)`, `#e3f4e9`→`var(--met-bg)`, `#c0533f`→`var(--not-met)`, `#842e24`→`var(--not-met-ink)`, `#7a879c`→`var(--unknown)`, `#2f8f63`→`var(--met)`, `#244e3e`→`var(--live-ink)`, `#15583f`→`var(--met-ink)`, `#fff6e3`→`var(--notice-bg)`, `#fff0cb`→`var(--pending-bg)`, `#ffedc5`→`var(--demo-bg)`, `#f5f8f6`→`var(--bg)`, `#f4f7f5`→`var(--surface-soft)`, `#e8a52a`→`var(--focus)`, `#dce8e1`→`var(--border)`, `#d39219`→`var(--notice-border)`, `#b5d5c1`→`var(--quote-rail)`, `#aebfb5`→`var(--border-input)`, `#77520c`→`var(--pending-ink)`, `#6d4a0b`→`var(--demo-ink)`, `#5e481e`→`var(--notice-ink)`, `#447161`→`var(--ink-eyebrow)`, `#314f42`→`var(--ink-quote)`; `white` kao pozadina→`var(--surface)`, `white` kao boja teksta na akcentu→`var(--on-accent)`; `0 5px 20px rgb(22 66 48 / 4%)`→`var(--shadow-panel)`. U `:root` zameniti `font-family` nizom `var(--font-sans)`, `color` sa `var(--ink)`, `background` sa `var(--bg)`. Posledica: indikator fokusa postaje `#9a6700`, a ivica polja `#6f877b` (obe izmene su odobrene).
  - **Test**: `contrast.test.ts`, test „styles.css nema doslovnih boja van :root“: pročitati `apps/web/src/styles.css` (kao u `apps/web/test/accessibility.test.tsx`), izdvojiti tekst posle prvog bloka `:root { … }` i proveriti da ne sadrži obrazac `#[0-9a-fA-F]{3,8}\b`, reč `white` ni `rgb(`.
  - **Gotovo kada**: test prolazi; postojeći testovi prolaze.
  - **AC/EV**: AC-12 | **Zavisi od**: T201

- [X] T206 Dodati proveru kontrasta tokena u `apps/web/test/unit/contrast.test.ts`
  - **Datoteke**: `apps/web/test/unit/contrast.test.ts`.
  - **Izmena**: u testu napisati funkcije `tokens(css)` (čita parove `--naziv: #vrednost;` iz bloka `:root`) i `contrast(a, b)` po formuli WCAG (relativna luminansa: kanal `c/255`; ako je `≤ 0.03928` onda `c/12.92`, inače `((c+0.055)/1.055)^2.4`; `L = 0.2126R + 0.7152G + 0.0722B`; odnos `(L_svetliji + 0.05)/(L_tamniji + 0.05)`).
  - **Test**: (1) najmanje 4,5 za parove tekst/pozadina: `--met-ink`/`--met-bg`, `--not-met-ink`/`--not-met-bg`, `--unknown-ink`/`--unknown-bg`, `--pending-ink`/`--pending-bg`, `--demo-ink`/`--demo-bg`, `--live-ink`/`--live-bg`, `--notice-ink`/`--notice-bg`, `--ink`/`--bg`, `--ink-muted`/`--surface`, `--ink-muted`/`--live-bg`, `--ink-subtle`/`--bg`, `--ink-subtle`/`--surface`, `--ink-eyebrow`/`--surface`, `--ink-quote`/`--surface`, `--on-accent`/`--accent`, `--accent`/`--surface`. (2) najmanje 3 za ne-tekst: `--focus` prema `--bg`, `--surface`, `--notice-bg` i `--met-bg`; `--border-input`/`--surface`; `--met`, `--not-met`, `--unknown` prema `--surface` i prema `--border-soft`. (3) tačne vrednosti: `--focus` je `#9a6700`, `--met-ink` `#15583f`, `--not-met-ink` `#842e24`, `--unknown-ink` `#4f5b70`, `--border-input` `#6f877b`.
  - **Gotovo kada**: sva tri testa prolaze.
  - **AC/EV**: AC-12 | **Zavisi od**: T205

- [X] T207 Ujednačiti poluprečnike i dodati pomoćne klase u `apps/web/src/styles.css`
  - **Datoteke**: `apps/web/src/styles.css`, `apps/web/test/unit/contrast.test.ts`.
  - **Izmena**: svaki `border-radius` zameniti tokenom: dugmad, polja, `.brand-mark`, `.state-message`, `.error-message`, `.saved-notice`, `.unknown-fields`, `.safety-notice` → `var(--radius-control)`; `.trial-card` → `var(--radius-card)`; `.panel` → `var(--radius-panel)`; `.demo-badge`, `.status-tag` → `var(--radius-pill)`. Ostaju doslovno samo `50%` (`.pulse-dot`) i `3px` (`.criteria-summary-bar`). Dodati klasu `.mono { font-family: var(--font-mono); font-size: 0.95em; font-weight: 500; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }`. Postaviti `.panel h2 { font-size: 1.35rem; line-height: 1.25; font-weight: 800; }` i `h3 { font-size: 1.1rem; line-height: 1.3; font-weight: 700; }`.
  - **Test**: u `contrast.test.ts` dodati test „poluprečnici su samo iz tokena“: svaka vrednost `border-radius` van `:root` je `var(--radius-…)`, `50%` ili `3px`.
  - **Gotovo kada**: test prolazi.
  - **AC/EV**: AC-12 | **Zavisi od**: T205

- [X] T208 [P] Napraviti model greške u `apps/web/src/api/ui-error.ts`
  - **Datoteke**: `apps/web/src/api/ui-error.ts` (novo), `apps/web/test/unit/ui-error.test.ts` (novo).
  - **Izmena**: izvesti tipove `UiErrorKind`, `UiErrorAction`, `UiError` tačno kao u [data-model.md](data-model.md), odeljak 2. Izvesti `uiErrorFromCategory(error: { category: string; message: string; retryable: boolean }, source: "run" | "http"): UiError` po prvoj tabeli tog odeljka (za izvor `"run"` `runLost` je uvek `true`; za nepoznatu kategoriju postaviti `serverMessage`). Izvesti `uiErrorFromTransport(circumstance, requestKind, retryAfterHeader?)` po drugoj tabeli, gde je `circumstance` jedno od `"network" | "timeout" | "not_json" | "invalid_schema" | { httpStatus: number }`. Izvesti `parseRetryAfter(value: string | null): number`: ceo broj između 1 i 600, inače `DEFAULT_RETRY_AFTER_SECONDS` iz `copy.ts`. Za `rate_limited` uvek postaviti `retryAfterSeconds`.
  - **Test**: `ui-error.test.ts`: po jedan slučaj za svaku od 18 kategorija (R-02) sa oba izvora gde se ishod razlikuje; nepoznata kategorija `"nesto_novo"` sa `retryable: true` daje `service`/`retry` i `serverMessage`; svaki red druge tabele; `parseRetryAfter("30") === 30`, `parseRetryAfter(null) === 60`, `parseRetryAfter("abc") === 60`, `parseRetryAfter("0") === 60`, `parseRetryAfter("9999") === 60`.
  - **Gotovo kada**: svi slučajevi prolaze.
  - **AC/EV**: AC-07, AC-10; EV-12, EV-15 (mock analozi) | **Zavisi od**: T202

- [X] T209 Napraviti mrežni sloj u `apps/web/src/api/client.ts`
  - **Datoteke**: `apps/web/src/api/client.ts` (novo), `apps/web/test/unit/client.test.ts` (novo).
  - **Izmena**: izvesti `type ApiOutcome = { ok: true; response: RunResponse } | { ok: false; error: UiError }` i `async function postJson(path: string, body: Record<string, string>, requestKind: RequestKind): Promise<ApiOutcome>`. Koraci: (1) osnova adrese: `const raw: unknown = import.meta.env.VITE_API_BASE_URL; const base = typeof raw === "string" ? raw.replace(/\/$/, "") : "";` adresa je `base + path`, a osnova se čita pri svakom pozivu, ne jednom pri učitavanju modula; (2) `fetch` sa `method: "POST"`, zaglavljem `content-type: application/json`, telom `JSON.stringify(body)` i `signal` iz `AbortController` koji se prekida posle `REQUEST_TIMEOUT_MS`; tajmer se čisti u `finally`; (3) ako `fetch` baci: prekid → okolnost `"timeout"`, inače `"network"`; (4) `await response.json()` u `try/catch`; ako baci: za `response.ok` okolnost `"not_json"`, inače `{ httpStatus: response.status }`; (5) ako `!response.ok`: `ApiErrorRequestSchema.safeParse(telo)`; uspeh → `uiErrorFromCategory(…, "http")`, uz `parseRetryAfter(response.headers.get("retry-after"))` za `rate_limited`; neuspeh → `{ httpStatus: response.status }`; (6) ako `response.ok`: `RunResponseSchema.safeParse(telo)`; neuspeh → `"invalid_schema"`. Funkcija nikad ne baca.
  - **Test**: `client.test.ts` sa `vi.stubGlobal("fetch", …)` i graditeljima iz T203: ispravan odgovor; `fetch` odbijen (`network`); prekid posle 70 s uz lažne tajmere (`client_timeout`); `nonJsonResponse(200)` (`bad_response`); `jsonResponse({ foo: 1 })` (`invalid_response`); `jsonResponse(httpErrorBody("rate_limit_exceeded", false), 429, { "retry-after": "30" })` daje `retryAfterSeconds: 30`, a bez zaglavlja `60`; `nonJsonResponse(502)` (`service`/`retry`); `jsonResponse(httpErrorBody("run_not_found", false), 404)` (`run_expired`); proveriti da je `fetch` pozvan sa putanjom `/api/runs` kada promenljiva nije postavljena; posle `vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/")` poziv ide na `https://api.example.test/api/runs` (posle testa `vi.unstubAllEnvs()`).
  - **Gotovo kada**: svi slučajevi prolaze i nijedan test ne završava neuhvaćenim izuzetkom.
  - **AC/EV**: AC-07, AC-10; EV-11, EV-15 (mock analozi) | **Zavisi od**: T203, T208

- [X] T210 [P] Napraviti reduktor stanja u `apps/web/src/state/run-state.ts`
  - **Datoteke**: `apps/web/src/state/run-state.ts` (novo), `apps/web/test/unit/run-state.test.ts` (novo).
  - **Izmena**: izvesti `RequestKind`, `LastRequest`, `Phase`, `RunState`, `RunAction`, `initialRunState` i `runReducer(state, action)` tačno po [data-model.md](data-model.md), odeljak 1 (tabela „Prelazi“). Izvesti i čiste funkcije `isBusy`, `resultIsStale`, `showSavedNotice`, `isHypothesisResult`, `canStartOver` po tabeli „Izvedeno iz stanja“.
  - **Test**: `run-state.test.ts`: po jedan test za svaki red tabele „Prelazi“ (7 redova) i svaki red tabele „Izvedeno iz stanja“; posebno: `resultSeq` raste samo pri `succeeded` sa statusom koji nije `error`; `submit` tokom obrade vraća isto stanje; `submit` vrste `run` briše `result`; `failed` sa `runLost: false` posle `hypothesis` čuva `result`; `succeeded` sa statusom `error` briše `result` i postavlja `meta`.
  - **Gotovo kada**: svi testovi prolaze.
  - **AC/EV**: AC-03, AC-10 | **Zavisi od**: T208

- [X] T211 [P] Dodati oznake i formatiranje vrednosti u `apps/web/src/result-view-model.ts`
  - **Datoteke**: `apps/web/src/result-view-model.ts`, `apps/web/test/unit/result-view-model.test.ts`.
  - **Izmena**: dodati `resultHeading`, `verdictLabel`, `criterionStatusShort`, `criterionStatusNote`, `criterionStatusIcon`, `formatNumber`, `formatObservedValue` po [data-model.md](data-model.md), odeljak 4. Tekstove čitati iz `copy` (`copy.result.*`, `copy.trial.verdict`, `copy.criterion.*`). `formatNumber`: `String(Math.round(value * 100) / 100).replace(".", ",")`. Postojeće funkcije ne menjati.
  - **Test**: dodati u postojeću datoteku: `verdictLabel("candidate") === "Kandidat za dalju proveru"` i druge dve; `resultHeading` za `no_matching_trial` i `not_in_sources`; `formatNumber(8.1) === "8,1"`, `formatNumber(62) === "62"`, `formatNumber(61.666) === "61,67"`; `formatObservedValue(null)` daje `{ text: "nije uneto", missing: true }`; `true` → „da“; `false` → „ne“; `"male"` → „muški“; `"female"` → „ženski“; `"metformin"` doslovno; `criterionStatusIcon("unknown") === "?"`.
  - **Gotovo kada**: novi i postojeći testovi prolaze.
  - **AC/EV**: AC-01, AC-03, AC-12 | **Zavisi od**: T202

- [X] T212 [P] Dodati oznake profila u `apps/web/src/result-view-model.ts`
  - **Datoteke**: `apps/web/src/result-view-model.ts`, `apps/web/test/unit/result-view-model.test.ts`.
  - **Izmena**: dodati tipove `ProfileChip`, `DerivedChip` i funkcije `profileChips`, `derivedChips`, `profileAmbiguities` po [data-model.md](data-model.md), odeljak 4 i tabeli „Pravila za oznake profila“. Nazive polja čitati iz `copy.profile.fields`. U `missingProfileFields` oznaku pola promeniti iz „pol za eGFR“ u „pol“ (čitati iz `copy.profile.fields`); redosled i ostale oznake ostaju.
  - **Test**: `profileChips({ age: 62, sex: "male", hba1c: { value: 8.1, unit: "%" }, creatinine: { value: 1.3, unit: "mg/dL" }, insulin_last_3_months: false, provenance: { insulin_last_3_months: { origin: "answer", round: 1 } } })` daje redom oznake sa vrednostima „62“, „M“, „8,1%“, „1,3 mg/dL“, „ne“, a poslednja ima `origin: "answer"`; `derivedChips` za eGFR 62.11 daje tekst „eGFR ≈ 62,11 mL/min/1.73 m²“; `profileAmbiguities` vraća oznaku „HbA1c“ za polje `hba1c`; postojeći test za `missingProfileFields` i dalje prolazi.
  - **Gotovo kada**: testovi prolaze.
  - **AC/EV**: AC-01, AC-02, AC-03 | **Zavisi od**: T211

- [X] T213 [P] Dodati vezu ka registru, sidro, oznaku režima i datum u `apps/web/src/result-view-model.ts`
  - **Datoteke**: `apps/web/src/result-view-model.ts`, `apps/web/test/unit/result-view-model.test.ts`.
  - **Izmena**: dodati `trialRegistryUrl`, `trialAnchorId`, tip `ModeBadgeModel`, `modeBadge`, `formatSnapshotDate` po [data-model.md](data-model.md), odeljak 4. Meseci za datum: januar, februar, mart, april, maj, jun, jul, avgust, septembar, oktobar, novembar, decembar.
  - **Test**: `trialRegistryUrl("NCT01234567") === "https://clinicaltrials.gov/study/NCT01234567"`; `null` za `"T-A"`, `"NCT123"`, `"nct01234567"`, `"NCT01234567/x"`; `trialAnchorId(0) === "trial-1"`; `modeBadge(null) === null`; demo → `{ kind: "demo" }`; `demoMode: false, modelId: "m-1"` → `{ kind: "live", modelId: "m-1" }`; prazan `modelId` → `modelId: null`; `formatSnapshotDate("2026-11-07") === "7. novembar 2026."`; `formatSnapshotDate("juče") === null`.
  - **Gotovo kada**: testovi prolaze.
  - **AC/EV**: AC-01, AC-08 | **Zavisi od**: T211

- [X] T214 Prevesti `apps/web/src/App.tsx` na reduktor i novi mrežni sloj, bez promene izgleda
  - **Datoteke**: `apps/web/src/App.tsx`, `apps/web/test/integration/run-flow.test.tsx`.
  - **Izmena**: ukloniti lokalnu funkciju `postJson` i stanja `result`, `lastAction`, `busy`, `error`. Uvesti `useReducer(runReducer, initialRunState)`. Dodati `async function send(request: LastRequest)`: ako je `isBusy(state)` vratiti se; `dispatch({ type: "submit", request })`; `const outcome = await postJson(request.path, request.body, request.kind)`; zatim `succeeded` ili `failed`. `startRun`, `sendAnswer`, `sendHypothesis` grade `LastRequest` (putanje i tela iz [contracts/ui-api.md](contracts/ui-api.md)) i zovu `send`. Posle uspešnog `answer` isprazniti `answer`; posle uspešnog `hypothesis` isprazniti `hypothesis`. Postojeći JSX ostaje, uz zamene: `result` → `state.result`, `busy` → `isBusy(state)`, `lastAction === "answer"` → `showSavedNotice(state)`. Greška se privremeno prikazuje u postojećem `<p className="error-message" role="alert">` kao `copy.errors[state.error.kind].title` i `.body` u dva elementa `span`.
  - **Test**: u `run-flow.test.tsx` tri lažna odgovora zameniti sa `jsonResponse(…)` iz T203 (isti sadržaj kao danas). Tok testa ostaje isti (klik „Ne“, pa „Pošalji dopunu“).
  - **Gotovo kada**: postojeći integracioni test i test pristupačnosti prolaze; u `App.tsx` nema više `throw new Error` ni `.parse(`.
  - **AC/EV**: AC-03, AC-07, AC-10; EV-06 (mock analog) | **Zavisi od**: T209, T210

**Kontrolna tačka**: osnova je gotova; izgled je isti kao pre, osim boje fokusa i ivice polja.

---

## Faza 3: Priča 1 — Pregled rezultata sa dokazima na prvi pogled (P1)

**Cilj**: kartica profila, srpske oznake ishoda, vrednost i izvor po kriterijumu, pregled studija, veza ka registru.

**Nezavisna provera**: [quickstart.md](quickstart.md), odeljak 5, stanje 4.

- [X] T215 [P] [US1] Napraviti red kriterijuma u `apps/web/src/components/CriterionRow.tsx`
  - **Datoteke**: `apps/web/src/components/CriterionRow.tsx` (novo), `apps/web/src/styles.css`, `apps/web/test/integration/trial-list.test.tsx` (novo).
  - **Izmena**: komponenta `CriterionRow({ criterion })` vraća `<li className={`criterion criterion-${criterion.status}`}>` sa dva deteta. Prvo, `<div className="criterion-main">`: `<p className="criterion-status"><span className={`status-pill status-${status}`}><span aria-hidden="true">{znak}</span> {kratka oznaka}</span> <span className="status-note">{napomena}</span></p>`; `<p className="criterion-text">{criterion.text}</p>`; `<p className="criterion-evidence">{copy.criterion.value} <span className={missing ? "value-missing" : "mono"}>{tekst vrednosti}</span> · {copy.criterion.source} <span className="mono">{criterion.sourceId}</span></p>`. Drugo: `<blockquote><q>{criterion.citation.quote}</q></blockquote>`. Bez `motion`. CSS: ukloniti pravila `.criteria-list span` i `.criteria-list li` (zamenjuje ih `.criterion`); `.criterion { display: grid; gap: var(--space-2) var(--space-5); border-left: 3px solid transparent; border-top: 1px solid var(--border-soft); padding: var(--space-3) 0 0 var(--space-3); }`; `@media (min-width: 720px) { .criterion { grid-template-columns: minmax(0, 5fr) minmax(0, 6fr); } }`; `.criterion-main { display: grid; gap: var(--space-2); align-content: start; }`; `.criterion-main p { margin: 0; }`; `.status-pill { display: inline-flex; align-items: center; gap: var(--space-1); border-radius: var(--radius-pill); padding: 0.2rem 0.6rem; font-size: 0.8rem; font-weight: 700; }`; `.status-met { color: var(--met-ink); background: var(--met-bg); }`, `.status-not_met { color: var(--not-met-ink); background: var(--not-met-bg); }`, `.status-unknown { color: var(--unknown-ink); background: var(--unknown-bg); }`; `.status-note, .criterion-evidence { color: var(--ink-muted); font-size: 0.85rem; }`; `.criterion-evidence .mono { color: var(--ink); }`; `.value-missing { color: var(--ink-subtle); }`; `blockquote q { overflow-wrap: anywhere; }`. Pravila `.criterion-met`, `.criterion-not_met`, `.criterion-unknown` ostaju.
  - **Test**: `trial-list.test.tsx`, opis „red kriterijuma“: prikazati `<ul><CriterionRow …/></ul>` za tri kriterijuma iz `criterionOf`; proveriti tekst „Ispunjen“ i „prema dostupnim podacima“; „Vrednost: 62“; za `true` „da“; za `null` „nije uneto“; identifikator izvora; ceo citat u elementu `q`; nigde tekst `met`, `not_met`, `true`, `null`.
  - **Gotovo kada**: test prolazi.
  - **AC/EV**: AC-01, AC-03, AC-08; EV-01 (mock analog) | **Zavisi od**: T211, T207

- [X] T216 [US1] Napraviti karticu studije u `apps/web/src/components/TrialCard.tsx`
  - **Datoteke**: `apps/web/src/components/TrialCard.tsx` (novo), `apps/web/src/styles.css`, `apps/web/test/integration/trial-list.test.tsx`.
  - **Izmena**: `TrialCard({ trial, index })` vraća `<motion.article className="trial-card" id={trialAnchorId(index)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...enter, delay: Math.min(index, 8) * 0.04 }}>`. Sadržaj: `<div className="trial-heading"><div><p className="eyebrow mono">{trial.trialId}</p><h3 id={`${trialAnchorId(index)}-title`} tabIndex={-1}>{trial.title}</h3></div><span className={`status-tag verdict-${trial.verdict}`}>{verdictLabel(trial.verdict)}</span></div>`; ako `trialRegistryUrl(trial.trialId)` nije `null`: `<p className="trial-links"><a href={url} target="_blank" rel="noopener noreferrer">{copy.trial.registryLink(trial.trialId)} <span aria-hidden="true">↗</span><span className="visually-hidden"> {copy.trial.newTab}</span></a></p>`; `<CriteriaSummaryBar summary={summarizeCriteria(trial.criteria)} />`; ako ima kriterijuma `<ul className="criteria-list">` sa `CriterionRow` (ključ `criterion.id`), inače `<p className="trial-empty">{copy.trial.noCriteria}</p>`. CSS: `.trial-card { content-visibility: auto; contain-intrinsic-size: auto 600px; }` (uz postojeća pravila); `.trial-heading h3 { overflow-wrap: anywhere; scroll-margin-top: var(--space-4); }`; `.verdict-candidate { color: var(--met-ink); background: var(--met-bg); }`, `.verdict-pending { color: var(--pending-ink); background: var(--pending-bg); }`, `.verdict-excluded { color: var(--not-met-ink); background: var(--not-met-bg); }` (zameniti postojeća grupisana pravila); `.trial-links { margin: var(--space-2) 0 0; font-size: 0.85rem; }`; `.trial-links a { color: var(--accent); }`; `.trial-empty { color: var(--ink-muted); }`.
  - **Test**: opis „kartica studije“: oznaka „Kandidat za dalju proveru“ i nigde `candidate`; za `trialId: "NCT01234567"` veza ima `href` `https://clinicaltrials.gov/study/NCT01234567`, `target="_blank"`, `rel="noopener noreferrer"`; za `"T-1"` nema veze; sažetak „1 od 3 ispunjeno, 1 nije ispunjeno, 1 nepoznato“ je u DOM-u; studija bez kriterijuma prikazuje poruku.
  - **Gotovo kada**: test prolazi.
  - **AC/EV**: AC-01, AC-08; EV-01 (mock analog) | **Zavisi od**: T215, T213

- [X] T217 [US1] Napraviti pregled studija u `apps/web/src/components/TrialOverview.tsx`
  - **Datoteke**: `apps/web/src/components/TrialOverview.tsx` (novo), `apps/web/src/styles.css`, `apps/web/test/integration/trial-list.test.tsx`.
  - **Izmena**: `TrialOverview({ trials })`; ako je `trials.length <= 1` vraća `null`. Inače `<nav className="trial-overview" aria-labelledby="overview-heading"><h3 id="overview-heading">{copy.overview.heading}</h3><p className="overview-count">{copy.overview.count(trials.length)}</p><ol>` i po redu `<li><a href={`#${trialAnchorId(i)}`} onClick={() => document.getElementById(`${trialAnchorId(i)}-title`)?.focus()}><span className="mono">{trial.trialId}</span> <span className="overview-verdict">{verdictLabel(trial.verdict)}</span> · <span className="overview-summary">{summarizeCriteria(trial.criteria).label}</span></a></li>`. CSS: `.trial-overview { margin-top: var(--space-5); border-top: 1px solid var(--border-card); padding-top: var(--space-4); }`; `.trial-overview ol { display: grid; gap: var(--space-1); margin: 0; padding-left: var(--space-5); }`; `.trial-overview a { color: var(--ink); text-decoration: none; overflow-wrap: anywhere; }`; `.trial-overview a:hover { text-decoration: underline; }`; `.overview-count, .overview-summary { color: var(--ink-muted); font-size: 0.85rem; }`; `.overview-verdict { font-weight: 700; }`.
  - **Test**: opis „pregled studija“: za jednu studiju ne prikazuje ništa; za tri studije tri veze u istom redosledu kao ulaz; prikazati zajedno `TrialOverview` i tri `TrialCard`, kliknuti treću vezu i proveriti da je `document.activeElement` naslov treće studije.
  - **Gotovo kada**: test prolazi.
  - **AC/EV**: AC-01, AC-12 | **Zavisi od**: T216

- [X] T218 [P] [US1] Napraviti karticu profila u `apps/web/src/components/ProfileCard.tsx`
  - **Datoteke**: `apps/web/src/components/ProfileCard.tsx` (novo), `apps/web/src/styles.css`, `apps/web/test/integration/profile-card.test.tsx` (novo).
  - **Izmena**: `ProfileCard({ profile, derived, sourceText })` vraća `<section className="profile-card" aria-labelledby="profile-card-heading">` sa: `<h3 id="profile-card-heading">{copy.profile.heading}</h3>`; ako `sourceText` nije `null`: `<p className="profile-label">{copy.profile.sourceLabel}</p><p className="source-text">{sourceText}</p>`; `<p className="profile-label">{copy.profile.extractedLabel}</p>` i `<ul className="chip-list">` sa `<li className="chip"><span className="chip-label">{label}</span> <span className="mono">{value}</span>{sufiks}</li>`, gde je sufiks `<span className="chip-origin">{copy.profile.originAnswer}</span>` za `origin === "answer"`, `<span className="chip-origin chip-hypothetical">{copy.profile.originHypothesis}</span>` za `"hypothesis"`, inače ništa; ako nema nijedne oznake, umesto liste `<p className="profile-empty">{copy.profile.noneExtracted}</p>`; ako `derived.length > 0`: oznaka „Izračunato“, `<ul className="chip-list">` sa `<li className="chip chip-derived"><span className="mono">{text}</span> <span className="chip-origin">{copy.profile.derivedSuffix}</span></li>` i ispod `<ul className="formula-list">` sa `<li>{copy.profile.formula(formula, source)}</li>` po vrednosti; ako `missingProfileFields(profile).length > 0`: oznaka „Nije uneto“ i `<ul className="chip-list">` sa `<li className="chip chip-missing">{naziv}</li>`; ako ima nejasnoća: oznaka „Nejasno u unosu“ i `<ul className="formula-list">` sa `<li>{label}: {reason}</li>`. CSS: `.profile-card { margin: var(--space-4) 0; border: 1px solid var(--border-card); border-radius: var(--radius-card); padding: var(--space-4); background: var(--surface-soft); }`; `.profile-card h3 { margin: 0 0 var(--space-3); }`; `.profile-label { margin: var(--space-3) 0 var(--space-2); color: var(--ink-eyebrow); font-size: 0.75rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }`; `.source-text { margin: 0; border-left: 3px solid var(--quote-rail); padding-left: var(--space-3); color: var(--ink-quote); overflow-wrap: anywhere; }`; `.chip-list { display: flex; flex-wrap: wrap; gap: var(--space-2); margin: 0; padding: 0; list-style: none; }`; `.chip { display: inline-flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-1); max-width: 100%; border: 1px solid var(--border); border-radius: var(--radius-pill); padding: 0.25rem 0.65rem; background: var(--surface); font-size: 0.9rem; }`; `.chip-label { color: var(--ink-muted); }`; `.chip-derived { border: 1px dashed var(--ink-subtle); }`; `.chip-missing { border-color: var(--border-soft); color: var(--ink-subtle); background: transparent; }`; `.chip-origin { color: var(--ink-muted); font-size: 0.8rem; }`; `.chip-hypothetical { border-radius: var(--radius-pill); padding: 0 0.4rem; color: var(--pending-ink); background: var(--pending-bg); }`; `.formula-list { display: grid; gap: var(--space-1); margin: var(--space-2) 0 0; padding: 0; list-style: none; color: var(--ink-muted); font-size: 0.85rem; }`; `.profile-empty { margin: 0; color: var(--ink-muted); }`.
  - **Test**: `profile-card.test.tsx`: sa profilom i izvedenom vrednošću iz `okResponse()` i `sourceText` „Sintetički profil“ vide se „Sintetički profil“, „starost“ i „62“, „pol“ i „M“, „8,1%“, „eGFR ≈ 62,11 mL/min/1.73 m²“ uz „izračunao kod“, „CKD-EPI 2021. Izvor: docs/project-brief.md“; u redu „Nije uneto“ je „kreatinin“, a nije „starost“; nigde `male`; sa poreklom `answer` vidi se „iz dopune“, sa `hypothesis` „hipotetički“; prazan profil `{}` prikazuje poruku da ništa nije prepoznato.
  - **Gotovo kada**: test prolazi.
  - **AC/EV**: AC-01, AC-02, AC-03; EV-01, EV-04 (mock analozi) | **Zavisi od**: T212, T207

- [X] T219 [US1] Sastaviti panel rezultata u `apps/web/src/components/ResultPanel.tsx` i uključiti ga u `apps/web/src/App.tsx`
  - **Datoteke**: `apps/web/src/components/ResultPanel.tsx` (novo), `apps/web/src/App.tsx`, `apps/web/src/styles.css`, `apps/web/test/integration/outcomes.test.tsx` (novo), `apps/web/test/integration/trial-list.test.tsx`.
  - **Izmena**: `ResultPanel({ result, sourceText, showSaved, children })` vraća `<motion.section className="panel results-panel" aria-labelledby="results-heading" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={enter}>` sa: `{showSaved && <SavedNotice />}`; `<div className="results-heading"><div><p className="eyebrow">{copy.result.eyebrow}</p><h2 id="results-heading" tabIndex={-1}>{resultHeading(result)}</h2></div></div>`; `<p className="explanation">{result.explanation}</p>`; `{result.profile && <ProfileCard profile={result.profile} derived={result.derived} sourceText={sourceText} />}`; `<TrialOverview trials={result.results} />`; `{result.results.length > 0 && <div className="trial-list">` sa `TrialCard` po studiji (ključ `trial.trialId`) `</div>}`; `{children}`. U `App.tsx` ceo blok `{result && (<motion.section …>…)}` zameniti sa `<div className="results-region" aria-live="polite">{state.result && (<ResultPanel key={state.result.runId} result={state.result} sourceText={state.sourceText} showSaved={showSavedNotice(state)}> … </ResultPanel>)}</div>`, gde su deca postojeći obrazac dopune, postojeći obrazac „Šta ako?“ i postojeće podnožje `result-meta`, nepromenjeni. Ukloniti iz `App.tsx`: oznaku `status-tag` sa sirovim statusom, blok `.unknown-fields`, odeljak „Deterministički izvedene vrednosti“ i listu studija (sve to sada daje `ResultPanel`). Ukloniti uvoze koji više nisu potrebni. CSS: `.explanation { max-width: 68ch; }`; ukloniti pravila `.status-needs_clarification`, `.status-insufficient_evidence`, `.status-rejected`, `.status-error`, `.unknown-fields`, `.derived-list`.
  - **Test**: `outcomes.test.tsx`, test „stanje 4“: `fetch` vraća `jsonResponse(okResponse())`; uneti tekst, kliknuti „Proveri kriterijume“; videti „Preliminarna provera završena“, karticu profila sa unetim tekstom, „Pregled studija“, tri naslova studija; u `document.body.textContent` nema `ok`, `candidate` ni `needs_clarification` kao cele reči. `trial-list.test.tsx`, test „50 studija“: `okResponse({ results: trialsOf(50) })`; 50 elemenata `article`; naslovi u redosledu „Studija 1“ … „Studija 50“; pregled ima 50 veza; vreme od klika do pojave naslova „Studija 50“, mereno sa `performance.now()`, manje je od 1000 ms (SC-011).
  - **Gotovo kada**: novi testovi, `run-flow.test.tsx` i `accessibility.test.tsx` prolaze.
  - **AC/EV**: AC-01, AC-08; EV-01, EV-02 (mock analozi) | **Zavisi od**: T214, T216, T217, T218

- [ ] T220 [US1] [BLOCKED: Role B] Prikazati jedinicu i oznaku „izračunao kod“ u `apps/web/src/components/CriterionRow.tsx`
  - **Čeka**: REQ-B7. Uloga B dodaje u `CriterionResultSchema` jedinicu uočene vrednosti i poreklo (predlog: `observedUnit: string | null`, `observedOrigin: "profile" | "derived"`). Ne počinjati dok polja ne postoje u `packages/shared/src/index.ts`; tada koristiti nazive koje je Uloga B stvarno uvela.
  - **Datoteke**: `apps/web/src/components/CriterionRow.tsx`, `apps/web/src/styles.css`, `apps/web/test/integration/trial-list.test.tsx`, `apps/web/test/helpers/responses.ts`.
  - **Izmena**: iza vrednosti dodati jedinicu u istom `span.mono` (jedinica „%“ bez razmaka, ostale sa razmakom); kada je poreklo `derived`, iza vrednosti dodati `<span className="chip-origin">{copy.criterion.computed}</span>`. Kada je vrednost `null`, jedinica i oznaka se ne prikazuju.
  - **Test**: red sa vrednošću 62.11, jedinicom i poreklom `derived` prikazuje „62,11 mL/min/1.73 m²“ i „izračunao kod“; red iz profila nema oznaku.
  - **Gotovo kada**: test prolazi; [docs/ac-coverage.md] red AC-02 dopunjen.
  - **AC/EV**: AC-01, AC-02 | **Zavisi od**: T215, REQ-B7

- [ ] T221 [US1] [BLOCKED: Role B] [BLOCKED: Role C] Prikazati status regrutacije i fazu u `apps/web/src/components/TrialCard.tsx`
  - **Čeka**: REQ-B6 (polja u `TrialResultSchema`; predlog `overallStatus`, `phase`) i REQ-C2 (stvarni snimak sa tim podacima i potvrđen skup vrednosti).
  - **Datoteke**: `apps/web/src/components/TrialCard.tsx`, `apps/web/src/result-view-model.ts`, `apps/web/src/copy.ts`, `apps/web/src/styles.css`, `apps/web/test/unit/result-view-model.test.ts`, `apps/web/test/integration/trial-list.test.tsx`.
  - **Izmena**: dodati u `copy.ts` tabelu vrednosti registra iz [plan.md](plan.md), odeljak 6 (druga tabela); dodati `recruitmentStatusLabel(value)` i `phaseLabel(value)` (nepoznata vrednost se vraća doslovno); u `TrialCard` ispod naslova, kada polje postoji i nije prazno: `<p className="trial-facts">{copy.trial.recruitment} {oznaka} · {copy.trial.phase} {oznaka}</p>`; kada polja nema, red se ne prikazuje.
  - **Test**: poznata vrednost daje srpski tekst; nepoznata se prikazuje doslovno; bez polja nema reda.
  - **Gotovo kada**: testovi prolaze.
  - **AC/EV**: AC-01 | **Zavisi od**: T216, REQ-B6, REQ-C2

**Kontrolna tačka**: stanje 4 se može proveriti ručno u demo režimu.

---

## Faza 4: Priča 2 — Dopuna jednim klikom i nastavak iste provere (P1)

**Cilj**: jedan klik šalje ponuđeni odgovor; „Počni iznova“; označen rezultat hipoteze.

**Nezavisna provera**: [quickstart.md](quickstart.md), stanja 5, 6, 15 i 16.

- [X] T222 [US2] Napraviti obrazac dopune u `apps/web/src/components/ClarificationForm.tsx`
  - **Datoteke**: `apps/web/src/components/ClarificationForm.tsx` (novo), `apps/web/src/components/ResultPanel.tsx`, `apps/web/src/App.tsx`, `apps/web/src/styles.css`, `apps/web/test/integration/run-flow.test.tsx`.
  - **Izmena**: `ClarificationForm({ question, busy, onAnswer, headingRef })` drži lokalno `text` i `selected: string | null`. Izbor se briše kada obrada prestane bez novog rezultata: `useEffect(() => { if (!busy) setSelected(null); }, [busy]);` (kada stigne novi rezultat, komponenta se ionako ponovo pravi zbog ključa). Vraća `<motion.form className="follow-up" onSubmit={…} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...enter, delay: 0.1 }}>` sa: `<h3 ref={headingRef} tabIndex={-1}>{copy.clarify.heading}</h3>`; `<label htmlFor="answer">{question.text}</label>`; ako je `(question.options ?? []).length > 0`: `<div className="answer-options" role="group" aria-label={copy.clarify.optionsLabel}>` sa `<motion.button type="button" className="secondary-button" aria-pressed={selected === option} disabled={busy} onClick={() => { setSelected(option); onAnswer(option); }} {...pressable}>{option}</motion.button>` i ispod `<p className="form-hint">{copy.clarify.hint}</p>`; `<input id="answer" value={text} onChange=… disabled={busy} />` (bez `required`); `<motion.button type="submit" disabled={busy || text.trim().length === 0} {...pressable}>{copy.clarify.submit}</motion.button>`. `onSubmit`: `preventDefault`, pa `onAnswer(text.trim())`. `ResultPanel` dobija props `busy`, `onAnswer`, `clarificationRef`, `resultSeq` i prikazuje `<ClarificationForm key={resultSeq} … />` kada je `result.status === "needs_clarification" && result.question` (ključ prazni polje i izbor kada stigne novo pitanje, a čuva ih posle greške). `App.tsx` prosleđuje `resultSeq={state.resultSeq}`. Iz `App.tsx` ukloniti inline obrazac dopune, stanje `answer` i `sendAnswer`; dodati `onAnswer = (text) => send({ kind: "answer", path, body: { answer: text }, userText: text })`. CSS: `.form-hint { margin: 0; color: var(--ink-muted); font-size: 0.85rem; }`; `.secondary-button[aria-pressed="true"] { color: var(--on-accent); background: var(--accent); }` (postoji, proveriti tokene).
  - **Test**: u `run-flow.test.tsx` ukloniti red koji klikće „Pošalji dopunu“ posle klika na „Ne“; posle klika na „Ne“ odmah očekivati `fetchMock.mock.calls[1]?.[0] === "/api/runs/run-1/answer"` i telo `{"answer":"Ne"}`; zatim „Odgovor je sačuvan · ista provera je nastavljena“. Dodati test „slobodan odgovor“: pitanje sa `options: []`; nema grupe dugmadi; „Pošalji dopunu“ je onemogućeno za prazan tekst; posle unosa „10 godina“ šalje `{"answer":"10 godina"}`. Dodati test „dupli klik“: dva brza klika na „Ne“ daju tačno dva poziva `fetch` ukupno (početni i jedan odgovor). Dodati test „neuspeo odgovor“: `fetch` za odgovor odbijen → posle greške dugme „Ne“ ima `aria-pressed="false"` i ponovo je omogućeno.
  - **Gotovo kada**: sva četiri testa prolaze.
  - **AC/EV**: AC-03, AC-04; EV-06, EV-07, EV-08 (mock analozi) | **Zavisi od**: T219

- [X] T223 [US2] Napraviti obrazac „Šta ako?“ u `apps/web/src/components/HypothesisForm.tsx` i označiti rezultat hipoteze
  - **Datoteke**: `apps/web/src/components/HypothesisForm.tsx` (novo), `apps/web/src/components/ResultPanel.tsx`, `apps/web/src/App.tsx`, `apps/web/src/styles.css`, `apps/web/test/integration/outcomes.test.tsx`.
  - **Izmena**: `HypothesisForm({ busy, onSubmit })` drži lokalno `text`; vraća `<form className="follow-up hypothesis">` sa `<h3>{copy.hypothesis.heading}</h3>`, `<label htmlFor="hypothesis">{copy.hypothesis.label}</label>`, `<input id="hypothesis" maxLength={MAX_INPUT_CHARS} placeholder={copy.hypothesis.placeholder} disabled={busy} …/>`, dugmetom `{copy.hypothesis.submit}` (onemogućeno za prazan tekst ili `busy`) i `<p>{copy.hypothesis.note}</p>`. `ResultPanel` dobija props `onHypothesis`, `isHypothesis`, `hypothesisText`; prikazuje `HypothesisForm` kada je `result.status === "ok"` ili (`insufficient_evidence` i `reason === "no_matching_trial"`), sa `key={resultSeq}`, da se polje isprazni posle svakog novog rezultata, a sačuva posle greške. Kada je `isHypothesis`: mala oznaka je `copy.result.eyebrowHypothesis`, a iznad zaglavlja stoji `<div className="hypothesis-banner"><strong>{copy.result.hypothesisBanner}</strong>{hypothesisText && <span>{copy.result.hypothesisChange(hypothesisText)}</span>}</div>`. Iz `App.tsx` ukloniti inline obrazac, stanje `hypothesis` i `sendHypothesis`. CSS: `.hypothesis { border: 1px dashed var(--ink-subtle); border-radius: var(--radius-card); padding: var(--space-4); background: var(--bg); }` (uz postojeće `.follow-up`; ukloniti gornju liniju za ovu varijantu: `.hypothesis { border-top: 1px dashed var(--ink-subtle); }`); `.hypothesis-banner { display: grid; gap: var(--space-1); margin-bottom: var(--space-4); border-left: 4px solid var(--pending-ink); border-radius: var(--radius-control); padding: var(--space-3) var(--space-4); color: var(--pending-ink); background: var(--pending-bg); overflow-wrap: anywhere; }`.
  - **Test**: `outcomes.test.tsx`, test „stanje 15“: posle `okResponse()` uneti „A šta ako je HbA1c 9,0%?“ i kliknuti „Ponovi proveru“; drugi poziv ide na `/api/runs/run-1/hypothesis`; vide se „Rezultat hipotetičke izmene“, „Hipotetička izmena. Ovo nije izvorni profil.“ i „Izmena: „A šta ako je HbA1c 9,0%?““; polje `Unesite samo hipotetičku izmenu profila` je prazno. `run-flow.test.tsx` i dalje prolazi.
  - **Gotovo kada**: testovi prolaze.
  - **AC/EV**: AC-03; EV-06 (mock analog) | **Zavisi od**: T222

- [X] T224 [US2] Izdvojiti obrazac unosa u `apps/web/src/components/ProfileForm.tsx` sa proverom unosa
  - **Datoteke**: `apps/web/src/components/ProfileForm.tsx` (novo), `apps/web/src/App.tsx`, `apps/web/src/styles.css`, `apps/web/test/integration/outcomes.test.tsx`.
  - **Izmena**: `ProfileForm({ text, onTextChange, onSubmit, busy, canStartOver, onStartOver, textareaRef, children })` po [plan.md](plan.md), odeljak 5.5, i [data-model.md](data-model.md), odeljak 3. Drži lokalno `touched`. Polje: `id="profile-text"`, `ref={textareaRef}`, `rows={5}`, bez `maxLength` i bez `required`, `aria-describedby="profile-hint"`, `aria-invalid` kada se prikazuje greška, `onBlur` postavlja `touched`. Ispod polja `{children}` (mesto za glasovni unos), pa `<p id="profile-hint" className={greška ? "form-hint field-error" : "form-hint"} aria-live="polite">` sa tekstom: `too_long` → `copy.form.errorTooLong(text.length - MAX_INPUT_CHARS)`; `empty` i `touched` → `copy.form.errorEmpty`; `empty` bez `touched` → `copy.form.hintEmpty`; inače `copy.form.hint`. Podnožje: `<span className={too_long ? "field-error" : undefined}>{copy.form.counter(text.length)}</span>` i `<div className="form-actions">` sa dugmetom „Počni iznova“ (`type="button"`, `.secondary-button`, samo kada je `canStartOver`, `disabled={busy}`) i dugmetom `type="submit"` sa stalnim tekstom `copy.form.submit`, `disabled={busy || validity !== "valid"}`. Kada `text` postane prazan spolja (posle „Počni iznova“), `touched` se vraća na `false` (`useEffect` na `text === ""` i `!canStartOver`). `App.tsx`: zameniti inline panel obrasca komponentom; naslov panela `copy.form.heading`. CSS: `.field-error { color: var(--not-met-ink); font-weight: 700; }`; `.form-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }`; `textarea[aria-invalid="true"] { border-color: var(--not-met-ink); }`.
  - **Test**: `outcomes.test.tsx`, opis „stanje 2“: na početku dugme je onemogućeno i vidi se `copy.form.hintEmpty`; posle unosa i brisanja vidi se „Polje je prazno. Unesite opis profila ili pitanje.“ i polje ima `aria-invalid="true"`; unos od 4005 znakova ostaje ceo (dužina vrednosti 4005), vidi se „4005/4000 znakova“ i „Unos je duži od 4000 znakova za 5.“, dugme je onemogućeno; ispravan unos omogućava dugme; naziv dugmeta je uvek „Proveri kriterijume“.
  - **Gotovo kada**: testovi prolaze, uključujući `accessibility.test.tsx`.
  - **AC/EV**: AC-10, AC-12; EV-11 (mock analog) | **Zavisi od**: T214

- [X] T225 [US2] Povezati „Počni iznova“ u `apps/web/src/App.tsx`
  - **Datoteke**: `apps/web/src/App.tsx`, `apps/web/test/integration/outcomes.test.tsx`.
  - **Izmena**: dodati `startOver()`: ako je `isBusy(state)` vratiti se; `dispatch({ type: "reset" })`; `setProfileText("")`. Proslediti `canStartOver={canStartOver(state)}` i `onStartOver={startOver}` u `ProfileForm`. Dodati `const textareaRef = useRef<HTMLTextAreaElement>(null)` i `useEffect` koji, kada je `state.phase === "idle"` i `state.focusToken > 0`, zove `textareaRef.current?.focus()`.
  - **Test**: test „stanje 16“: posle `okResponse()` kliknuti „Počni iznova“; nema naslova rezultata; polje je prazno; `document.activeElement` je polje za unos; dugme „Počni iznova“ više nije u DOM-u; pre prvog odgovora dugme „Počni iznova“ ne postoji.
  - **Gotovo kada**: test prolazi.
  - **AC/EV**: AC-03 | **Zavisi od**: T224

**Kontrolna tačka**: tok unos → pitanje → jedan klik → rezultat → „Šta ako?“ → „Počni iznova“ radi u demo režimu.

---

## Faza 5: Priča 3 — Jasni ishodi bez lažnog uspeha (P1)

**Cilj**: svaki ishod i svaka greška imaju svoju poruku i radnju.

**Nezavisna provera**: [quickstart.md](quickstart.md), stanja 7 do 14.

- [X] T226 [US3] Dodati tekstove ishoda u `apps/web/src/components/ResultPanel.tsx`
  - **Datoteke**: `apps/web/src/components/ResultPanel.tsx`, `apps/web/src/styles.css`, `apps/web/test/integration/outcomes.test.tsx`.
  - **Izmena**: umesto jednog pasusa objašnjenja prikazati po statusu: `ok` i `needs_clarification` → `<p className="explanation">{result.explanation}</p>`; `insufficient_evidence` i `no_matching_trial` → `<p className="explanation">{copy.result.noMatchBody}</p><p className="explanation outcome-detail">{copy.result.noMatchDetail}</p>`; `not_in_sources` → `<p className="explanation">{copy.result.notInSourcesBody}</p>`; `rejected` → `<p className="explanation">{copy.result.rejectedBody}</p><p className="explanation">{copy.result.rejectedNext}</p>`. Za `insufficient_evidence` i `rejected` ispod dodati `<p className="explanation system-explanation"><span className="profile-label">{copy.result.systemExplanation}</span> {result.explanation}</p>`. CSS: `.outcome-detail, .system-explanation { color: var(--ink-muted); font-size: 0.85rem; }`; `.system-explanation .profile-label { display: inline; margin: 0; }`.
  - **Test**: testovi „stanje 7“, „stanje 8“, „stanje 9“ sa `noMatchResponse()`, `notInSourcesResponse()`, `rejectedResponse()`: odgovarajući naslov iz `copy.result`; odgovarajući tekst; u DOM-u nema nijednog elementa `article`; za stanje 7 postoji „Šta ako?“; za stanja 8 i 9 ne postoji „Šta ako?“ ni kartica profila; nigde tekst „Kandidat za dalju proveru“.
  - **Gotovo kada**: testovi prolaze.
  - **AC/EV**: AC-05, AC-06; EV-05, EV-09 (mock analozi) | **Zavisi od**: T223

- [X] T227 [US3] Napraviti panel greške u `apps/web/src/components/ErrorPanel.tsx` i povezati „Pokušaj ponovo“
  - **Datoteke**: `apps/web/src/components/ErrorPanel.tsx` (novo), `apps/web/src/App.tsx`, `apps/web/src/styles.css`, `apps/web/test/integration/errors.test.tsx` (novo).
  - **Izmena**: `ErrorPanel({ error, hasPreviousResult, busy, onRetry, onStartOver, panelRef })` vraća `<motion.section className="error-panel" role="alert" tabIndex={-1} ref={panelRef} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={enter}>` sa: `<h2>{copy.errors[error.kind].title}</h2>`; `<p>{copy.errors[error.kind].body}</p>`; za radnju `retry` `<p>{copy.errors.hintRetry}</p>`; za `restart` `<p>{copy.errors.hintRestart}</p>`; ako postoji `error.serverMessage`: `<p className="server-message">{copy.errors.serverMessage} {error.serverMessage}</p>`; ako je `hasPreviousResult`: `<p>{copy.errors.previousKept}</p>`; `<div className="form-actions">` po tabeli „Dugmad u panelu greške po radnji“ iz [plan.md](plan.md), odeljak 5.6 (za `wait_retry` u ovom zadatku dugme „Pokušaj ponovo“ je samo onemogućeno; odbrojavanje dodaje T228). Sva dugmad `disabled={busy}`. U `App.tsx`: ukloniti privremeni `<p className="error-message">`; prikazati `{state.error && <ErrorPanel error={state.error} hasPreviousResult={state.result !== null} busy={isBusy(state)} onRetry={() => state.lastRequest && void send(state.lastRequest)} onStartOver={startOver} panelRef={errorRef} />}` između panela za unos i oblasti rezultata. CSS: `.error-panel { margin: var(--space-4) 0; border-left: 4px solid var(--not-met); border-radius: var(--radius-control); padding: var(--space-4); color: var(--not-met-ink); background: var(--not-met-bg); }`; `.error-panel h2 { margin: 0 0 var(--space-2); font-size: 1.1rem; }`; `.error-panel p { margin: 0 0 var(--space-2); }`; `.error-panel .secondary-button { border-color: var(--not-met-ink); color: var(--not-met-ink); background: var(--surface); }`; ukloniti pravilo `.error-message`.
  - **Test**: `errors.test.tsx`: (stanje 10) `jsonResponse(runErrorResponse("tool_error", true))` → „Provera nije završena“, „Pokušaj ponovo“ i „Počni iznova“; klik na „Pokušaj ponovo“ šalje drugi zahtev sa istim telom kao prvi; nema elementa `article`. (stanje 11) `runErrorResponse("model_timeout", true)` → „Servis nije odgovorio na vreme“. (stanje 13a) `runErrorResponse("question_round_limit", false)` → „Dostignut je najveći broj dopuna“, postoji „Počni iznova“, ne postoji „Pokušaj ponovo“. (stanje 13b) `jsonResponse(httpErrorBody("invalid_profile", false), 400)` → „Unos nije prihvaćen“, u panelu nema dugmadi. (stanje 14a) `fetch` odbijen → „Server nije dostupan“; posle klika na „Pokušaj ponovo“ i ispravnog odgovora vidi se rezultat, a panel greške nestaje. (stanje 14b) `nonJsonResponse(200)` → „Odgovor servera nije čitljiv“ i nigde tekst „Unexpected token“. (stanje 14c) `jsonResponse({ foo: 1 })` → „Odgovor servera nije u očekivanom obliku“. (nepoznata kategorija) `runErrorResponse("nesto_novo", true)` → „Poruka servera: Poruka servera.“.
  - **Gotovo kada**: svi testovi prolaze.
  - **AC/EV**: AC-07, AC-10; EV-12, EV-15, EV-16 (mock analozi) | **Zavisi od**: T225

- [X] T228 [US3] Dodati odbrojavanje za prekoračen broj zahteva: `apps/web/src/hooks/useCountdown.ts` i `ErrorPanel.tsx`
  - **Datoteke**: `apps/web/src/hooks/useCountdown.ts` (novo), `apps/web/src/components/ErrorPanel.tsx`, `apps/web/test/integration/errors.test.tsx`.
  - **Izmena**: `useCountdown(startSeconds: number): number` vraća preostale sekunde; `setInterval` na 1000 ms smanjuje za 1 do 0; čisti se pri uklanjanju i kada dođe do 0; ponovo kreće kada se `startSeconds` promeni. U `ErrorPanel` za radnju `wait_retry`: `const left = useCountdown(error.retryAfterSeconds ?? DEFAULT_RETRY_AFTER_SECONDS)`; prikazati `<p aria-hidden="true">{left > 0 ? copy.errors.waitSeconds(left) : copy.errors.waitDone}</p>` i `<p className="visually-hidden">{copy.errors.waitForScreenReader(error.retryAfterSeconds ?? DEFAULT_RETRY_AFTER_SECONDS)}</p>`; dugme „Pokušaj ponovo“ `disabled={busy || left > 0}`. Kuka se poziva bezuslovno (za ostale radnje sa `0`).
  - **Test**: test „stanje 12“ sa `vi.useFakeTimers({ shouldAdvanceTime: true })`: `jsonResponse(httpErrorBody("rate_limit_exceeded", false), 429, { "retry-after": "3" })` → „Poslato je previše zahteva“, „Možete pokušati ponovo za 3 s.“, dugme onemogućeno; posle `vi.advanceTimersByTime(3000)` vidi se „Možete pokušati ponovo.“ i dugme je omogućeno; bez zaglavlja počinje od 60. Na kraju testa `vi.useRealTimers()`.
  - **Gotovo kada**: test prolazi.
  - **AC/EV**: AC-10; EV-11 (mock analog) | **Zavisi od**: T227

- [X] T229 [US3] Pokriti testom prethodni rezultat posle greške u `apps/web/test/integration/errors.test.tsx`
  - **Datoteke**: `apps/web/test/integration/errors.test.tsx`; `apps/web/src/App.tsx` samo ako test otkrije odstupanje od [data-model.md](data-model.md).
  - **Izmena**: nema nove funkcionalnosti; reduktor iz T210 već čuva ili briše rezultat.
  - **Test**: (a) posle `okResponse()` hipoteza vraća `jsonResponse(httpErrorBody("ambiguous_hypothesis", false), 400)` → „Hipotetička izmena nije primenjena“, „Ispod je poslednji potvrđeni rezultat ove provere.“, naslovi tri studije su i dalje u DOM-u, obrazac „Šta ako?“ je upotrebljiv. (b) posle `clarificationResponse()` odgovor vraća `jsonResponse(httpErrorBody("run_not_found", false), 404)` → „Provera više nije dostupna“, pitanje više nije u DOM-u, postoji „Počni iznova“, ne postoji „Pokušaj ponovo“. (c) posle `okResponse()` hipoteza vraća `jsonResponse(runErrorResponse("model_timeout", true))` → studije nisu u DOM-u. (d) posle `clarificationResponse()` `fetch` za odgovor odbijen → pitanje je i dalje u DOM-u ispod panela greške.
  - **Gotovo kada**: sva četiri testa prolaze.
  - **AC/EV**: AC-03, AC-10 | **Zavisi od**: T227

**Kontrolna tačka**: nijedna greška ne prikazuje studiju kao kandidata ni sirov tehnički tekst.

---

## Faza 6: Priča 4 — Tačne informacije o režimu rada i podacima (P1)

**Cilj**: oznaka režima, upozorenje i podnožje dolaze iz `meta`; ništa nije upisano u kod.

**Nezavisna provera**: [quickstart.md](quickstart.md), odeljak 6.

- [X] T230 [P] [US4] Napraviti zaglavlje i oznaku režima: `apps/web/src/components/SiteHeader.tsx`, `ModeBadge.tsx`
  - **Datoteke**: `apps/web/src/components/SiteHeader.tsx` (novo), `apps/web/src/components/ModeBadge.tsx` (novo), `apps/web/src/App.tsx`, `apps/web/src/styles.css`, `apps/web/test/integration/mode-meta.test.tsx` (novo).
  - **Izmena**: `ModeBadge({ meta })`: `const model = modeBadge(meta)`; `null` → vraća `null`; demo → `<span className="mode-badge mode-demo"><span className="pulse-dot" aria-hidden="true" /><span className="visually-hidden">{copy.mode.srPrefix}</span>{copy.mode.demo}</span>`; stvarni → `<span className="mode-badge mode-live">` sa tačkom, prefiksom, `{copy.mode.live}` i, kada `modelId` nije `null`, `<span className="mono mode-model">{modelId}</span>`. `SiteHeader({ meta })`: postojeća veza marke (tekstovi iz `copy.brand`) i `<ModeBadge meta={meta} />`. U `App.tsx` zameniti inline `<header>` sa `<SiteHeader meta={state.meta} />`. CSS: preimenovati `.demo-badge` u `.mode-badge` (isti izgled, `gap: 0.45rem`, `max-width: 100%`, `flex-wrap: wrap`); `.mode-demo { color: var(--demo-ink); background: var(--demo-bg); }`; `.mode-live { color: var(--live-ink); background: var(--live-bg); }`; `.mode-model { text-transform: none; letter-spacing: 0; }`.
  - **Test**: `mode-meta.test.tsx`: pre odgovora nema teksta „DEMO REŽIM“ ni „STVARNI MODEL“; posle `okResponse()` vidi se „DEMO REŽIM“; posle `okResponse({ meta: metaOf({ demoMode: false, modelId: "model-x" }) })` vidi se „STVARNI MODEL“ i „model-x“, a nema „DEMO REŽIM“; sa praznim `modelId` nema praznog elementa `.mode-model`; posle greške `runErrorResponse("tool_error", true)` sa `meta` stvarnog režima oznaka je „STVARNI MODEL“; posle „Počni iznova“ oznake nema.
  - **Gotovo kada**: test prolazi.
  - **AC/EV**: AC-01, AC-10 | **Zavisi od**: T213, T225

- [X] T231 [US4] Napraviti upozorenje i podnožje iz `meta`: `SafetyNotice.tsx`, `ResultMeta.tsx`; očistiti upisane tvrdnje
  - **Datoteke**: `apps/web/src/components/SafetyNotice.tsx` (novo), `apps/web/src/components/ResultMeta.tsx` (novo), `apps/web/src/components/ResultPanel.tsx`, `apps/web/src/App.tsx`, `apps/web/index.html`, `apps/web/src/styles.css`, `apps/web/test/integration/mode-meta.test.tsx`.
  - **Izmena**: `SafetyNotice({ demoMode })`: `<aside className="safety-notice" aria-label={copy.safety.label}><strong>{copy.safety.strong}</strong> {copy.safety.body}{demoMode && <> {copy.safety.demo}</>}</aside>`. `ResultMeta({ meta })`: `<footer className="result-meta"><span>{copy.meta.dataVersion(meta.dataVersion)}</span>` i zatim `<span>{copy.meta.demo}</span>` kada je `meta.demoMode`, inače `<span>{meta.modelId ? copy.meta.live(meta.modelId) : copy.meta.liveNoId}</span>`. `ResultPanel` prikazuje `<ResultMeta meta={result.meta} />` na kraju; ukloniti inline podnožje iz dece u `App.tsx`. U `App.tsx`: `<SafetyNotice demoMode={state.meta?.demoMode === true} />`; uvod čita `copy.intro`; podnožje stranice je `<footer className="site-footer"><span>{copy.footer.note}</span></footer>` (red sa verzijom i datumom se uklanja). U `apps/web/index.html`: `<title>TrialMatch</title>`. CSS: `.result-meta { gap: var(--space-2) var(--space-4); }`; `.safety-notice { color: var(--notice-ink); }`.
  - **Test**: pre odgovora upozorenje sadrži „ne unosite stvarne podatke pacijenata“ i ne sadrži „demo“; u demo režimu sadrži „U demo režimu i studije su sintetički primeri.“; u stvarnom režimu nigde u dokumentu nema tekstova „DEMO“, „bez poziva stvarnom modelu“, „sintetičke studije“; podnožje rezultata prikazuje `dataVersion` iz odgovora (`metaOf({ dataVersion: "ctgov-t2d-2026-11" })` → „Skup podataka: ctgov-t2d-2026-11“) i „Stvarni model: model-x“; u demo režimu „DEMO režim — bez poziva stvarnom modelu“; nigde tekst „synthetic-trials-v1“ kada ga odgovor ne sadrži; nigde „7. novembar 2026.“; dva uzastopna odgovora sa različitim `meta` → prikaz prati drugi.
  - **Gotovo kada**: test prolazi; pretraga `apps/web/src` i `apps/web/index.html` ne nalazi „synthetic-trials-v1“, „7. novembar“ ni „Ovaj demo“.
  - **AC/EV**: AC-01, AC-05, AC-10 | **Zavisi od**: T230

- [ ] T232 [US4] [BLOCKED: Role B] Prikazati datum snimka u `apps/web/src/components/ResultMeta.tsx`
  - **Čeka**: REQ-B1. Uloga B dodaje datum snimka u `MetaSchema` (predlog: `dataSnapshotDate`, `YYYY-MM-DD` ili `null`). Koristiti naziv koji je Uloga B stvarno uvela.
  - **Datoteke**: `apps/web/src/components/ResultMeta.tsx`, `apps/web/test/integration/mode-meta.test.tsx`, `apps/web/test/helpers/responses.ts`.
  - **Izmena**: iza verzije skupa, kada polje postoji i `formatSnapshotDate` ne vrati `null`: `<span>{copy.meta.snapshot(datum)}</span>`.
  - **Test**: `"2026-11-07"` → „Datum snimka: 7. novembar 2026.“; `null` → reda nema.
  - **Gotovo kada**: test prolazi.
  - **AC/EV**: AC-01 | **Zavisi od**: T231, REQ-B1

---

## Faza 7: Priča 6 — Obrada koja traje i sprečavanje duplog slanja (P2)

**Cilj**: jasan red obrade, poruka posle 5 s, zastareo rezultat označen.

**Nezavisna provera**: [quickstart.md](quickstart.md), stanje 3.

- [X] T233 [US6] Napraviti red obrade: `apps/web/src/components/ProcessingStatus.tsx`, `apps/web/src/hooks/useSlowNotice.ts`
  - **Datoteke**: `apps/web/src/components/ProcessingStatus.tsx` (novo), `apps/web/src/hooks/useSlowNotice.ts` (novo), `apps/web/src/App.tsx`, `apps/web/src/styles.css`, `apps/web/test/integration/processing.test.tsx` (novo).
  - **Izmena**: `useSlowNotice(busy: boolean): boolean`: kada `busy` postane `true`, `setTimeout(SLOW_NOTICE_MS)` postavlja `true`; kada `busy` postane `false`, čisti tajmer i vraća `false`. `ProcessingStatus({ slow })`: `<motion.div className="state-message" role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={enter}><span className="shimmer-text">{copy.processing.line}</span>{slow && <span className="state-detail">{copy.processing.slow}</span>}</motion.div>`. Bez elementa `.pulse-dot`. U `App.tsx` zameniti inline `<motion.p className="state-message">` sa `{isBusy(state) && <ProcessingStatus slow={slow} />}`. CSS: `.state-message { display: grid; gap: var(--space-1); color: var(--live-ink); background: var(--live-bg); }`; `.state-detail { color: var(--ink-muted); font-size: 0.85rem; }`.
  - **Test**: `processing.test.tsx` sa lažnim tajmerima (`shouldAdvanceTime: true`) i `fetch` koji vraća obećanje koje test sam razrešava: odmah posle klika vidi se „Provera je u toku…“ u elementu sa `role="status"`; u tom elementu nema `.pulse-dot`; dugme „Proveri kriterijume“ je onemogućeno i naziv mu je nepromenjen; drugi klik ne povećava broj poziva `fetch`; posle `vi.advanceTimersByTime(5000)` vidi se tekst `copy.processing.slow`; posle razrešenja odgovora red obrade nestaje.
  - **Gotovo kada**: test prolazi.
  - **AC/EV**: AC-10 | **Zavisi od**: T227

- [X] T234 [US6] Označiti zastareo rezultat u `apps/web/src/components/ResultPanel.tsx`
  - **Datoteke**: `apps/web/src/components/ResultPanel.tsx`, `apps/web/src/App.tsx`, `apps/web/src/styles.css`, `apps/web/test/integration/processing.test.tsx`.
  - **Izmena**: `ResultPanel` dobija prop `stale: boolean`. Kada je `stale`: korenski element ima `inert={true}`, `aria-busy="true"` i klasu `is-stale`; na vrhu `<p className="stale-banner">{copy.processing.stale}</p>`; `SavedNotice` i traka hipoteze se ne prikazuju. `App.tsx` prosleđuje `stale={resultIsStale(state)}` i `busy={isBusy(state)}`. CSS: `.results-panel { transition: opacity 0.2s ease; }`; `.results-panel.is-stale { opacity: 0.55; }`; `.stale-banner { margin: 0 0 var(--space-4); border-radius: var(--radius-control); padding: var(--space-2) var(--space-3); color: var(--ink); background: var(--surface-soft); font-weight: 700; }`.
  - **Test**: (a) posle `clarificationResponse()` klik na „Ne“ dok odgovor još nije stigao: panel rezultata ima atribut `inert` i tekst „Prethodni rezultat. Nova provera je u toku.“; dugme „Ne“ ima `aria-pressed="true"` i onemogućeno je. (b) posle `okResponse()` nova provera iz gornjeg obrasca dok odgovor nije stigao: naslov „Preliminarna provera završena“ nije u DOM-u. (c) posle dolaska odgovora panel nema `inert` ni traku.
  - **Gotovo kada**: testovi prolaze.
  - **AC/EV**: AC-03, AC-10 | **Zavisi od**: T233

---

## Faza 8: Priča 5 — Pristupačan i bezbedan prikaz (P2)

**Cilj**: fokus i najave posle svakog koraka, 320 px, smanjen pokret, bezbedan prikaz teksta.

**Nezavisna provera**: [quickstart.md](quickstart.md), odeljci 7 i 8.

- [X] T235 [US5] Premeštati fokus posle svakog koraka u `apps/web/src/App.tsx`
  - **Datoteke**: `apps/web/src/App.tsx`, `apps/web/src/components/ResultPanel.tsx`, `apps/web/test/accessibility.test.tsx`.
  - **Izmena**: u `App.tsx` dodati `headingRef`, `clarificationRef`, `errorRef` (`useRef<HTMLElement>(null)` odgovarajućeg tipa) i jedan `useEffect` sa zavisnošću `[state.focusToken]`: ako je `state.focusToken === 0` ne radi ništa; `phase === "error"` → `errorRef.current?.focus()`; `phase === "result"` i `state.result?.status === "needs_clarification"` → `clarificationRef.current?.focus()`; `phase === "result"` inače → `headingRef.current?.focus()`; `phase === "idle"` → `textareaRef.current?.focus()` (spojiti sa efektom iz T225 u ovaj jedan). `ResultPanel` prima `headingRef` i stavlja ga na `h2#results-heading`. CSS: `[tabindex="-1"]:focus-visible` nasleđuje opšti indikator fokusa (ništa ne dodavati što ga gasi).
  - **Test**: u `accessibility.test.tsx` dodati: posle `okResponse()` `document.activeElement` je naslov rezultata; posle `clarificationResponse()` je naslov „Potrebna dopuna“; posle odbijenog `fetch` je element sa `role="alert"`; oblast `.results-region` ima `aria-live="polite"` i postoji i pre prvog odgovora; red obrade ima `role="status"`; nazivi „Opis profila ili pitanje“, „Proveri kriterijume“, „Pošalji dopunu“, „Ponovi proveru“ i dugme opcije „Ne“ postoje pod tim tačnim imenima.
  - **Gotovo kada**: testovi prolaze.
  - **AC/EV**: AC-12 | **Zavisi od**: T234

- [X] T236 [P] [US5] Dodati test bezbednog prikaza u `apps/web/test/integration/safe-rendering.test.tsx`
  - **Datoteke**: `apps/web/test/integration/safe-rendering.test.tsx` (novo).
  - **Izmena**: samo test; ako padne, ispraviti komponentu koja je uzrok, bez `dangerouslySetInnerHTML`.
  - **Test**: (1) `const payload = '<img src=x onerror="window.__xss=1"><script>window.__xss=1</script><b>x</b>'`; odgovor `ok` u kome su `explanation`, naslov prve studije, tekst i citat prvog kriterijuma jednaki `payload`; posle prikaza: `document.querySelector("script")` unutar `main` je `null`, `document.querySelector("main img")` je `null`, `document.querySelector("main b")` je `null`, `window.__xss` je `undefined`, a tekst `payload` se vidi doslovno (`getAllByText(payload)`). (2) isto za `question.text` i opciju u `clarificationResponse`. (3) isto za `serverMessage` nepoznate kategorije. (4) pročitati sve datoteke `.ts` i `.tsx` u `apps/web/src` (`node:fs`) i proveriti da nijedna ne sadrži `dangerouslySetInnerHTML`, `innerHTML` ni `insertAdjacentHTML`.
  - **Gotovo kada**: sva četiri testa prolaze.
  - **AC/EV**: AC-08, AC-09; EV-10 (mock analog za prikaz) | **Zavisi od**: T227

- [X] T237 [P] [US5] Dodati pravila za uske ekrane i smanjen pokret u `apps/web/src/styles.css`
  - **Datoteke**: `apps/web/src/styles.css`, `apps/web/test/accessibility.test.tsx`.
  - **Izmena**: u `@media (max-width: 560px)` dodati: `.site-header { align-items: flex-start; flex-direction: column; gap: var(--space-2); }`; `.form-actions { flex-direction: column; }`; `.form-actions button, .follow-up button { width: 100%; }`; `.trial-card { border-right: 0; border-bottom: 0; border-left: 0; border-radius: 0; padding: var(--space-4) 0 0; }`; `.profile-card { padding: var(--space-3); }`. Van upita: `.panel, .trial-card, .profile-card, .error-panel { min-width: 0; }`; `.source-text, .explanation, .trial-heading h3, .mode-badge, blockquote { overflow-wrap: anywhere; }`. U `@media (prefers-reduced-motion: reduce)` dodati: `.results-panel { transition: none; }`.
  - **Test**: u `accessibility.test.tsx`: `styles.css` sadrži `@media (max-width: 560px)`, `@media (min-width: 720px)`, `@media (prefers-reduced-motion: reduce)`, `overflow-wrap: anywhere` i `min-width: 320px`; nijedna deklaracija `width` ili `min-width` u pikselima nije veća od 320 (obrazac `(?:min-)?width:\s*(\d+)px`).
  - **Gotovo kada**: test prolazi. Ručnu proveru na 320 px radi čovek u T249.
  - **AC/EV**: AC-12 | **Zavisi od**: T231

- [X] T238 [US5] Dodati test da nijedno stanje ne prikazuje interne nazive u `apps/web/test/accessibility.test.tsx`
  - **Datoteke**: `apps/web/test/accessibility.test.tsx`.
  - **Izmena**: samo test; ako padne, ispraviti komponentu koja prikazuje interni naziv.
  - **Test**: za svaki od odgovora `okResponse()`, `clarificationResponse()`, `noMatchResponse()`, `notInSourcesResponse()`, `rejectedResponse()`, `runErrorResponse("model_timeout", true)`, `runErrorResponse("tool_error", false)` i za odbijen `fetch`, i to dva puta: sa `meta: metaOf()` (demo režim) i sa `meta: metaOf({ demoMode: false, modelId: "model-x" })` (stvarni režim): prikazati aplikaciju, poslati unos i proveriti da `document.querySelector("main")?.textContent` ne sadrži kao celu reč nijedan od: `needs_clarification`, `insufficient_evidence`, `no_matching_trial`, `not_in_sources`, `rejected`, `candidate`, `pending`, `excluded`, `not_met`, `met`, `unknown`, `true`, `false`, `null`, `undefined`, `model_timeout`, `tool_error`. Graditelji iz T203 ne koriste te reči u tekstovima koje sami daju.
  - **Gotovo kada**: test prolazi za svih osam slučajeva u oba režima (odbijen `fetch` nema `meta`, pa se računa jednom); u stvarnom režimu dodatno nema teksta „DEMO“.
  - **AC/EV**: AC-12 | **Zavisi od**: T235

---

## Faza 9: Priča 7 — Usklađeni kriterijumi prihvatanja i mapa pokrivenosti (P2)

**Nezavisna provera**: uporediti `docs/spec.md` sa `specs/001-trialmatch-core/spec.md`; mapa ima 13 redova.

- [X] T239 [P] [US7] Uskladiti tabelu kriterijuma prihvatanja u `docs/spec.md`
  - **Datoteke**: `docs/spec.md`.
  - **Izmena**: u odeljku „Kriterijumi prihvatanja“ zameniti redove tabele redovima iz [plan.md](plan.md), odeljak 10 (13 redova, AC-01 do AC-13). Rečenicu „AC-11 ostaje van osnovnog obima.“ zameniti sa „AC-11 ostaje van osnovnog obima. AC-13 je opcion i definisan u `specs/002-ui-role-a/spec.md`.“ Ništa drugo u dokumentu ne menjati. Zatim `pnpm exec prettier --write docs/spec.md`.
  - **Provera**: `pnpm format:check`.
  - **Gotovo kada**: tabela ima 13 redova sa ID-jevima AC-01 do AC-13 bez preskakanja; `pnpm format:check` prolazi.
  - **AC/EV**: AC-01–AC-13 | **Zavisi od**: T201

- [X] T240 [US7] Napraviti mapu pokrivenosti u `docs/ac-coverage.md`
  - **Datoteke**: `docs/ac-coverage.md` (novo).
  - **Izmena**: naslov „# Mapa pokrivenosti kriterijuma prihvatanja (interfejs)“; uvodna rečenica „Za svaki AC navodi stanje interfejsa koje ga prikazuje i dokaz. Brojevi stanja su iz `specs/002-ui-role-a/data-model.md`. Putanje testova su u `apps/web/test/`.“; zatim tabela iz [plan.md](plan.md), odeljak 11, doslovno. Ispod tabele odeljak „## Šta čeka druge uloge“ sa tabelom iz [plan.md](plan.md), odeljak 13. Zatim `pnpm exec prettier --write docs/ac-coverage.md`.
  - **Provera**: `pnpm format:check`; svaka test-datoteka navedena u mapi postoji (`ls apps/web/test/unit apps/web/test/integration`).
  - **Gotovo kada**: tabela ima 13 redova; svaka navedena datoteka postoji, osim `integration/voice-input.test.tsx`, koja nastaje u T252 i uz koju u mapi stoji „(nastaje u T252)“ dok taj zadatak ne bude gotov.
  - **AC/EV**: AC-01–AC-13 | **Zavisi od**: T238

---

## Faza 10: Priča 10 — Rad iz izgrađene verzije aplikacije (P2)

**Nezavisna provera**: [quickstart.md](quickstart.md), odeljak 3.4.

- [X] T241 [US10] Proveriti izgrađenu verziju interfejsa (bez izmene koda)
  - **Datoteke**: nijedna, osim ako provera otkrije grešku u `apps/web/`.
  - **Izmena**: pokrenuti `pnpm build`. Zatim proveriti: `dist/web/index.html` postoji i sadrži `<title>TrialMatch</title>`; pretraga `dist/web` ne nalazi nizove `API_KEY`, `SECRET`, `sk-`, `synthetic-trials-v1`, `DEMO REŽIM` u `index.html` (tekst „DEMO REŽIM“ u JS datoteci je dozvoljen, jer se prikazuje samo po odgovoru servera).
  - **Provera**: `pnpm build`.
  - **Gotovo kada**: izgradnja prolazi i pretraga ne nalazi tajne. Ručnu proveru u pregledaču (odeljak 3.4) radi čovek u T249.
  - **AC/EV**: AC-10 | **Zavisi od**: T231, T204

- [ ] T242 [US10] [BLOCKED: Role B] Proveriti javnu isporuku
  - **Čeka**: REQ-B8 (kako se `dist/web` služi uz server i dozvola pristupa sa adrese interfejsa) i REQ-B9 (čuvanje provere i ograničenje broja zahteva na platformi Vercel). Bez toga nema adrese na kojoj se može proveriti.
  - **Izmena**: kada Uloga B da adresu: postaviti `VITE_API_BASE_URL` po njihovom uputstvu, proći [quickstart.md](quickstart.md), odeljak 5, na javnoj adresi i zapisati ishod svakog stanja.
  - **Gotovo kada**: svih 16 stanja ima zapisan ishod; odstupanja su prijavljena odgovarajućoj ulozi.
  - **AC/EV**: AC-01, AC-10 | **Zavisi od**: T241, REQ-B8, REQ-B9

---

## Faza 11: Priča 8 — Demonstracioni scenario (P3)

- [X] T243 [P] [US8] Napisati demonstracioni scenario u `docs/demo-script.md`
  - **Datoteke**: `docs/demo-script.md` (novo).
  - **Izmena**: naslov „# Demonstracioni scenario (3 minuta)“; uvodni pasus, tabela koraka i napomena doslovno iz [plan.md](plan.md), odeljak 12; ispod odeljak „## Priprema“ sa tri stavke: „Aplikacija je otvorena i prošla je jedna probna provera.“, „Alati pregledača su otvoreni na kartici Mreža, radi koraka 6.“, „Unosi iz tabele su spremni za kopiranje.“ Zatim `pnpm exec prettier --write docs/demo-script.md`.
  - **Provera**: `pnpm format:check`.
  - **Gotovo kada**: dokument ima šest koraka sa tačnim unosima; zbir vremena je 180 s.
  - **AC/EV**: AC-01, AC-03, AC-05, AC-06, AC-10; EV-01, EV-05, EV-06 | **Zavisi od**: T201

- [ ] T244 [US8] [BLOCKED: Role B] [BLOCKED: Role C] [RUČNO] Probati scenario i tokove EV na živoj aplikaciji
  - **Čeka**: REQ-B5 (server u stvarnom režimu sa tačnim `meta`) i REQ-C1 (stvarni model u glavnom toku).
  - **Izmena**: proći `docs/demo-script.md` sa štopericom; zatim kroz interfejs proći unose slučajeva EV-01, EV-02, EV-05, EV-06, EV-07, EV-08 i EV-09 iz `eval/cases.jsonl` i za svaki zapisati prikazano stanje interfejsa. U `docs/demo-script.md` ispraviti kolonu „Očekivano“ tamo gde se stvarni režim razlikuje.
  - **Gotovo kada**: scenario traje najviše 3 minuta; svih sedam tokova ima zapisan ishod u `docs/ac-coverage.md` (novi odeljak „Tokovi EV kroz interfejs“).
  - **AC/EV**: AC-01, AC-03, AC-05, AC-06, AC-10; EV-01, EV-02, EV-05, EV-06, EV-07, EV-08, EV-09 | **Zavisi od**: T243, REQ-B5, REQ-C1

---

## Faza 12: Dorada

- [X] T245 [P] Ažurirati `docs/ui-motion.md`
  - **Datoteke**: `docs/ui-motion.md`.
  - **Izmena**: tabelu „Gde se koristi“ zameniti tabelom iz [plan.md](plan.md), odeljak 5.7 (kolone „Element“, „Pokret“, „Datoteka“; u koloni „Datoteka“ navesti stvarne putanje posle izmena, na primer `components/ModeBadge.tsx`, `components/ProcessingStatus.tsx`, `components/TrialCard.tsx`). U odeljak „Načela“ dodati stavku: „**Ograničeno kašnjenje.** Kartice studija kasne najviše `8 × 0,04 s`; redovi kriterijuma se ne animiraju pojedinačno, da lista od 50 studija ne kasni.“ Zatim `pnpm exec prettier --write docs/ui-motion.md`.
  - **Provera**: `pnpm format:check`.
  - **Gotovo kada**: svaka datoteka navedena u tabeli postoji.
  - **AC/EV**: AC-12 | **Zavisi od**: T234

- [X] T246 [P] Zabeležiti odluke interfejsa u `docs/decisions.md`
  - **Datoteke**: `docs/decisions.md`.
  - **Izmena**: na kraj dodati odeljak „## Interfejs (funkcionalnost 002)“ sa pet stavki, svaka u jednoj rečenici, prepisanih iz polja „Odluka“ u [research.md](research.md): R-05 (prethodni rezultat), R-07 („Pokušaj ponovo“ ponavlja poslednji zahtev doslovno), R-08 (vreme čekanja iz `Retry-After`, inače 60 s), R-09 (sve studije otvorene, pregled na vrhu), R-13 (`VITE_API_BASE_URL`). Na kraj dodati rečenicu: „Tim je odobrio biblioteku `motion` 14.6.0, prema potvrdi vlasnika Uloge A od 2026-11-10 (REQ-T1; obrazloženje i pregled uticaja u research.md, R-16).“ Postojeći tekst ne menjati.
  - **Gotovo kada**: odeljak postoji; razlika u datoteci sadrži samo dodate redove.
  - **AC/EV**: — | **Zavisi od**: T201

- [X] T247 Ukloniti neiskorišćen kod i stilove u `apps/web/src/`
  - **Datoteke**: `apps/web/src/App.tsx`, `apps/web/src/styles.css`, `apps/web/src/result-view-model.ts`.
  - **Izmena**: ukloniti uvoze i promenljive koje se više ne koriste; ukloniti CSS klase koje se ne pojavljuju ni u jednoj datoteci `.tsx` u `apps/web/src` (proveriti pretragom svaku klasu pre brisanja); `App.tsx` sme da sadrži samo: reduktor, `send`, `startOver`, efekat fokusa i raspored komponenti. Funkcije `statusLabel` i `criterionStatusLabel` ostaju jer ih postojeći test koristi.
  - **Gotovo kada**: `pnpm lint` bez upozorenja; `App.tsx` ima manje od 150 redova.
  - **AC/EV**: — | **Zavisi od**: T238, T241

- [ ] T248 Završna automatska provera (koren repozitorijuma)
  - **Izmena**: nijedna. Pokrenuti `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm format:check` i `git status --short`.
  - **Gotovo kada**: svih pet komandi prolazi; `git status --short` ne prikazuje izmene van `apps/web/` i pet dokumenata iz odeljka „Obim“ (izmene `package.json`, `pnpm-lock.yaml`, `apps/web/src/motion/` i `docs/ui-motion.md` koje su postojale pre T201 se ne računaju). Zapisati tačan broj testova i datoteka.
  - **AC/EV**: AC-01–AC-12 | **Zavisi od**: T239, T240, T243, T245, T246, T247
  - **Ishod (2026-11-14, `fb6aa1f`, Node 24.14.0, pnpm 12.16.1, Windows)**: `typecheck` prolazi; `lint` prolazi bez upozorenja; `test` prolazi (44 datoteke, 160 testova); `build` prolazi; `format:check` pada (81 datoteka). Uzrok: 79 datoteka ima CRLF zbog lokalnog `core.autocrlf=true` (u indeksu su LF), a `prettier --check . --end-of-line auto` prijavljuje samo `.github/workflows/ci.yml` (van oblasti A) i lokalni nepraćeni `.claude/launch.json`. `apps/web/` i dokumenti Uloge A prolaze. `git status --short`: samo nepraćeni `.claude/`. Zadatak ostaje otvoren dok `format:check` ne prođe; `ci.yml` formatira vlasnik CI-ja.

- [X] T249 [RUČNO] Ručna provera u pregledaču, demo režim i izgrađena verzija
  - **Izmena**: nijedna. Vlasnik Uloge A prolazi [quickstart.md](quickstart.md): odeljak 5 (stanja koja se mogu izazvati u demo režimu: 1–9, 12–16), odeljak 6 (kolona demo), odeljak 7 (svih šest provera pristupačnosti) i odeljak 3.4 (ista stanja iz izgrađene verzije).
  - **Gotovo kada**: za svako stanje je zapisano „prolazi“ ili opisano odstupanje; odstupanja u interfejsu postaju novi zadaci, a odstupanja servera zahtevi Ulozi B.
  - **AC/EV**: AC-01, AC-03, AC-05, AC-06, AC-10, AC-12 | **Zavisi od**: T248

---

## Faza 13: Priča 9 — Glasovni unos uz potvrdu transkripta (P3, opciono, poslednje)

**Radi se samo ako su sve prethodne faze gotove.**

- [ ] T250 [US9] Napraviti kuku za prepoznavanje govora u `apps/web/src/hooks/useSpeechRecognition.ts`
  - **Datoteke**: `apps/web/src/hooks/useSpeechRecognition.ts` (novo), `apps/web/test/unit/speech-recognition.test.ts` (novo).
  - **Izmena**: lokalni interfejs `RecognitionLike { lang: string; interimResults: boolean; continuous: boolean; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: ((event: { error: string }) => void) | null; onend: (() => void) | null; start(): void; stop(): void; }`. Funkcija `getRecognitionConstructor(): (new () => RecognitionLike) | null` čita `SpeechRecognition` ili `webkitSpeechRecognition` sa `window` (preko `window as unknown as Record<string, unknown>`, uz proveru `typeof === "function"`). Kuka `useSpeechRecognition(onTranscript: (text: string) => void)` vraća `{ supported: boolean; listening: boolean; status: "idle" | "listening" | "added" | "no_speech" | "denied" | "failed"; start(): void; stop(): void }`. `start`: napravi instancu, `lang = SPEECH_LANGUAGE`, `interimResults = false`, `continuous = false`; `onresult` spaja `transcript` svih rezultata razmakom, zove `onTranscript` i postavlja `added`; `onerror`: `not-allowed` ili `service-not-allowed` → `denied`, `no-speech` → `no_speech`, ostalo → `failed`; `onend` gasi `listening`. Čišćenje pri uklanjanju zove `stop()`.
  - **Test**: sa lažnim konstruktorom postavljenim na `window.SpeechRecognition`: `supported` je `true`; posle `start()` instanca ima `lang === "sr-RS"`; simuliran `onresult` zove `onTranscript("muškarac 62 godine")` i daje status `added`; `onerror({ error: "not-allowed" })` daje `denied`; bez konstruktora `supported` je `false`, a `start()` ne baca.
  - **Gotovo kada**: testovi prolaze; u datoteci nema `any`.
  - **AC/EV**: AC-13 | **Zavisi od**: T248

- [ ] T251 [US9] Napraviti kontrolu glasovnog unosa u `apps/web/src/components/VoiceInput.tsx`
  - **Datoteke**: `apps/web/src/components/VoiceInput.tsx` (novo), `apps/web/src/styles.css`.
  - **Izmena**: `VoiceInput({ onTranscript, disabled })`; ako `supported` nije `true`, vraća `null`. Inače `<div className="voice-input"><button type="button" className="secondary-button" aria-pressed={listening} disabled={disabled} onClick={listening ? stop : start}>{listening ? copy.voice.stop : copy.voice.start}</button><p className="form-hint">{copy.voice.note}</p><p className="form-hint" role="status">{tekst po statusu}</p></div>`, gde je tekst: `listening` → `copy.voice.listening`, `added` → `copy.voice.added`, `no_speech` → `copy.voice.noSpeech`, `denied` → `copy.voice.denied`, `failed` → `copy.voice.failed`, `idle` → prazno. CSS: `.voice-input { display: grid; gap: var(--space-2); justify-items: start; margin-top: var(--space-3); }`.
  - **Gotovo kada**: `pnpm typecheck` prolazi (test dolazi u T252).
  - **AC/EV**: AC-13 | **Zavisi od**: T250

- [ ] T252 [US9] Uključiti glasovni unos u obrazac i pokriti testom
  - **Datoteke**: `apps/web/src/App.tsx`, `apps/web/test/integration/voice-input.test.tsx` (novo), `docs/ac-coverage.md`.
  - **Izmena**: u `App.tsx` proslediti kao dete `ProfileForm`: `<VoiceInput disabled={isBusy(state)} onTranscript={(spoken) => setProfileText((current) => (current.trim().length > 0 ? `${current.trim()} ${spoken}` : spoken))} />`. U `docs/ac-coverage.md` ukloniti napomenu „(nastaje u T252)“ i pokrenuti `pnpm exec prettier --write docs/ac-coverage.md`.
  - **Test**: `voice-input.test.tsx` sa lažnim konstruktorom: (a) klik na „Diktiraj“, simuliran rezultat „muškarac 62 godine“ → polje `Opis profila ili pitanje` ima tu vrednost, vidi se „Tekst je dodat u polje. Proverite ga i ispravite pre slanja.“, `fetch` nije pozvan; (b) postojeći tekst „HbA1c 8,1%“ i novi rezultat daju „HbA1c 8,1% muškarac 62 godine“; (c) polje se posle toga može ručno izmeniti; (d) `onerror` sa `not-allowed` → „Pristup mikrofonu nije dozvoljen. Unos tekstom radi kao i do sada.“; (e) bez konstruktora dugme „Diktiraj“ ne postoji, a unos tekstom i slanje rade.
  - **Provera**: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm format:check`.
  - **Gotovo kada**: svih pet testova prolazi i svih pet komandi prolazi.
  - **AC/EV**: AC-13 | **Zavisi od**: T251

---

## Zavisnosti i redosled

- **Faza 1** nema zavisnosti. **Faza 2** blokira sve priče; unutar nje: T205 → T206, T207; T202 → T208 → T209, T210; T202 → T211 → T212, T213; T209 + T210 → T214.
- **Priča 1** (T215–T219) zavisi od Faze 2. **Priča 2** (T222–T225) zavisi od T219. **Priča 3** (T226–T229) zavisi od T225. **Priča 4** (T230–T231) zavisi od T225. **Priča 6** (T233–T234) zavisi od T227. **Priča 5** (T235–T238) zavisi od T234 i T231. **Priča 7**: T239 nezavisan, T240 posle T238. **Priča 10**: T241 posle T231. **Priča 8**: T243 nezavisan. **Dorada** posle svega. **Priča 9** poslednja.
- Zadaci koji menjaju `apps/web/src/App.tsx` ili `apps/web/src/styles.css` ne rade se paralelno, čak i kada imaju oznaku `[P]` u odnosu na druge datoteke; `[P]` važi samo između zadataka koji ne dele datoteku.

### Blokirani zadaci

| Zadatak | Blokira | Šta se čeka |
|---|---|---|
| T220 | Uloga B | REQ-B7: jedinica i poreklo uočene vrednosti po kriterijumu |
| T221 | Uloga B, Uloga C | REQ-B6: status i faza u rezultatu po studiji; REQ-C2: stvarni snimak sa tim podacima |
| T232 | Uloga B | REQ-B1: datum snimka u `meta` |
| T242 | Uloga B | REQ-B8, REQ-B9: javna isporuka |
| T244 | Uloga B, Uloga C | REQ-B5: stvarni režim na serveru; REQ-C1: stvarni model |

Zahtevi koji ne blokiraju nijedan zadatak, ali menjaju ponašanje kada stignu: REQ-B2, REQ-B3, REQ-B4, REQ-B10, REQ-C3, REQ-C4, REQ-D1–REQ-D4 ([contracts/cross-team-requests.md](contracts/cross-team-requests.md)). REQ-T1 je odobren 2026-11-10; T246 samo prenosi zapis odluke i ne traži novo odobrenje.

### Paralelne mogućnosti

- Faza 1: T202, T203, T204.
- Faza 2: T208, T210, T211 (posle T202); T212 i T213 (posle T211) ne paralelno međusobno, jer dele datoteku.
- Priča 1: T215 i T218 su nezavisni po logici, ali dele `styles.css`, pa se rade redom; T217 ide posle T216.
- Dokumenta: T239, T243, T245, T246 međusobno paralelno.

## Strategija izvođenja

1. **Najmanji upotrebljiv korak**: Faze 1 i 2, zatim Priča 1. Posle toga rezultat `ok` prikazuje dokaze kako dizajn traži.
2. **Zatim** Priče 2, 3 i 4 (sve P1), svaka se može proveriti zasebno.
3. **Zatim** Priče 6, 5, 7, 10 i 8 (P2 i P3), pa dorada.
4. **Glasovni unos** samo na kraju.
5. Blokirani zadaci se rade tek kada odgovarajuća uloga isporuči zahtev; do tada interfejs radi bez njih.

## Pregled

| Faza | Zadaci | Broj | Od toga blokirano |
|---|---|---|---|
| 1 Priprema | T201–T204 | 4 | 0 |
| 2 Osnova | T205–T214 | 10 | 0 |
| 3 Priča 1 | T215–T221 | 7 | 2 |
| 4 Priča 2 | T222–T225 | 4 | 0 |
| 5 Priča 3 | T226–T229 | 4 | 0 |
| 6 Priča 4 | T230–T232 | 3 | 1 |
| 7 Priča 6 | T233–T234 | 2 | 0 |
| 8 Priča 5 | T235–T238 | 4 | 0 |
| 9 Priča 7 | T239–T240 | 2 | 0 |
| 10 Priča 10 | T241–T242 | 2 | 1 |
| 11 Priča 8 | T243–T244 | 2 | 1 |
| 12 Dorada | T245–T249 | 5 | 0 |
| 13 Priča 9 | T250–T252 | 3 | 0 |
| **Ukupno** | T201–T252 | **52** | **5** |
