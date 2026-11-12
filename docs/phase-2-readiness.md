# Spremnost za Fazu 2 — početno stanje 2026-11-12

Ovo je rezultat planiranja i statičkog pregleda HEAD-a `2c1536c`, ne dokaz implementacije, aktuelnih testova ili stvarnog modela. Istorijski rezultati u `docs/evidence-map.md` važe samo za svoj zabeleženi HEAD/datum. Radna kopija sadrži korisnikovu izmenu `.github/workflows/ci.yml`, direktorijum `plan/` i dostavljeni raw fajl. Njegov sadržaj nije menjan; ime je dopunjeno datumom.

Feature 003: [spec](../specs/003-phase-2-live-integration/spec.md), [plan](../specs/003-phase-2-live-integration/plan.md), [tasks](../specs/003-phase-2-live-integration/tasks.md), [handoff](../specs/003-phase-2-live-integration/handoff.md), [analiza](../specs/003-phase-2-live-integration/analysis.md). Oznake statusa: **potvrđeno pregledom** = lokalni statički dokaz/istorijski navod, ne nužno izvršen sada; **delimično** = komponenta postoji uz poznatu razliku; **nedostaje** = nema dokaza u kodu/dokumentima; **čeka čoveka** = zahteva potvrdu, fajl, odobrenje ili ljudski pregled; **van Faze 2** = izričito odloženo.

## Mapa zahteva i dokaza

