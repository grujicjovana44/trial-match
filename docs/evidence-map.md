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
| CAP-05 | Istorijski offline rezultati i profilni gold nisu live baseline ili 30 criteria                                                                   | T322/T323 odvojene kriterijumske metrike/oznake; T326–T331 approvals i prvi nepromenljivi baseline                                   | Evaluator/metric kod je dodat; nema anotacija ni baseline-a                 |
| CAP-06 | Faza 1 threat/validation dokumenti i offline testovi                                                                                              | T311/T313/T316/T328/T334 live attempt redaction, fault/secret check                                                                  | Zaštite su implementirane; test-suite/live rizici nisu provereni            |
| CAP-07 | README/lockfile/CI dokumentovani; 2026-11-07 offline komande su istorijske                                                                        | T301/T310/T325/T334 sadašnji rezultati; clean checkout tek Faza 4                                                                    | Typecheck/lint/build/eval:offline prolaze; test/smoke ostaju otvoreni       |
| CAP-08 | Commit authorship beleži samo ko je napravio commit; nije peer review                                                                             | Potvrđeni istorijski doprinosi u `docs/team.md`; T325/T332 stvarni reviewer; pojedinačni AI primeri moraju se proveriti sa članovima | Delimično / čeka tim                                                        |

Najnoviji offline artifact je `eval/results/offline-2026-11-12T02-16-35.799Z-80b29912/`; nije dokaz stvarnog modela, pravog korpusa ili live EV prolaza. CAP-08 ne može se zameniti modelskim baseline-om: traži suštinski tehnički doprinos člana, pregled rada drugog člana i proverene primere pomoći za svakog člana.

## Implementaciona sesija 2026-11-12

Polazne komande i završni ishodi implementacione sesije, sa putanjama artefakata, zapisani su u [phase-2-readiness.md](phase-2-readiness.md). Typecheck, lint, build, eval:offline, gold:metrics, data importer i UI bundle secret scan su izvršeni; test-suite i smoke nisu pokrenuti. `format:check` prijavljuje samo netaknute raw snapshot i `plan/prompt_plan.md`. Nije bilo Gemini poziva, odobrenog rules paketa, gold kriterijumskih anotacija, baseline-a ni browser smoke zapisa.
