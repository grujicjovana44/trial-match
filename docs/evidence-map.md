# Mapa dokaza

Rezultati se popunjavaju samo nakon stvarnog pokretanja komandi. Mock tok nije dokaz real-model integracije.

| CAP    | Dokaz u repozitorijumu                                                     | Provera Faze 1                              | Status / ograničenje                              |
| ------ | -------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------- |
| CAP-01 | `specs/001-trialmatch-core/spec.md`, `plan.md`, `tasks.md`, `docs/spec.md` | pregled stabilnih AC i SpecKit artefakata   | Specifikacija je dostupna                         |
| CAP-02 | `apps/web`, `apps/server`, `packages/shared`                               | `pnpm test`, `pnpm typecheck`, `pnpm build` | Stvarni modelski poziv namerno nije implementiran |
| CAP-03 | `data/manifest.json`, `data/fixtures/trials.json`, provera citata          | testovi citata i API-ja                     | Skup je sintetički; pravog snimka nema            |
| CAP-04 | `apps/server/src/workflow`, `apps/server/src/tools`                        | unit/integracioni testovi                   | DEMO putanja                                      |
| CAP-05 | `eval/cases.jsonl`, `eval/runner`, zlatni skup                             | `pnpm eval:offline`, `pnpm gold:metrics`    | EV-01–EV-10 nisu izvršeni real-model slučajevi    |
| CAP-06 | `apps/web/test`, API testovi, `docs/security.md`                           | `pnpm test`, `pnpm lint`                    | Bezbednosni testovi su ograničeni na Fazu 1       |
| CAP-07 | `.github/workflows/ci.yml`                                                 | CI izvršenje                                | Ne tvrditi uspeh dok CI ne pokrene tim            |
| CAP-08 | `docs/evaluation.md`, redigovani offline trace-i                           | ponovljiva offline evaluacija               | Živi baseline nije kreiran                        |

## Zabeleženi rezultati

Provera Faze 1: 7. novembar 2026. Git HEAD koji je evaluator zabeležio:
`dcdbc20aeed8677af11a8e325e5653c6f0e3cc17`. Ovaj HEAD ne uključuje
nekomitovane izmene iz ove implementacije.

- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` i
  `pnpm format:check`: uspešno; 32 test fajla i 61 test su prošli.
- `pnpm smoke`: uspešno; API smoke test je prošao.
- `pnpm eval:offline`: 6 offline/fault slučajeva prošlo, 0 palo; 7 real-model
  slučajeva preskočeno i 3 dry-run. Rezultat je u
  `eval/results/offline-2026-11-07T23-24-28.508Z-87405d49/`. Traces su
  provereni i upisani samo sa dozvoljenim metapodacima.
- `pnpm gold:metrics`: 8 sintetičkih primera, preciznost 1, odziv 0,8; 8
  tačnih pozitivnih, 0 lažno pozitivnih i 2 propuštena polja. Ovo nije
  statistička potvrda.
- `pnpm data:prepare` bez argumenata nije mogao da radi jer nije dostavljen
  `data/raw/trials.json`. `node dist/scripts/prepare-trials.js