| Zahtev / AC / CAP / REQ | Postojeći dokaz | Preostala razlika | Budući zadatak | Oblast | Provera | Status |
|---|---|---|---|---|---|---|
| REQ-B1, AC-01/12, F2-01 | `data/manifest.json`, shared MetaSchema | Meta ne nosi pouzdano snapshot date/origin/synthetic; mock i synthetic su spojeni u UI | T303–T304, T308/T324 | B/A | Schema + API/UI test; fixture live-model pokazuje synthetic | delimično |
| REQ-B2, AC-07/10, F2-02 | `ErrorInfoSchema`, api/app, ui-error | Kategorija je slobodan string, centralni 500 sadrži internal_error, nije svaki envelope runtime validiran | T303/T305 | B | svim kategorijama testirati retryable, tekst, HTTP, očuvanje snapshot-a | delimično |
| REQ-B3, AC-05, F2-03 | EV-05 očekuje prazan `results`; servis vraća evaluated=[] kada su sve isključene | Nema razloga isključenja u no_matching_trial | T307/T324 | B/A | `results=[]`, `excludedTrials` sa not_met dokazom; not_in_sources odvojeno | nedostaje |
| REQ-B4, AC-10, F2-02 | UI parser parsira Retry-After/default 60; API rate limit postoji | Server ne šalje zaglavlje, CORS možda ne izlaže | T306/T324 | B/A | 429 sekunde + client countdown; lokalni cross-origin | delimično |
| REQ-B5, AC-01/10, F2-04 | mock adapter, parseConfig, UI meta | DEMO_MODE prima samo true; service i /health fiksno mock; shared brojač neizolovan pod async konkurencijom | T303–T304, T311–T313 | B/C | config test za live default/missing key i paralelna dva run-a | delimično |
| REQ-B6/B7, AC-01/02/08, F2-01 | Trial ima status/fazu; profile.provenance već čuva initial_input/answer/hypothesis | TrialResult nema status/fazu; observed unit/origin nema; formule se pozivaju direktno | T303/T308/T315/T324 | B/C/A | ugovor i UI; unknown bez fabricated value, provenance sačuvan | delimično |
| REQ-B8, D2/D3, F2-11/14 | VITE_API_BASE_URL, Vite build i server postoje | Nema dokumentovanog/ručno potvrđenog lokalnog servinga izgrađenog UI-ja uz API i bundle tajni provere | T306/T310/T325 | B/A/D | localhost built preview, secret scan; bez public hostinga | delimično |
| REQ-B9, javni B8/D3, F2 granice | memorijsko skladište postojeće | Vercel/persistent store/proxy limits nisu deo Faze 2 | nema 003 izvršnog zadatka | van opsega | jasno dokumentovati odlaganje | van Faze 2 |
| REQ-B10, AC-03/10, F2-05 | `failed` terminalan; 002 isti path/body retry i restart na invalid_transition/run_not_found | Nedostaje pouzdana zaštita od duplog rada pri izgubljenom odgovoru/konkurenciji | T309/T324 | B/A | idempotency/revision lock, unchanged state, monotoni budžet | delimično |
| REQ-C1, CAP-02, AC-01/07, F2-04/07 | Mock je jedini adapter; `generateStructured` i retry helper postoje | Servis je hardcoded mock, stvarna ekstrakcija/objašnjenje nedostaju; OpenAI nije odabran za ovaj test | T312–T314 | C/B | lažni REST transport tests; odobreni Gemini live poziv posebno | nedostaje |
| REQ-C2, AC-01/08, CAP-03, F2-10 | `prepare-trials.ts`, sintetički fixtures i manifest postoje; dostavljen `data/raw/studies_50_recruiting_2026-11-12.json` (50 zapisa, 50 jedinstvenih NCT ID-jeva, svi `RECRUITING`, prisutan `nextPageToken`); datum/vreme 2026-11-12 01:47:55 +01:00 | Importer još proverava normalizovane TrialSchema nizove, ne stvarni raw; endpoint/izvoz, upit/filteri, status drugih stranica i uslovi korišćenja nisu evidentirani | T317–T321 | C/D | sintetički test i lokalna provera dostavljenog fajla; zatim izvorni metapodaci i čovekov review | delimično / čeka čoveka |
| REQ-C3/C4, AC-01/08, F2-09 | Citation/grounding checker, API/UI text | Potrebna veza quote sa konkretnim kriterijumom i stvarnim model call context; semantička podrška je samo ljudski | T314/T316/T324/T332 | C/A/D | tačan source+quote/numeric test; ručni citat review | delimično |
| CAP-04, AC-02/04/09/10, F2-08 | `evaluate_criteria` je jedini registrovan alat; druge funkcije postoje | compute_egfr/bmi/question nisu stvarno registry call; EV-04 trace ne dokazuje alat | T315 | C/B | EV-04 tačno jedan eGFR; EV-08 nula; EV-16 fault handler | delimično |
| CAP-05, EV-01–16, D1, F2-12/13 | 16 EV definitions, offline runner, 8 profilnih gold rows | Nema live eval ni compile:rules; profilni gold nije kriterijumska metrika; baseline path uvek odbijen; nema partial flush ni nezavisnih 30 kriterijumskih oznaka | T322–T323/T326–T331 | D/C | odvojene offline metrics, guard tests, rezervisan prvi baseline, no overwrite/partial capture | delimično |
| C3/corpus review, AC-01/08/09, F2-10 | synthetic manifest; dostavljeni raw fajl ima 50 zapisa i jedinstvene NCT ID-jeve; datum/vreme je evidentirano | Endpoint/upit/filteri, status drugih stranica i uslovi korišćenja nisu zabeleženi; nijedan stvarni review pravila nije evidentiran | T319–T321 | C/D | potvrđen manifest/hash/reviewer/date; odobrena tačna pravila | čeka čoveka |
| CAP-06, AC-07/09/10, F2-14 | `trace/redact.ts`, injection tests, input limits | Trace je ograničenih metapodataka; nema stvarnih provider attempt/tool timing; bundle/config review live nedostaje | T311/T313/T316/T328/T334 | B/C/D | offline fault, secret scans, trace allowlist | delimično |
| CAP-07, D2, F2-11/15 | README, lockfile, smoke/CI configuration | Nema aktuelnog CI dokaza za HEAD, live setup i built UI proveru | T301/T310/T325/T334 | A/B/D | polazne komande/build preview, kasnije drugi član u Fazi 4 | delimično |
| CAP-08, AC-12, D1, F2-15 | docs/team, authorship commits, UI acceptance/accessibility tests | Commit autorstvo nije review; ove sesije AI pomoći nije zasebno potvrdio svaki član; budući reviewer TODO | T325/T332/T335; kasnije Faza 4 | svi | zabeležiti ko je šta uradio, ko pregledao tuđ rad, proverene AI primere | delimično / čeka čoveka |
| AC-11 | project brief, 001/002 docs | Doslednost profila je samo proširenje | bez taska | — | ostaje van osnovnog obima | van Faze 2 |
| AC-12 | `apps/web/test/accessibility.test.tsx` i 002 checklists | Testovi postoje, ali nisu izvršeni sada i review nove UI isporuke tek treba | T325/T332 | A/D | keyboard/screen-reader/browser review | delimično |
| AC-13 | opcioni voice u 002, pending T250–T252 | nije potreban, bez planiranog taska | nema | A | ostaje odloženo | van Faze 2 |
| Javna isporuka/Vercel/REQ-D3 javni deo | 002 cross-team requests | hosting i javni fault endpoint nisu traženi; lokalni bundle i controlled fault test ostaju | T310/T334 | — | samo lokalni secret scan/fault injection | van Faze 2 (javni deo) |

