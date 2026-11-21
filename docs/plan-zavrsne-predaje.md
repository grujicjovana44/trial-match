# Plan završne predaje — odgovor na Capstone feedback od 20. 11. 2026.

Rokovi: **24. 11.** predaja označene verzije, **25. 11.** demo. Stanje: 22. 11. 2026, grana `security-audit-fixes` (ne spaja se u `main` u okviru ovog plana).

Feedback je pregledao `main` na `2ed092f` i `phase-3-eval` na `93a4d5f`. Posle prepisivanja istorije 21. 11. ti commit-ovi su `b64098d` i `cc13c91`. Tabela svih starih i novih SHA nalazi se u [mapi dokaza](evidence-map.md).

## Urađeno

| Napomena iz feedback-a                                 | Šta je urađeno                                                                                                                                                                   | Dokaz                                                            |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| CAP-02/CAP-04: glavni tok kroz web sa stvarnim modelom | Opt-in Playwright prolaz sa stvarnim modelom i komanda `pnpm demo:live`. Prolaz: profil → dopuna težine → rezultat sa citatom i linkom ka registru → „Šta ako?“ u istom `runId`. | `eval/results/ui-live/predaja-ui-3/` (`2a4e71d`, `dirty: false`) |
| CAP-03: odlomak skrivene studije u EV-03               | Zatvoreno u `9e7ea5c`, potvrđeno tragom `predaja-3/traces/EV-03.json`                                                                                                            | [evaluation.md](evaluation.md) → „Završna predaja“               |
| CAP-05/CAP-06: iste granice na verziji za demo         | Live EV run `predaja-3`: 16/16 na `a62df6b`; `eval:offline` 6/6, `gold:metrics`, `smoke` i mock Playwright 3/3 na istom kodu                                                     | [mapa dokaza](evidence-map.md)                                   |
| CAP-07: mapa dokaza i README opisuju raniju fazu       | Nova mapa dokaza za CAP-01–CAP-08 sa režimom i korpusom svakog prolaza; README sa stanjem, komandama i onim što drugi član može da ponovi                                        | [evidence-map.md](evidence-map.md), [README.md](../README.md)    |
| Demo 25. 11.                                           | Scenario: uspešan prolaz sa dopunom, nedovoljno podataka („šećer“), kontrolisana greška (provereno kroz API) i rezervni plan                                                     | [demo-script.md](demo-script.md)                                 |
| Windows checkout                                       | T323 sada prolazi zahvaljujući `.gitattributes` (LF)                                                                                                                             | `pnpm test` bez padova                                           |
| Bezbednosni audit                                      | `SECURITY_AUDIT.md` i `SECURITY_REMEDIATION.md` su u repozitorijumu                                                                                                              | koren repozitorijuma                                             |

Usput nađeno i zabeleženo: EV-10 je u dva runa pao na minutnom limitu provajdera (`http_429`). Aplikacija se pri tom završila kontrolisano. Runner je dobio opcionu pauzu između slučajeva (`--case-delay-ms`). Neuspeli runovi su sačuvani.

## Ostaje (drugi članovi)

| #   | Zadatak                                                                                     | Ko                     | Gotovo kada                                                                                                                |
| --- | ------------------------------------------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | Svi: `git fetch` i `git reset --hard origin/<grana>` (ili nov klon) zbog prepisane istorije | svi                    | lokalne kopije prate novu istoriju                                                                                         |
| 2   | **Tag** verzije za predaju                                                                  | drugi član             | tag je na GitHub-u i upisan na vrhu [mape dokaza](evidence-map.md)                                                         |
| 3   | **Provera iz čistog checkout-a** taga, tačno prema README-ju                                | drugi član (ne Aleksa) | upisani OS, Node, pnpm, komande i stvarni ishodi u CAP-07 mape dokaza                                                      |
| 4   | `docs/team.md`: uloge A–D i pregledači                                                      | tim                    | nema TODO                                                                                                                  |
| 5   | CAP-08 beleška `docs/team/<ime>.md` za svakog člana, sa istim tagom                         | svaki član             | četiri beleške; Igor povezuje svoj rad iz Faze 2 (`f793968`, `1cbd647`, `6a0abbb`, `23d7471`) sa onim što je ušlo u `main` |

## Van opsega

- Spajanje `security-audit-fixes` u `main` (odluka vlasnika grane).
- Nalazi TM-01–TM-05 iz audita, koji se odnose na javnu dostupnost: aplikacija ostaje lokalna.
- Kvalitet parsera (T323 anotacije) i RAG kvalitet (RAG-T401/T402) navode se kao ograničenja.
