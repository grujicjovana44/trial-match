# Analiza konzistentnosti SpecKit artefakata

**Datum pregleda**: 2026-11-12
**Opseg**: [spec.md](spec.md), [plan.md](plan.md), [tasks.md](tasks.md), konstitucija i cross-team ugovori 001/002. Analiza je statička; nema aplikacionih testova ni live run-a. Trenutni radni HEAD je `2c1536c`, a korisnikova izmena CI-ja i nepraćeni `plan/` netaknuti su.

## Nalazi

| ID | Kategorija | Ozbiljnost | Lokacija | Nalaz | Obrada |
|---|---|---|---|---|---|
| I1 | Zahtev/ugovor | Visoka | spec US1/F2-03; 001 API; B3; EV-05 | Existing `insufficient_evidence.results=[]` je u sukobu sa zahtevom prikaza isključenja. | Razrešeno bez promene `results`: zaseban `excludedTrials`; `not_in_sources` ostaje prazan. T307/T324 proveravaju. |
| I2 | Retry/stanje | Visoka | 001 workflow; 002 API/UI; REQ-B10; spec F2-05 | `failed` je terminalan, a UI ponavlja isti path/body; duplikat može potrošiti budžet. | Q3 potvrđuje 002. Ugovor idempotency/revizije dodaje zaštitu transporta bez novog workflow statusa ili resetovanja; T309 testira. |
| I3 | Evaluacioni oracle | Visoka | EV-02/EV-04/EV-03/EV-06/EV-10 | Deo slučajeva ima opisne “profil iz EV-01” ulaze, nedorečen pol u EV-02, i EV-04 `tool_calls` nije jasno samo eGFR. | T327 zahteva konkretan sled bez nagađanja pre zamrzavanja; ako očekivanje mora promeniti značenje, blokirati i tražiti korisnika. AC/EV ID-jevi ostaju. |
| I4 | Metrics scope | Visoka | Q4; F2-SC3/F2-13; gold contract | Bez modelskog generation-a compile pravila, ne postoji live model parser predikcija kriterijuma. | Plan meri samo lokalne/import predikcije naspram 30 ljudskih oznaka i izričito zabranjuje da se to nazove model parsiranja. Promena te odluke zahtevala bi novu potvrdu. |
| I5 | Ownership | Srednja | `docs/team.md`, handoff Q1 | Potvrđena istorija ne imenuje buduće leads/reviewere za B/C/D/A. | Tačno navedena istorija, TODO buduće raspodele; taskovi ne tvrde peer review unapred. |
| I6 | Dokumentacija naspram implementacije | Srednja | `compile:rules`, `eval:live`, Gemini | Nove komande nisu u package.json, live adapter nije implementiran; raw datum/vreme je zabeleženo, ali endpoint/upit/paginacija/uslovi korišćenja nisu. | Ugovori/quickstart/tasks ih dosledno označavaju planiranim; T317/T318/T326 prvo stvaraju importer i offline guard-ove, T319 dopunjuje preostale metapodatke uz čovekovu potvrdu. |
| I7 | Zaštita korpusa | Srednja | `TrialSchema`, manifest, T317/T319/T320 | Lokalna statička provera našla je 50 raw zapisa, 50 jedinstvenih NCT ID-jeva, `nextPageToken`, status RECRUITING i odsutne/NA/višestruke faze; importer runtime kompatibilnost i izvorni metapodaci nisu provereni. | Normalizovani phases array, API string/null; T317 validira raw lokalno, T319 beleži provenance, T320 traži čovekov review pre uključivanja. |
| I8 | Semantičko uzemljenje | Srednja | citations, explanations, C3 | Tačan podniz dokazuje poreklo, ne da citat podržava tvrdnju. | Automatska tačnost porekla + numerička provera; odvojeni ljudski review T332, bez jače tvrdnje. |
| I9 | Baseline zaštita | Srednja | results.ts, T328/T331 | Postojeći writer odbija i prvo baseline kreiranje; ne čuva delimične run-ove. | Isključiva rezervacija pre transporta, inkrementalni trace i interrupted status; existing baseline stop condition. |
| I10 | Prisustvo koda / izvršni dokaz | Srednja | 001 `[x]` tasks, 002 tasks/handoff, current source | Historical task checkbox, commit author ili test fajl ne dokazuje aktuelan runtime ishod. | Mapa readiness razdvaja statički nalaz od pokrenute provere; T301 traži polazni rezultat. |