## Status početnih paketa

| Paket | Preduslovi | Spremnost |
|---|---|---|
| B T301–T310 | polazni offline izveštaj; postojeći Node/pnpm alati | **Prvi implementacioni paket**; ne traži ljudski raw/key/model trošak. Sačekati korisnikovu implementacionu sesiju. |
| B/C T311–T316 | B ugovori; provider je izabran, ali nema server key | neutralna granica i offline tests mogu napredovati; live korak blokiran key/odobravanjem. |
| C/D T317–T323 | dostavljeni raw fajl postoji; izvorni metapodaci i odobrene rules/gold oznake nisu | importer može se proveriti lokalno nakon implementacije; provenance, studijski review i gold oznake čekaju čoveka. |
| A T324–T325 | novi server shared ugovor, B8 local build | zavisi od prethodnih ugovora; budući vlasnik nije potvrđen. |
| D T326–T336 | live adapter, stable fixtures/gold, manual review | pripremni evaluator offline može završiti; baseline zavisi od key, cost approval, EV freeze, corpus/gold i UI pregleda. |

## Ljudski ulazi i stop uslovi

- **Provider/model i dokumentacija**: Gemini `gemini-3.5-flash-lite` potvrđen za test; specifikacija pročitana. Nema API ključa ni žive autentikacije.
- **Serverski ključ**: potreban pre pravog poziva; unosi se lokalno van verzionisanih fajlova. Bez njega live konfiguracija greši.
- **Sirovi JSON**: `data/raw/studies_50_recruiting_2026-11-12.json` je dostavljen; korisnik potvrdio datum 2026-11-12, a filesystem creation time je 01:47:55 +01:00. Lokalni pregled našao je 50 jedinstvenih NCT zapisa i `nextPageToken`. Čovek treba da potvrdi izvor, tačan query/filtere, status drugih stranica i uslove korišćenja pre nego što se fajl smatra ponovljivim ili kompletnim snimkom.
- **Uslovi registra**: čovek proverava pre tvrdnje da su potvrđeni.
- **Pravila 15–20 studija**: čovek pregleda originalne odlomke/hash; nepotvrđene su unknown/manual_review.
- **Zlatni skup 30 kriterijuma**: ljudske oznake i reviewer; bez model predikcija se ne tvrdi kvalitet parsiranja.
- **Formule/pragovi**: postojeće potvrde ostaju; svaki novi/izmenjeni je „PROVERITI prema originalnoj publikaciji“.
- **Plaćeni run**: neposredno pre poziva pregledati tačan broj slučajeva, model, pozive, limits, cenovnik/datum ako poznat i approval file. API key nije odobrenje troška.
- **UI pregled**: stvarni reviewer/date/browser/notes tek posle integracije.

## Granice

Van Faze 2: public deploy/Vercel, nalog/uloge, baza, embeddings/vector DB, voice, autonomni agents, AC-11 realizacija, optional AC-13. B8 se odnosi samo na dokumentovano lokalno serviranje; lokalni client bundle secret scan je obavezan. D4 je lokalna fault simulacija i plan ručne provere, bez javnog endpoint-a za greške. Čist checkout drugog člana, tag i proba odbrane su Faza 4.
