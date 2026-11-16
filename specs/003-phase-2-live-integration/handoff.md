# Predaja funkcionalnosti 003

Implementacija koda za funkcionalnost 003 postoji u radnoj kopiji. Stvarno stanje komandi i dokaza je u [readiness izveštaju](../../docs/phase-2-readiness.md), a otvoreni zadaci ostaju u [tasks.md](tasks.md). Ne tumačiti prisustvo koda kao prolaz testova, ljudski pregled, live poziv ili završenu Fazu 2.

## Šta je implementirano

- Strogi zajednički ugovori, runtime validacija HTTP/model/tool/fajl granica, API greške, rate limit, CORS za lokalni UI i idempotentni run zahtevi.
- Provider-neutral adapter, serverski Gemini REST adapter, verzionisani promptovi, ograničeni pokušaji/budžeti, jedan repair pokušaj i redigovani trace-i.
- Četiri validirana alata i deterministički matcher; retrieval i pitanja koriste isti izvedeni snapshot. Servis odbija nepokrivene namere i ne zaključuje nedostajuće činjenice.
- UI podrška za jedinice, poreklo vrednosti, datum/poreklo dataseta, status/fazu studije, isključene studije, idempotency i kontrolisane greške.
- Lokalni CTG v2 importer, ljudski review template, compiler za odobrena pravila i zasebna kriterijumska gold metrika.
- Offline i live evaluator ugovori, fault scenariji, odobrenje pre live transporta, token/pokušaj ograničenja i nepromenljiv prvi baseline.

## Lokalna evidencija

Poslednja izgrađena verzija prošla je `typecheck`, `lint` i `build`. Poslednji `eval:offline` prošao je 6 offline/fault slučajeva, bez neuspeha; 7 modelskih slučajeva je preskočeno, a 3 su dry-run. Artifact: `eval/results/offline-2026-11-12T02-16-35.799Z-80b29912/`. `gold:metrics` je prošao na postojećem sintetičkom skupu; rezultat nije modelska ni statistička potvrda. Importer je validirao dostavljeni raw JSON-ovih 50 zapisa bez problema po redovima i ostavio kriterijume za ručno razdvajanje.

`test` i `smoke` nisu pokrenuti. `format:check` prijavljuje samo netaknute `data/raw/studies_50_recruiting_2026-11-12.json` i `plan/prompt_plan.md`. Pregled stranice u pregledaču nije zabeležen. Git commit metadata nije dostupan evaluatoru u sandboxu (`git` subprocess dobija `EPERM`). Potpune komande i ishodi su u readiness izveštaju.

## Otvoreni dokazi i ljudski koraci

- Čovek treba da potvrdi raw korpusa endpoint/izvoz, upit/filtere, paginaciju i uslove korišćenja/licencu. Importer čuva ono što je dato i ne dopunjava poreklo.
- Nema pregledanog/odobrenog rules paketa za studije. `rules:review-template` namerno pravi samo `pending_review`; compiler ne treba pokretati radi fabrikovanja odobrenja.
- Nema nezavisnih kriterijumskih gold anotacija i predikcija; profilni mock gold skup nije njihova zamena.
- Live Gemini poziv i `eval:live` baseline nisu izvršeni. Potrebni su scope-specifično ljudsko odobrenje, lokalna serverska konfiguracija tajne i potvrda da baseline direktorijum nije već zauzet. T332 UI live smoke je zaseban korak.
- Nisu izvršeni test-suite, API smoke ni browser/a11y pregled. Zadaci koji zahtevaju te dokaze ostaju otvoreni u `tasks.md`.
- Nove medicinske formule ili pragovi moraju dobiti primarni izvor i čovekovu potvrdu pre upotrebe; oznaka „PROVERITI prema originalnoj publikaciji“ ostaje aktivna.

Korisnikove postojeće izmene `.github/workflows/ci.yml`, nepraćeni `plan/` i raw snapshot nisu menjane. Ne resetovati ih niti prepisivati.
