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

## Status zadataka za završnu predaju

| #   | Zadatak                                                                                     | Ko                     | Gotovo kada                                                                                                                |
| --- | ------------------------------------------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | `git fetch` i osvežavanje kopije                                                            | Igor                   | izvršeno; ovaj checkout prati `origin/security-audit-fixes` na `ba74268`; ostali članovi treba da osveže svoje kopije      |
| 2   | **Tag `capstone-v1`**                                                                       | tim                    | provere su završene; tag čeka beleške ostalih članova i potvrdu raspodele uloga                                             |
| 3   | **Provera iz čistog checkout-a**, prema README-ju                                           | Igor                   | završen na klonu `ba74268`; offline provere PASS, E2E 3/3 PASS sa Playwright Chromium, README profil PASS kroz `pnpm demo` |
| 4   | `docs/team.md`: uloge A–D i pregledači                                                      | Igor                   | tabela popunjena predlogom iz istorije; direktna potvrda tima još nedostaje                                                |
| 5   | CAP-08 beleška `docs/team/<ime>.md` za svakog člana                                         | svaki član             | Igorova je u `docs/team/igor.md`; Jovana, Jelena i Aleksa treba da dodaju svoje pre taga                                   |

## Van opsega

- Spajanje `security-audit-fixes` u `main` (odluka vlasnika grane).
- Nalazi TM-01–TM-05 iz audita, koji se odnose na javnu dostupnost: aplikacija ostaje lokalna.
- Kvalitet parsera (T323 anotacije) i RAG kvalitet (RAG-T401/T402) navode se kao ograničenja.
