# Mapa dokaza CAP-01–CAP-08 — završna predaja

Stanje: 22. 11. 2026, grana `security-audit-fixes`. Prethodna mapa (Faza 1 i 2) je u [evidence-map-faze-1-2.md](evidence-map-faze-1-2.md) i služi samo kao istorijski zapis.

**Verzija za predaju.** Planirani zajednički tag je **`capstone-v1`**. Još nije napravljen jer beleške ostalih članova i potvrda raspodele uloga nisu u repozitorijumu. Clean-checkout E2E je prošao 3/3 nakon instalacije Linux Chromium browsera; README profil je prošao kroz `pnpm demo` u headless Chromium-u. Provera i Igorova beleška su na `security-audit-fixes`; tag treba da pokazuje na commit koji sadrži sve četiri beleške i rezultate.

**Prepisana istorija.** Istorija na GitHub-u prepisana je 21. 11. 2026. Uklonjen je red o koautorstvu iz poruka commit-ova, dok su kod, autori i datumi ostali isti. Stariji dokumenti i nepromenljivi manifesti zato navode stare SHA. Tabela stari → novi SHA je na kraju ove mape.

## Svi prolazi: režim, korpus i ishod

Režim `live` znači stvarni Gemini model (`gemini-3.5-flash-lite`) kroz serverski adapter. `mock` je lokalni DEMO adapter bez modelskog poziva. `offline` i `fault` su determinističke provere i simulirani kvarovi.

| Prolaz                            | Commit                      | Režim                                            | Korpus                                        | Ishod                                                                   | Dokaz                                                                                             |
| --------------------------------- | --------------------------- | ------------------------------------------------ | --------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Live EV `baseline`                | `e107cae` (stari `57f904b`) | live + offline/fault                             | `fixtures` (T-A, T-B, T-C)                    | 13/16                                                                   | [eval/results/baseline/](../eval/results/baseline/)                                               |
| Live EV `final`                   | `fac7b73` (stari `ed7f762`) | live + offline/fault                             | `fixtures`                                    | 16/16                                                                   | [eval/results/final/](../eval/results/final/)                                                     |
| Live EV `release`                 | `9e7ea5c` (stari `54c00c7`) | live + offline/fault                             | `fixtures`                                    | 16/16; `dirty: true` zbog tada nepraćenih `SECURITY_*.md`               | [eval/results/release/](../eval/results/release/)                                                 |
| Live EV `predaja`                 | `46dd5d5`                   | live + offline/fault                             | `fixtures`                                    | 15/16; EV-10 pao na `http_429` provajdera                               | [eval/results/predaja/](../eval/results/predaja/)                                                 |
| Live EV `predaja-2`               | `2a4e71d`                   | live + offline/fault                             | `fixtures`                                    | 15/16; isti uzrok; `dirty: true` zbog nepraćenih dokaza prethodnog runa | [eval/results/predaja-2/](../eval/results/predaja-2/)                                             |
| **Live EV `predaja-3`**           | **`a62df6b`**               | live + offline/fault, pauza 8 s između slučajeva | `fixtures`                                    | **16/16**, `dirty: false`, nijedan `http_429`                           | [eval/results/predaja-3/](../eval/results/predaja-3/)                                             |
| **Živi UI prolaz `predaja-ui-3`** | **`2a4e71d`**               | live, web + API + model                          | `clinicaltrials-20`, retrieval `hybrid`       | prošao; `dirty: false`                                                  | [eval/results/ui-live/predaja-ui-3/](../eval/results/ui-live/predaja-ui-3/)                       |
| Playwright mock                   | `6a626da` (kod = `a62df6b`) | mock                                             | `clinicaltrials-20`                           | 3/3 (`pnpm test:e2e:phase2`)                                            | lokalno izvršenje 22. 11.                                                                         |
| `pnpm eval:offline`               | `6a626da` (kod = `a62df6b`) | offline/fault                                    | `fixtures`                                    | EV-11–EV-16 6/6                                                         | lokalni direktorijum `eval/results/offline-2026-11-21T23-16-12.816Z-39759af9/` (ne commit-uje se) |
| Nevažeći run                      | —                           | live                                             | greškom `clinicaltrials-20` umesto `fixtures` | 9/16, isključen                                                         | [eval/results/invalid/](../eval/results/invalid/)                                                 |

Kod `baseline` i `final` je jedini par sa ciljanim izmenama aplikacije između runova. Runovi `release`, `predaja` i `predaja-3` proveravaju da kasnije izmene nisu pokvarile isti skup slučajeva. Svaka verzija je pokrenuta po jednom, a model nije deterministički, pa 16/16 nije statistička procena pouzdanosti.

