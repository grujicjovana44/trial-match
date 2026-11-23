# Tim i odgovornosti

Tim ima četiri člana. Raspodela uloga i pregleda ispod potvrđena je od vlasnika projekta 23. 11. 2026.

| Oblast | Odgovornost                                   | Vodeći član | Pregled |
| ------ | --------------------------------------------- | ----------- | ------- |
| A      | Korisnički tok, UI i kriterijumi prihvatanja  | Aleksa      | Jelena  |
| B      | Serverski API, šeme i pouzdanost              | Igor        | Jelena  |
| C      | AI granica, retrieval i workflow              | Jovana      | Igor    |
| D      | Evaluacija, podaci, bezbednost i ponovljivost | Jelena      | Jovana  |

Svaki član treba da ume da objasni svoj doprinos na odbrani; tim treba da pregleda integraciju i dokaze.

## Potvrđeni istorijski doprinosi (2026-11-12)

Prethodni korisnički iskaz beleži da je Jovana napravila osnovu projekta i rad pre Aleksinog UI dela, Aleksa izvršio oblast A u funkcionalnosti 002, a Jelena pregledala dosadašnji rad. To je istorijski kontekst, ne potvrda uloga za završnu predaju.

## Potvrđena raspodela za završnu predaju (2026-11-23)

Vlasnik projekta je potvrdio raspodelu A–D i predložene pregledače iz gornje tabele. Pregled za C ima zapis u [Igorovoj CAP-08 belešci](team/igor.md); pregled i odobrenje podataka za D dokumentovani su u `data/rule_sets/` i `docs/phase-2-readiness.md`.

**Potvrda raspodele:** zabeležena 23. 11. 2026. Lične CAP-08 beleške i njihov status:

| Član              | Kratak opis                                                                                                                                   | Status i beleška                                                                    |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Jovana Grujić     | Faza 1 DEMO osnova; Faza 2 hibridni RAG i evaluacioni okvir; pregled Jelenine integracije studija i formalni review u opsegu approval zapisa. | **POPUNJENO I POTVRĐENO** od strane članice — [CAP-08](team/jovana.md)              |
| Jelena Kantarević | Uvoz, priprema i integracija 18 studija i predloga pravila; pregled izvornog sadržaja, RAG provere i integracija Aleksinog voice input-a.     | **POPUNJENO I POTVRĐENO** od strane članice — [CAP-08](team/jelena.md)              |
| Igor Nenadović    | Specifikacija Faze 2, serverski Gemini/API, workflow, budžeti i bezbednosne provere.                                                          | Popunjena postojeća beleška — [CAP-08](team/igor.md)                                |
| Aleksa Durutović  | Korisnički tok, UI i implementacija voice input-a; rad na evaluaciji i demo toku.                                                             | Popunjena postojeća beleška — [CAP-08](team/aleksa.md) |

Jelena je pripremila i integrisala nova matcher mapiranja u commitu `74a9b2d`; formalni review artefakt za odgovarajuća pravila navodi Jovanu kao `reviewer`. Pregled izvornog teksta i integracija pravila nisu isto što i formalno odobrenje svih 300 kriterijuma.
