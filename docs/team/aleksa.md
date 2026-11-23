# CAP-08 — Aleksa Durutović

Predajna verzija označava se tagom `capstone-v1`; tačan commit i dostupnost taga proveravaju se u Git istoriji. Ovde navedeni SHA su posle prepisivanja istorije od 21. 11. 2026.

## Uloga

Vodeći član za oblast A: korisnički tok, UI i kriterijumi prihvatanja AC-01–AC-13, mapa pokrivenosti i demo scenario. Oblast A pregleda Jelena; raspodelu A–D potvrdio je vlasnik projekta 23. 11. 2026. ([team.md](../team.md)). Van oblasti A, u Fazi 3 i završnoj predaji radio sam i na živoj evaluaciji, ciljanim izmenama posle baseline-a i dokazima; evaluacija formalno pripada oblasti D (Jelena).

## Šta sam uradio

| Doprinos                                                                                                                                                           | Izmena                                                                           | Provera                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Korisnički tok i interfejs Uloge A: unos sintetičkog profila, stanje obrade, dopunsko pitanje, rezultat sa statusom kriterijuma i citatima, oznaka režima i greške | `ef5bfd7`, `dc6809e` (spec. [002](../../specs/002-ui-role-a/spec.md), T201–T249) | UI integracioni i jedinični testovi u `apps/web/test/`; [ac-coverage.md](../ac-coverage.md)                                             |
| Glasovni unos uz potvrdu transkripta (AC-13)                                                                                                                       | `3a04fe3`, `035453c` (T250–T253)                                                 | testovi prepoznavanja govora i prekida diktata; ručna provera diktiranja u `0d899f4`                                                    |
| Live evaluacija: runner koji zaključava fixture korpus, potpuniji trag i `summary.json`                                                                            | `e107cae`                                                                        | posle nevažećeg runa (9/16, pogrešan korpus) runner prekida run ako se pojavi studija van fixture skupa                                 |
| Ciljane izmene posle baseline-a: EV-07 (šećer/HbA1c), EV-03 (filter „bez BMI“) i ispravka ulaza EV-06                                                              | `fac7b73`                                                                        | `baseline` 13/16 → `final` 16/16 nad istim modelom i slučajevima                                                                        |
| Provera uživo kroz interfejs nad 20 stvarnih studija: šest nalaza koje EV slučajevi nisu hvatali                                                                   | `d87a9b2`, `9e7ea5c`                                                             | novi testovi u `apps/server/test/integration/guards.test.ts`, `grounding/*.test.ts`, `apps/web/test/integration/*`; run `release` 16/16 |
| Bezbednosni audit i ispravke u okviru plana (TM-06, TM-07)                                                                                                         | `957b8f5`, `8d430f0`                                                             | testovi u `store/*.test.ts` i `guards.test.ts`                                                                                          |
| Završna predaja: ponovljiv živi UI prolaz, `pnpm demo:live`, LF krajevi redova (T323), mapa dokaza, README i demo                                                  | `46dd5d5`–`ba74268`                                                              | `ui-live/predaja-ui-3` prošao; live run `predaja-3` 16/16 na `a62df6b`; `pnpm test` 417/417 na `ba74268`                                |

## Jedna odluka i njena provera: EV-07

**Problem.** Za unos „šećer 8,1“ model je vrednost tiho upisao kao HbA1c, pa je matcher presudio na osnovu podatka koji korisnik nije dao. Šećer u krvi i HbA1c su različite mere, pa je ovo bezbednosni propust.

**Odluka.** Odluku da li je vrednost dvosmislena donosi deterministički kod, a ne bolji prompt. Model nije deterministički: isti prompt može sutra da prođe, a prekosutra da padne. Pravilo projekta je da odluku donosi kod. Zaštita u [glucose-guard.ts](../../apps/server/src/service/glucose-guard.ts) odbacuje izvučeni `hba1c` kada unos pominje šećer ili glukozu, a ne pominje HbA1c, i traži dopunu.
**Provera.**

- U tragu [baseline/traces/EV-07.json](../../eval/results/baseline/traces/EV-07.json) model upisuje `hba1c` i pokreću se alati. U tragu [final/traces/EV-07.json](../../eval/results/final/traces/EV-07.json) postoji događaj `guard: hba1c_glucose_ambiguity`, status je `needs_clarification` i alati se ne pozivaju.
- Jedinični testovi su u [glucose-guard.test.ts](../../apps/server/src/service/glucose-guard.test.ts): latinica i ćirilica, padeži, a „šećerna bolest“ se ne računa.
- Provera uživo je otkrila da odgovor „HbA1c 8,1%“ na to pitanje nije prihvaćen, pa je provera ostajala na istom pitanju. Ispravljeno je u `d87a9b2` i pokriveno testom `answer-label.test.ts`.
- EV-07 prolazi u svim kasnijim runovima (`final`, `release`, `predaja`, `predaja-2`, `predaja-3`).