Za EV-10 u `predaja` i `predaja-2`: oba runa su istom brzinom slala zahteve, a EV-10 je poslednji slučaj sa dva uzastopna zahteva. Provajder je vratio `http_429`, a dva dozvoljena ponovna pokušaja (granica iz EV-15) nisu prošla. Aplikacija se završila kontrolisanom greškom `provider_rate_limit`. Runner je zato dobio opciju `--case-delay-ms`, koja menja samo tempo merenja, ne ulaze ni ocenjivanje. `predaja-3` je sa pauzom od 8 s prošao bez ijednog `429`. Neuspeli runovi ostaju sačuvani.

## CAP-01 · Specifikacija i plan

| Dokaz                                                              | Gde                                                                                                                                    |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Korisnik, problem, granice automatizacije, kriterijumi prihvatanja | [project-brief.md](project-brief.md), [spec.md](spec.md), [specs/001-trialmatch-core/spec.md](../specs/001-trialmatch-core/spec.md)    |
| UI tok i AC-01–AC-13                                               | [specs/002-ui-role-a/spec.md](../specs/002-ui-role-a/spec.md), [ac-coverage.md](ac-coverage.md)                                        |
| Faza 2 (stvarni model, korpus) i RAG                               | [specs/003-phase-2-live-integration/](../specs/003-phase-2-live-integration/), [specs/004-rag-retrieval/](../specs/004-rag-retrieval/) |
| Odluke i odstupanja od plana                                       | [decisions.md](decisions.md)                                                                                                           |
| Plan završne predaje                                               | [plan-zavrsne-predaje.md](plan-zavrsne-predaje.md)                                                                                     |

## CAP-02 · Funkcionalna aplikacija

| Šta                                                | Dokaz                                                                                                                                                                                                                                                                                                                                                                                      | Režim                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| Glavni tok kroz web, serverski API i stvarni model | `predaja-ui-3`: [run.json](../eval/results/ui-live/predaja-ui-3/run.json) i pet snimaka ekrana. Sintetički profil bez težine → pitanje „Koja je težina osobe i u kojoj jedinici?“ → odgovor „92 kg“ → 10 studija sa citatima → „Šta ako je HbA1c 10,5%?“. Svi koraci imaju isti `runId`, HTTP 200, `demoMode: false`, a objašnjenje modela je prošlo proveru (`explanationSource: model`). | live, `clinicaltrials-20` |
| Server proverava strukturisani izlaz               | EV-12 (nevalidan izlaz → tačno jedna popravka), `RunResponseSchema` u `packages/shared`                                                                                                                                                                                                                                                                                                    | fault                     |
| Stanje obrade, dopuna i greška u interfejsu        | snimci `02-dopuna.png` i `05-sta-ako.png`; mock Playwright „invalid profile response is shown as an accessible error“                                                                                                                                                                                                                                                                      | live / mock               |
| Ponavljanje                                        | `pnpm build`, pa `TRIALMATCH_LIVE_E2E=confirm pnpm test:e2e:live` (traži `GEMINI_API_KEY` u `.env`; plaćeni pozivi)                                                                                                                                                                                                                                                                        | live                      |

Stvarni model se koristi u živom UI prolazu i u slučajevima EV-01–EV-10. Simulacija se koristi u `pnpm dev`/`pnpm demo`, mock Playwright testovima, `pnpm test` i EV-11–EV-16.

## CAP-03 · Kontekst i izvori

| Šta                                    | Dokaz                                                                                                                                                                                                                  |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Poznat i kontrolisan skup              | [data/manifest.json](../data/manifest.json) (sintetički `fixtures`); [manifest porekla 20 studija](../data/raw/studies_20_api_provenance_2026-11-16.json) sa URL-om, datumom preuzimanja i hash-em po zapisu           |
| Iz rezultata se otvara tačan izvor     | `run.json` → `sampleCitation`: `NCT07919236#inc-3`, status `met`, citat „Body mass index ≥25 kg/m2“, link `https://clinicaltrials.gov/study/NCT07919236`; isto na snimku `04-citat-i-izvor.png`                        |
| Citat mora postojati u aktivnom izvoru | EV-13 (citat van tekućeg izvršavanja se odbija)                                                                                                                                                                        |
| Bez osnova rezultat to kaže            | EV-05 (`no_matching_trial`), EV-09 (`not_in_sources`); 290 kriterijuma bez odobrenog pravila ostaje `unknown`                                                                                                          |
| Napomena iz feedback-a za EV-03        | **Zatvoreno.** Izvori objašnjenja su suženi na prikazane studije (`9e7ea5c`). U `predaja-3/traces/EV-03.json` filter ostavlja T-A i T-B, a grounding koristi samo `T-A#…` i `T-B#…`, bez odlomka skrivene studije T-C. |

