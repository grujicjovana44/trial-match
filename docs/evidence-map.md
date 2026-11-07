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