**Ograničenje.** Zaštita prepoznaje reči, a ne značenje. Unos koji opisuje glukozu bez reči „šećer“ ili „glukoza“ ne bi bio uhvaćen.

## Kako se moj deo uklapa u glavni tok

Interfejs je početak i kraj glavnog toka. Korisnik unosi profil, a interfejs prikazuje stanje obrade i dopunsko pitanje koje je izabrao server. Odgovor se šalje u istom `runId`, pa se rezultat prikazuje sa statusom svakog kriterijuma, citatom i linkom ka registru. Interfejs ne donosi odluke: prikazuje ono što su vratili deterministički matcher i provera citata. Evaluacioni deo proverava taj isti tok: EV slučajevi preko API-ja, a živi UI prolaz preko pregledača sa stvarnim modelom ([predaja-ui-3](../../eval/results/ui-live/predaja-ui-3/)).

## Pregled tuđeg rada

Zapis pregleda od 23. 11. 2026: pregledao sam Igorovu proveru iz čistog checkout-a (`da12ae9`, `9cf7fc6`; CAP-07 u [mapi dokaza](../evidence-map.md), [igor.md](igor.md)).

- **Okruženje i ishodi:** upisani su OS (Linux 7.0.0-43, x86_64), Node v24.20.0 (README traži ≥ 24.15.0), pnpm 12.16.1 preko Corepack-a i ishod svake komande, uključujući neuspešne pokušaje i način na koji su zaobiđeni. Bez nalaza.
- **Broj testova:** 74 fajla i 417/417 na `ba74268`, isto kao moj rezultat na Windows-u. Bez nalaza.
- **Odstupanja od README-ja:** zabeležena su u mapi dokaza, ali README ne navodi da za Chromium E2E prvo treba instalirati browser (`playwright install chromium`); podrazumevani kanal je Microsoft Edge. Pad `pnpm install` sa globalnim pnpm 12.18.0 bio je posledica okruženja (store samo za čitanje), ne README-ja.
- **Van ove tri tačke:** provera je rađena na `ba74268`, a `main` je posle toga dobio izmene koda (`9864351`, `74a9b2d`). Na `74a9b2d` sam pokrenuo `pnpm test` (Windows): 74 fajla, 419/419 prolazi, dok README navodi 417. U `igor.md` odeljak o pregledu kaže da E2E nije potvrđen zbog browser-a, a odeljak o AI-ju da je kasnije prošao 3/3.

**Zaključak:** zapis je potpun i proverljiv, ali proveru iz čistog checkout-a treba ponoviti na commit-u koji dobija tag `capstone-v1`. Ovo je lokalni zapis pregleda; nalaze sam Igoru preneo porukom.

## Upotreba AI-ja

Za implementaciju i provere koristio sam AI agenta (Claude Code). Primer je živi UI prolaz (T254).

**Šta sam tražio.** Od agenta sam tražio opt-in Playwright scenario koji kroz interfejs, sa stvarnim modelom, prolazi ceo tok: profil, dopunsko pitanje, odgovor, rezultat sa citatom i „Šta ako?“ u istom `runId`.

**Šta nisam prihvatio i šta sam izmenio.** Prvi scenario je očekivao dopunsko pitanje za profil sa svim poljima. Nad 20 studija sistem je ispravno odmah dao rezultat, pa je pogrešna bila pretpostavka testa, a ne aplikacija. Nisam prihvatio da se uslov testa oslabi, jer bi test tada izgubio smisao; umesto toga promenio sam ulaz: profil bez težine.

**Kako sam proverio.** Pre plaćenog poziva u DEMO režimu sam proverio da deterministički izbor pitanja za taj profil traži težinu. Tek tada je pokrenut živi prolaz: [predaja-ui-3](../../eval/results/ui-live/predaja-ui-3/), tri koraka sa istim `runId`, HTTP 200, `demoMode: false`. Zapis je u `specs/002-ui-role-a/tasks.md` → T254.

## Šta je još ograničeno

- Svaki live run je pokrenut jednom; 16/16 nije statistička procena pouzdanosti.
- U aktivnom paketu od 18 studija (`rules-524f33766f98`) 273 od 300 kriterijuma nemaju odobreno automatsko pravilo i prikazuju se kao „čeka proveru lekara“; 27 je `auto`.
- Glasovni unos zavisi od pregledača (Web Speech API) i obrađuje se na serveru pregledača.
- Aplikacija je lokalna; nalazi TM-01–TM-05 iz audita važe pre javne dostupnosti.