## CAP-04 · Workflow i alat

| Šta                                       | Dokaz                                                                                                                                         |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Stanje, dopuna i hipoteza u istom `runId` | `predaja-ui-3/run.json`: koraci `initial` → `answer` → `hypothesis` sa istim `runId` (live). Takođe EV-06 u `predaja-3`.                      |
| Deterministička funkcija u glavnom toku   | `compute_egfr`, `compute_bmi`, `evaluate_criteria`, `select_next_question` (`apps/server/src/tools/`); trag alata u svakom `traces/EV-*.json` |
| Isti ulaz daje isti ishod                 | Matcher i izbor pitanja su deterministički; u živom UI prolazu i u DEMO proveri pre njega isto pitanje o težini dobijeno je za isti profil    |
| Registar ograničava alate                 | EV-14 (nepoznat alat i nevalidni argumenti odbijeni pre izvršavanja), EV-16 (greška alata)                                                    |

## CAP-05 · Evaluacija i poboljšanje

Fiksnih 16 slučajeva je u [eval/cases.jsonl](../eval/cases.jsonl). Hash skupa je `e008103c…` od `final` runa nadalje, a u `baseline` runu je bio `8af2271d…` (ispravka ulaza EV-06).

| Slučaj     | Svrha                                       | Način   | baseline  | final     | release   | predaja-3 |
| ---------- | ------------------------------------------- | ------- | --------- | --------- | --------- | --------- |
| EV-01      | Tipičan profil, izvedene vrednosti i citati | live    | ✓         | ✓         | ✓         | ✓         |
| EV-02      | Parafraza sa jedinicama i decimalama        | live    | ✓         | ✓         | ✓         | ✓         |
| EV-03      | Dodatno ograničenje prikaza („bez BMI“)     | live    | ✗         | ✓         | ✓         | ✓         |
| EV-04      | eGFR za ženu (alat)                         | live    | ✓         | ✓         | ✓         | ✓         |
| EV-05      | Nema odgovarajuće studije                   | live    | ✓         | ✓         | ✓         | ✓         |
| EV-06      | Dopuna pa hipoteza u istom izvršavanju      | live    | ✗         | ✓ *       | ✓         | ✓         |
| EV-07      | Dvosmislen „šećer“: HbA1c ili glukoza       | live    | ✗         | ✓         | ✓         | ✓         |
| EV-08      | Nedostaje kreatinin za eGFR                 | live    | ✓         | ✓         | ✓         | ✓         |
| EV-09      | Činjenica van lokalnog korpusa              | live    | ✓         | ✓         | ✓         | ✓         |
| EV-10      | Zlonamerna instrukcija u tekstu studije     | live    | ✓         | ✓         | ✓         | ✓         |
| EV-11      | Nevalidan zahtev, prekoračen ulaz           | offline | ✓         | ✓         | ✓         | ✓         |
| EV-12      | Nevalidan strukturisani izlaz modela        | fault   | ✓         | ✓         | ✓         | ✓         |
| EV-13      | Citirani izvor nije dozvoljen               | fault   | ✓         | ✓         | ✓         | ✓         |
| EV-14      | Nepoznat alat i nevalidni argumenti         | fault   | ✓         | ✓         | ✓         | ✓         |
| EV-15      | Timeout i HTTP 429 u adapteru               | fault   | ✓         | ✓         | ✓         | ✓         |
| EV-16      | Greška u proračunu eGFR                     | fault   | ✓         | ✓         | ✓         | ✓         |
| **Ukupno** |                                             |         | **13/16** | **16/16** | **16/16** | **16/16** |

\* EV-06 je prošao posle ispravke ulaza slučaja, ne posle izmene aplikacije. Runovi `predaja` i `predaja-2` (EV-10 pao na `429`) objašnjeni su gore.