data/fixtures/trials.json /tmp/trialmatch-trials-prepared.json` uspešno je
  validirao i pripremio 3 sintetička zapisa.
- `pnpm dev` i HTTP provere su potvrdile odgovor 200 za `/health`, početnu
  stranicu i sintetički `POST /api/runs`; aplikacija je vratila `needs_clarification`.
- GitHub Actions nije pokrenut u ovom okruženju. Živi model, živi baseline,
  pravi snimak studija i EV-01–EV-10 nisu provereni.

## Faza 2: plan u funkcionalnosti 003

[Stanje implementacije i provere](phase-2-readiness.md), [feature 003](../specs/003-phase-2-live-integration/spec.md) i kod u radnoj kopiji dokumentuju implementaciju. Prisustvo koda i statički/offline rezultati ne dokazuju prolaz neizvršenih testova, ljudski review, live model ili završenu Fazu 2.

| CAP    | Postojeća / istorijska evidence granica                                                                                                           | Planirani dokaz 003                                                                                                                  | Stanje 2026-11-12                                                           |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| CAP-01 | Spec 001/002 i raniji planski dokumenti; njihovi checkboxi nisu izvršni dokaz                                                                     | `specs/003-.../spec.md`, `plan.md`, `tasks.md`, `analysis.md`                                                                        | Spec i implementacija 003 su u radnoj kopiji; typecheck/lint/build prolaze  |
| CAP-02 | Mock aplikacija; nema stvarnog poziva u ranijem baseline-u                                                                                        | T312–T314 ugovor, testovi i T331 odobren živi trag                                                                                   | Gemini adapter je dodat; stvarni poziv nije izvršen                         |
| CAP-03 | Manifest fixture-a je sintetički; korisnik je dostavio `data/raw/studies_50_recruiting_2026-11-12.json` sa 50 zapisa i jedinstvenim NCT ID-jevima | T317 importer, T319 izvor/upit/paginacija/uslovi korišćenja, T320 review, T321 manifest                                              | 50/50 redova lokalno validirano; provenance/licenca i pravila čekaju čoveka |
| CAP-04 | Raniji registar izlaže samo evaluate_criteria; test fajl nije sam po sebi aktuelni dokaz                                                          | T315 četiri registrovana/izvršena alata i EV-04/08/16 provera                                                                        | Četiri alata su povezana; offline eval prolazi, test-suite nije pokrenut    |
| CAP-05 | Kriterijumi su strukturisani ručnim pregledom; sistem nema eligibility-text parser. Matcher rezultati nad sintetičkim profilima ne dokazuju parser kvalitet. | T322 metrika/testovi; T323 nezavisne anotacije i predikcije, odloženo van demo faze; T326–T331 approvals i prvi nepromenljivi baseline | 10 automatskih pravila odobreno; 290 ostaje `manual_review`; matcher testiran sintetičkim profilima. Nema parser precision/recall ni live baseline-a. T323 odložen, nije završen. |
| CAP-06 | Faza 1 threat/validation dokumenti i offline testovi                                                                                              | T311/T313/T316/T328/T334 live attempt redaction, fault/secret check                                                                  | Zaštite su implementirane; test-suite/live rizici nisu provereni            |
| CAP-07 | README/lockfile/CI dokumentovani; 2026-11-07 offline komande su istorijske                                                                        | T301/T310/T325/T334 sadašnji rezultati; clean checkout tek Faza 4                                                                    | Typecheck/lint/build/eval:offline prolaze; test/smoke ostaju otvoreni       |
| CAP-08 | Commit authorship beleži samo ko je napravio commit; nije peer review                                                                             | Potvrđeni istorijski doprinosi u `docs/team.md`; T325/T332 stvarni reviewer; pojedinačni AI primeri moraju se proveriti sa članovima | Delimično / čeka tim                                                        |

Najnoviji offline artifact je `eval/results/offline-2026-11-12T02-16-35.799Z-80b29912/`; nije dokaz stvarnog modela, pravog korpusa ili live EV prolaza. CAP-08 ne može se zameniti modelskim baseline-om: traži suštinski tehnički doprinos člana, pregled rada drugog člana i proverene primere pomoći za svakog člana.

## Provera Faze 2 — 2026-11-17

| Oblast                  | Lokalni dokaz                                                                                       | Ishod / ograničenje                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RAG evaluator           | `eval/runner/rag-retrieval.ts`, `eval/runner/rag-offline.ts`, immutable `eval/rag/baseline-v2.json` and new offline summary | Evaluators use explicit retrieval passage IDs. Lexicon-v3 separate fake/hash run `offline-fake-2026-11-17T22-42-56.104Z`: two ranking cases; passage nDCG@5 RAG-001 .613147 all variants; RAG-002 .501266 lexical/hybrid, .693426 rerank (+.192161); study nDCG@2=1 all. Not comparable to baseline-v2, not semantic evidence; RAG-T401/T402 stay open. |
| Real-20 RAG/API         | `DATASET_PROFILE=clinicaltrials-20`, corpus loader, `run-flow.test.ts`, `corpus.test.ts`            | Targeted provere: 20 jedinstvenih NCT zapisa, 300 dodatnih pending passages + 30 ranijih passages, sve 20 dostupne preko lexical retrieval test-upita; API vraća novu studiju sa citation i kriterijumima `unknown`. Playwright real-20 UI tok 2/2 PASS; runner exit code 0 i API/UI listeneri ugašeni. Fixture default nepromenjen. |
| RAG review queue        | `eval/rag/retrieval-proposals-v1.json`, `eval/rag/JELENA_REVIEW.md`                                  | Četiri proposed-only slučaja; P003 važi samo za petostudijski pinned snapshot, ne real-20. Čekaju Jelenu; evaluator ne koristi predloge kao gold.                                                                                                                                                                   |
| Reranker                | `apps/server/src/retrieval/cohere-reranker.ts`, `apps/server/src/retrieval/cohere-reranker.test.ts`, `eval/rag/relevance-judgments-template.json` | Opcioni API adapter iza `CandidateReranker`: model `rerank-v5.0-fast`, `top_n` jednak broju kandidata (najviše 20), timeout iz `RAG_RERANK_TIMEOUT_MS` (podrazumevano 2000 ms), query do 4000 znakova i dokument do 800 znakova. Nedostupan ključ, timeout ili greška vodi u postojeći RRF redosled. Offline mock test proverava mapiranje indeksa i relevance score-a na ID-jeve. Ovo je implementaciona provera, ne dokaz kvaliteta; nisu izračunate metrike i relevance oznake nisu popunjene. |
| Integracija/regresije   | Vitest suite, retrieval tests, API smoke, `apps/web/e2e/phase-2-user-flow.spec.ts`                  | Završno: Vitest 59 files/272 PASS; retrieval 8/42 PASS; smoke 1/1; Playwright 2/2, exit 0, no test-port listeners. `git diff --check` PASS.                                                                                                                                                                                                        |
| Statika/build           | typecheck, lint, format check, build                                                               | Typecheck/lint/build PASS; bundle warning 500.23 kB. Global Prettier check FAILED: 210 repo files flagged, mostly unrelated existing files; no mass format applied.                                                                                                                                                                                                         |
| Offline evaluacija      | `pnpm eval:offline`, `pnpm gold:metrics`, `pnpm sqlite:smoke`                                       | Offline suite PASS (6, bez live); gold su sintetički (8 slučajeva, recall 0.9); SQLite KNN PASS.                                                                                                                                                                                                                                                                               |
| Ljudska provera studija | `data/rule_sets/studies_2_approved_20261115_1539/review-report.json`; korisnička potvrda 2026-11-17 | Jelena je ručno uporedila stvarne studije/kriterijume sa originalima. Hash-pinned approval postoji za dve studije. Za 18 novih studija provera izvornog sadržaja prihvaćena je kao potvrđena, ali per-record provenance ne dokazuje kohortnu potpunost/uslove korišćenja; 300 kriterijuma ostaje `manual_review` za matcher bez formalnog rule approval-a.                     |

Za ClinicalTrials.gov, refer to [official terms and conditions](https://clinicaltrials.gov/terms-conditions): access is no-charge, but attribution, currentness, processing-date disclosure and modification description apply; third-party rights may still exist. This is not a blanket rights clearance. The provenance log has per-record endpoints, fetch dates and hashes; exact cohort query/pagination coverage and any rights review remain open. Original-content confirmation by Jelena is not approval of extracted matcher rules. Per-criterion approval steps are in `eval/rag/proposal-review-guide.md`.

Detalji i preostali uslovi: [phase-2-readiness.md](phase-2-readiness.md). Nisu čitani `.env` fajlovi, niti su pokrenute live evaluacije, Faza 3/4, merge ili push. Radno stablo ostaje nekomitovano za pregled.

## Implementaciona sesija 2026-11-12

Polazne komande i završni ishodi implementacione sesije, sa putanjama artefakata, zapisani su u [phase-2-readiness.md](phase-2-readiness.md). Typecheck, lint, build, eval:offline, gold:metrics, data importer i UI bundle secret scan su izvršeni; test-suite i smoke nisu pokrenuti. `format:check` prijavljuje samo netaknute raw snapshot i `plan/prompt_plan.md`. Nije bilo Gemini poziva, odobrenog rules paketa, gold kriterijumskih anotacija, baseline-a ni browser smoke zapisa.