Nijedan statički nalaz ne ukazuje na namernu izmenu determinističke granice: model ne određuje presude, izvodi ili sledeće pitanje. Nema promena ustava. Medicinske formule koje su potvrđene ostaju potvrđene; novi obračun zahteva izvor i oznaku za proveru.

## Pokrivenost zahteva

| Zahtev | Zadatak(i) | Pokrivenost |
|---|---|---|
| F2-01 | T303–T304, T308, T324 | Da |
| F2-02 | T303, T305–T306 | Da |
| F2-03 | T307, T324 | Da |
| F2-04 | T312–T313 | Da |
| F2-05 | T309 | Da |
| F2-06 | T306, T309, T311, T313/T315 | Da |
| F2-07 | T314 | Da |
| F2-08 | T315 | Da |
| F2-09 | T314, T316, T324/T332 | Da |
| F2-10 | T317–T321 | Da; raw dostavljen, provenance i odobrenje čekaju čoveka |
| F2-11 | T310, T324–T325 | Da |
| F2-12 | T326–T331 | Da; živi run zahteva odobrenje |
| F2-13 | T322, T323 | Da uz Q4 granicu: nije modelska parsing metrika |
| F2-14 | T311, T313, T328, T334 | Da |
| F2-15 | T301, T332–T335 | Da; ownership/history čeka tim |
| F2-SC1–SC6 | T313–T331, T321–T323, T325/T332, T333–T335 | Da |
| AC-01–AC-12 | T302–T334 raspoređeno po explicit AC oznakama | Da |
| AC-11/AC-13 | Nema F2 taska, van obima po brief/002 | Namerno van Faze 2 |
| CAP-01–CAP-08 / REQ-B1–B10/C1–C4/D1–D4 | Mapa u `docs/phase-2-readiness.md`; task linkovi na B/C/D relevantno | Da; javni deployment deo B8/B9/D3 odložen |

## Merila i sledeći korak

- Ukupno buildable zahteva: 21 (F2-01–F2-15 i F2-SC1–SC6); sa najmanje jednim budućim taskom: 21 (100%).
- Ukupno taskova: 36 jedinstvenih ID-jeva T301–T336; unmapped taskova: 0. Pokrivenost AC-01–AC-12 i REQ-B/C/D je prikazana kroz njihove task veze; AC-11/AC-13 i odloženi public hosting su eksplicitno van Faze 2.
- Visoko ozbiljnih nalaza: 3 (I1–I3; I1/I2 imaju predloženo razrešenje, I3 čeka EV oracle proveru pre freeze-a); srednjih: 7; kritičnih: 0. Materijalnih preostalih dvosmislenosti u EV freeze-u: 1; blagi duplikati: 0.

- 15 funkcionalnih zahteva F2-01–F2-15; 6 SC; 5 korisničkih priča; 36 zadataka T301–T336.
- Svaki F2 zahtev i SC imaju bar jedan task ili eksplicitno objašnjen izuzetak.
- Otvoreno: buduća raspodela vlasnika/reviewera; poreklo/paginacija/uslovi korišćenja i review dostavljenog data snapshot-a; 30 nezavisnih ljudskih oznaka; serverski API key; plaćeni live approval; stvarni UI pregled. EV oracle dopune su pre zamrzavanja baseline-a.
- Prvi nezavisni paket T301–T310 oblasti B je spreman za buduću implementacionu sesiju. Ceo feature nije spreman za kompletno izvršenje ili live baseline dok ljudski preduslovi nisu prisutni.
- Sledeće: prvi paket B T301–T310 može u budućoj implementacionoj sesiji. Pre T327/EV freeze-a ponovo proveriti EV oracle i po potrebi pitati korisnika. Lokalni importer za sada nije pokrenut nad dostavljenim raw fajlom. Potrebno ponavljanje analize posle izmena spec/plan/tasks i pre novih zavisnih paketa. `speckit-analyze` sam po sebi je read-only; nalaze sam uneo u zahtevani `analysis.md` artefakt.