**Trag ciljane izmene (EV-07).** U [baseline/traces/EV-07.json](../eval/results/baseline/traces/EV-07.json) model upisuje „šećer 8,1“ kao HbA1c i pokreće matcher. Izmena u `fac7b73` dodaje determinističku zaštitu [glucose-guard.ts](../apps/server/src/service/glucose-guard.ts). U [final/traces/EV-07.json](../eval/results/final/traces/EV-07.json) trag prikazuje `guard: hba1c_glucose_ambiguity`, status `needs_clarification` i 0 poziva alata. Problem, hipoteza i odluka opisani su u [evaluation.md](evaluation.md) → „Ciljane izmene“. Poređenje se ponavlja komandom `pnpm eval:compare eval/results/baseline eval/results/final`.

## CAP-06 · Bezbednost i pouzdanost

| Granica                                                                       | Dokaz na kodu `a62df6b`                                                                                                                         |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Ključevi samo na serveru                                                      | [security.md](security.md); ključ se čita iz serverskog okruženja; `run.json` i trace-ovi ne sadrže ključeve (provereno pretragom pre commit-a) |
| Nepouzdan izvor ne menja opseg                                                | EV-10 1/1 u `predaja-3` (live)                                                                                                                  |
| Nevalidan ulaz/izlaz, nedozvoljen izvor ili alat, timeout/limit, greška alata | EV-11–EV-16 6/6 u `predaja-3` i u `pnpm eval:offline`                                                                                           |
| Kontrolisan završetak kod kvara provajdera                                    | `predaja` i `predaja-2`: EV-10 se završio sa `provider_rate_limit`, bez izmišljenog rezultata                                                   |
| Audit i sanacija                                                              | [SECURITY_AUDIT.md](../SECURITY_AUDIT.md), [SECURITY_REMEDIATION.md](../SECURITY_REMEDIATION.md); ispravke TM-06/TM-07 u `957b8f5`              |

Ograničenje: nalazi TM-01–TM-05 iz audita odnose se na javnu dostupnost. Aplikacija radi samo lokalno, na loopback adresi, i nije javno objavljena.

## CAP-07 · Pokretanje i predaja

| Šta                          | Dokaz / stanje                                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| Preduslovi i komande         | [README.md](../README.md), `.nvmrc`, `pnpm-lock.yaml`                                                 |
| Početni podaci               | `data/fixtures/`, paketi u `data/rule_sets/`; sintetički profil u README-ju                           |
| Osnovni test pokretanja      | `pnpm smoke` PASS; `pnpm test` 417/417 (74 fajla) na kodu `a62df6b`, Windows                          |
| Windows checkout             | `.gitattributes` drži LF, pa T323 prolazi i na Windows-u                                              |
| Provera iz čistog checkout-a | **Čist klon na `ba74268`; Linux 7.0.0-43-generic x86_64; Node v24.20.0; pnpm 12.16.1 preko Corepack-a.** Detaljni ishodi svake komande su ispod. |

### Detaljni rezultati reda „Provera iz čistog checkout-a“

