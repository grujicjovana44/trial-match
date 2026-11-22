# Plan završne predaje — odgovor na Capstone feedback od 20. 11. 2026.

Rokovi: **24. 11.** predaja označene verzije, **25. 11.** demo. Stanje provereno 22. 11. 2026: aktivna grana `main`, bazni HEAD `9cf7fc68e1c41b1efbe0f9d3d8e0c80516a6495c`, bez tagova. Lokalna `security-audit-fixes` i lokalni `origin/main`/`origin/security-audit-fixes` pokazuju na isti commit; nije rađen `git fetch` niti pristup remote-u.

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
| Današnje offline provere                               | `pnpm` 12.16.1: typecheck, lint, build, test, smoke, offline EV, gold, data prepare, Chromium E2E, sqlite i fake RAG PASS                                                        | Detalji, korpusi i putanje u [mapi dokaza](evidence-map.md)      |
| Format provera                                         | Održavani kod/dokumenti formatirani; raw/hash-pinned/eval izvori usko izuzeti uz obrazloženje; završni check PASS                                                                | `.prettierignore`, `pnpm format:check`                           |

Usput nađeno i zabeleženo: EV-10 je u dva runa pao na minutnom limitu provajdera (`http_429`). Aplikacija se pri tom završila kontrolisano. Runner je dobio opcionu pauzu između slučajeva (`--case-delay-ms`). Neuspeli runovi su sačuvani.

## Status zadataka za završnu predaju

| #   | Zadatak                                             | Ko         | Gotovo kada                                                                                                                                   |
| --- | --------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Provera grane i lokalnih Git referenci              | Igor       | `main` i lokalne `security-audit-fixes` reference su na `9cf7fc6`; remote nije osvežavan zbog offline ograničenja                             |
| 2   | **Tag `capstone-v1`**                               | tim        | ne praviti dok ne stignu CAP-08 izjave, odobrenja za žive provere i završne provere; raspodela uloga je potvrđena                             |
| 3   | **Provera iz čistog checkout-a**, prema README-ju   | Igor       | lokalni klon na `9cf7fc6` napravljen; offline instalacija blokirana nedostajućim tarball-om `@types/react@19.3.0`; ponovljeno u radnoj kopiji |
| 4   | `docs/team.md`: uloge A–D i pregledači              | tim        | potvrđeno od vlasnika projekta 23. 11. 2026; mapa je u `docs/team.md`                                                                         |
| 5   | CAP-08 beleška `docs/team/<ime>.md` za svakog člana | svaki član | Igorova beleška postoji; Jovana, Jelena i Aleksa imaju prazne šablone koji čekaju njihove izjave                                              |

## Otvoreno za ljudsku proveru

- Jovana, Jelena i Aleksa treba da popune CAP-08 šablone svojim doprinosima, odlukom i proverom, vezom sa glavnim tokom, ograničenjem, primerom pregleda rada drugog člana i AI primerom (ili potvrdom da AI nije korišćen).
- Jovana, Jelena i Aleksa treba sami da dostave CAP-08 izjave; korisnik ne potvrđuje doprinose u njihovo ime.
- Vlasnik projekta treba da odobri konkretne live komande i brojčanu/provider-enforced budžetsku granicu. Gemini `3.5 Flash Lite` free tier i kvote 15 RPM / 250K TPM / 500 RPD su prijavljeni, ali nisu novčani plafon; OpenAI kvota/budžet nije poznata. Nijedna nova live provera nije odobrena niti pokrenuta.
- Uslove korišćenja/licencu podataka treba ljudski proveriti pre javnog objavljivanja. Nije data tvrdnja da je licenca potvrđena.

## Van opsega

- Spajanje `security-audit-fixes` u `main` (odluka vlasnika grane).
- Nalazi TM-01–TM-05 iz audita, koji se odnose na javnu dostupnost: aplikacija ostaje lokalna.
- Kvalitet parsera (T323 anotacije) i RAG kvalitet (RAG-T401/T402) navode se kao ograničenja.