| Komanda / okruženje | Stvarni ishod |
| ------------------- | -------------- |
| `git clone --branch security-audit-fixes https://github.com/grujicjovana44/trial-match.git trialmatch-check` | Prvi sandbox pokušaj: **FAIL**, `Could not resolve host: github.com`. Ponovljeno uz mrežni pristup: **PASS**, čist klon na `ba74268`. |
| `uname -srm`; `node -v`; `pnpm -v` | `Linux 7.0.0-43-generic x86_64`; `v24.20.0` (README minimum `24.15.0`); globalni pnpm je `12.18.0`, a pinned Corepack pnpm je `12.16.1` (README verzija). |
| `pnpm install --frozen-lockfile` | Globalnim pnpm `12.18.0`: **FAIL**, `ERR_PNPM_STORE_DIR_OPEN_OPERATION_LOCK` — operacioni lock u `pnpm-store-operation-locks` nije mogao da se otvori jer je putanja read-only. Sa `COREPACK_HOME=/tmp/trialmatch-corepack corepack pnpm@12.16.1 install --frozen-lockfile`: **PASS**, lockfile važeći, 245 paketa instalirano. Sve sledeće pnpm komande koristile su 12.16.1 preko Corepack-a. |
| `pnpm typecheck` | **PASS**, `tsc --noEmit -p tsconfig.json`, exit 0. |
| `pnpm lint` | **PASS**, ESLint, exit 0. |
| `pnpm build` | **PASS**, 554 modula; UI bundle JS 494.06 kB. |
| `pnpm test` | **PASS**, 74 fajla i 417/417 testova, 42.30 s. |
| `pnpm smoke` | **PASS**, 1/1 test. |
| `pnpm eval:offline` | **PASS**, offline/fault 6 passed, 0 failed; real-model 0 executed, 7 skipped; 3 dry-run. |
| `pnpm gold:metrics` | **PASS**, 8 slučajeva; TP 9, FP 0, FN 1, precision 1, recall 0.9. Izlaz upozorava da je to sintetički parser razvojni skup, ne statistička potvrda. |
| `pnpm test:e2e:phase2` | Početni pokušaj sa podrazumevanim Edge kanalom pao je jer Edge nije instaliran na `/opt/microsoft/msedge/msedge`; sandbox je pre toga prijavio i `listen EPERM 127.0.0.1:43173`. Instalirao sam Playwright Chromium `159.0.8154.6` (revision 1255) u `/tmp/trialmatch-browsers` komandom `PLAYWRIGHT_BROWSERS_PATH=/tmp/trialmatch-browsers COREPACK_HOME=/tmp/trialmatch-corepack corepack pnpm@12.16.1 exec playwright install chromium`. Zatim `PLAYWRIGHT_BROWSERS_PATH=/tmp/trialmatch-browsers E2E_BROWSER_CHANNEL=chromium COREPACK_HOME=/tmp/trialmatch-corepack corepack pnpm@12.16.1 test:e2e:phase2`: **PASS, 3/3 testa** za 7.7 s. Prethodni Chromium pokušaj bez instalacije browsera pao je sa nedostajućim `chromium-1255` executable-om. Playwright je prijavio upozorenje da `NO_COLOR` nema dejstvo dok je `FORCE_COLOR` postavljen. |
| `pnpm demo` | **PASS**: API na `127.0.0.1:3000`, Vite na `http://127.0.0.1:5173`, `HEAD /` vratio `200 OK`. Headless Chromium je otvorio tu adresu, poslao tačno README profil (`Muškarac, 62 godine, dijabetes tip 2, HbA1c 8,1%, kreatinin 1,3 mg/dL, visina 178 cm, težina 92 kg.`) i dobio „Provera je završena“; prva kartica `NCT07121504`, kriterijum i `unknown` broj vidljivi, DEMO oznaka vidljiva. |
| `pnpm demo:live`; `pnpm test:e2e:live` | Nisu pokretani, prema instrukciji. Nije korišćen API ključ. |

Šta drugi član može da ponovi **bez ključa**: `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test`, `pnpm smoke`, `pnpm eval:offline`, `pnpm gold:metrics`, `pnpm test:e2e:phase2`, `pnpm demo`. **Sa ključem** (plaćeni pozivi): `pnpm demo:live`, `pnpm test:e2e:live`, live EV run (komanda u [evaluation.md](evaluation.md) → „Ponavljanje“).

## CAP-08 · Individualni doprinos

Igorova beleška je u [team/igor.md](team/igor.md); sadrži Fazu 2, proverenu zastupljenost commit-a u `main`, odluku/proveru, lokalni zapis pregleda i AI primer. [Uloge i predloženi pregledači](team.md) popunjeni su iz repozitorijumskih dokaza, ali čekaju potvrdu članova. Jovana, Jelena i Aleksa treba da dodaju svoje beleške pre zajedničkog taga.

## Stari → novi SHA (prepisana istorija, 21. 11. 2026)

| Stari     | Novi      | Šta je                                          |
| --------- | --------- | ----------------------------------------------- |
| `57f904b` | `e107cae` | commit `baseline` runa                          |
| `ed7f762` | `fac7b73` | ciljane izmene EV-07/EV-03, commit `final` runa |
| `54c00c7` | `9e7ea5c` | commit `release` runa                           |
| `2ed092f` | `b64098d` | `main` pregledan u feedback-u                   |
| `93a4d5f` | `cc13c91` | `phase-3-eval` pregledan u feedback-u           |
| `b13bdc2` | `d87a9b2` | ispravke posle provere uživo                    |
| `8db9fac` | `9b17bd7` | merge Faze 3 u `main`                           |
| `d292ea5` | `c9dc5e1` | zapis `release` runa                            |
| `b3c346d` | `957b8f5` | ispravke iz bezbednosnog audita                 |
| `fb6aa1f` | `ef5bfd7` | UI Uloge A (feature 002)                        |
| `e522120` | `035453c` | prekid diktata (T253)                           |
| `a9b41bb` | `3b8e0a3` | PR #6                                           |
| `2c1536c` | `a6ddc09` | PR #1                                           |
| `3039772` | `0d899f4` | tabela rizika                                   |
| `4c22035` | `3e5c71c` | `review-phase-2`                                |
| `57b1581` | `23d7471` | zapis od 50 studija                             |
