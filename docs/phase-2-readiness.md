# Spremnost za Fazu 2 — provera na `main` (2026-11-17)

Ovaj izveštaj opisuje lokalno radno stablo na grani `main`, nakon offline provera. Promene nisu commit-ovane, push-ovane niti merge-ovane. `.env` nije čitan. Nisu pokretani live/plaćeni modeli ni evaluacije kasnijih faza.

## Nalaz

**Faza 2 nije spremna za zatvaranje.** RAG evaluator neslaganje je ispravljeno, ali ostaju samo dva ljudski potvrđena ranking slučaja; četiri nova predloga čekaju Jelenu. Browser E2E sada prolazi 2/2 sa čistim teardown-om. Nedostaju benchmark freeze/adjudikacija, nezavisan pravni/provenance pregled, matcher pravila odobrena hash-om i širi dokaz kvaliteta. Jelenina potvrda važi za vernost izvornog sadržaja, ne za RAG oznake niti automatizovana matcher pravila.

## Stanje implementacije

- **Real-20 demo integracija:** eksplicitni `DATASET_PROFILE=clinicaltrials-20` spaja 2 odobrene studije sa 18 split-pending zapisa: 20 jedinstvenih studija, 20 study dokumenata i 330 passages, uključujući svih 300 `manual_review` citata. Targeted loader/API testovi potvrđuju jedinstvene ID-jeve, retrieval dostupnost, citation i unknown status; Playwright real-20 UI tok sada prolazi 2/2 u Edge. Fixture režim ostaje default; demo lexical-only, bez API troška.
- **RAG loader, lexical/vector/hybrid, RRF, reranker, citati, context limit, matcher scope/fallback-i:** implementirani. Real-20 lexical dostupnost nije semantička evaluacija niti persistentni vektorski indeks; embeddings nisu pozvani.
- **RAG-T401:** otvoren. Četiri v2 slučaja su adjudikovana (dva ranking, dva behavior). RAG-P001..004 su neodobreni predlozi u [review queue](../eval/rag/retrieval-proposals-v1.json), a [JELENA_REVIEW](../eval/rag/JELENA_REVIEW.md) izdvaja konkretne odluke i ograničenje P003 na njegov petostudijski snapshot. Nijedan predlog nije gold; potrebna je ručna adjudikacija i širi skup.
- **RAG-T402:** otvoren. Evaluatorsko neslaganje je imalo passage-ID rekonstrukciju (`sourceIds`/formatirani tekst naspram eksplicitnih retrieval `passageIds`); RAG-002 dodatno je imao query expansion bug jer `renal health` nije dodavao eGFR/albumin termine. Lexicon v3 regresija nalazi oba gold passage-a u top 5 bez izmene oznaka/cutoff-a. Offline lexicon-v3 merenje (odvojeno od zamrznutog baseline-v2): RAG-001 passage nDCG@5=.613147; RAG-002=.501266 lexical/hybrid i .693426 sa rerankerom; study nDCG@2=1 za oba sa/bez rerankera. Ciljana RAG-002 popravka nije dokaz opšteg kvaliteta; hash embeddings nisu semantički dokaz.
- **RAG-T409:** novi offline izveštaj je `eval/results/rag/offline-fake-2026-11-17T22-42-56.104Z/summary.json`; InMemory/SQLite ID paritet 20/20. Na dva ranking slučaja study nDCG@2 rerank delta je 0/0; passage nDCG@5 delta je 0 za RAG-001 i +.192161 za RAG-002. Mali uzorak + fake/hash embedder, bez zaključka o generalnom kvalitetu.
- **RAG-T413 / browser tok:** GitHub CI nije proveravan. Playwright real-20 DEMO tok proverio je prikaz stvarnog NCT zapisa, citata i unknown kriterijuma; invalid profil prikazuje accessible grešku. 2/2 prolaze, runner exit code 0, a API/UI portovi su zatvoreni posle global teardown-a.
- **Faza 2 integracija:** targeted corpus/API testovi i Playwright Edge tok potvrđuju 20-study retrieval UI, NCT/citation prikaz i `unknown` matcher status; ostaju dodatni UI edge slučajevi i retrieval validacija nad širim ljudski adjudikovanim skupom.

## Podaci i ljudska provera

Jelena je ručno proverila stvarne studije i kriterijume prema originalnim studijama (potvrda vlasnika projekta, 2026-11-17). Formalni hash-pinned `review-report.json` beleži zasebno prethodno odobrenje za NCT07924436 i NCT07409714. Za 18 dodatnih studija, per-record API izvori, preuzimanja, hash-evi i transformacije su dokumentovani; Jelena lično poredi njihov izvorni tekst ne rešava zasebno endpoint/upit/paginacija-kohortu niti prava/uslove korišćenja. Nema razloga da se izvorna vernost tih studija naziva neproverenom, ali **300 novih tekstualnih kriterijuma ostaje `manual_review` za matcher**, jer odobrenje semantike strukturisanog pravila i hash-povezani compile/review trag nisu evidentirani. 26 strukturisanih polja mogu biti deterministički proverljiva, ali nisu isto što i odobrenja za 300 kriterijuma.

## Provere u ovoj sesiji

| Komanda                    | Ishod                                                                                                                                                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`           | PASS                                                                                                                                                                                                                                      |
| `pnpm lint`                | PASS                                                                                                                                                                                                                                      |
| `pnpm test`                | završna regresija: 59 fajlova, 272/272 PASS za 68.60 s                                                                                                                                                                                 |
| `pnpm exec vitest run apps/server/src/retrieval` | 8 fajlova, 42/42 PASS                                                                                                                                                    |
| `pnpm build`               | PASS; Vite upozorava na JS bundle 500.23 kB (prag 500 kB)                                                                                                                                                                                 |
| `pnpm smoke`               | PASS, API smoke                                                                                                                                                                                                                           |
| `pnpm eval:offline`        | PASS: 6 offline/fault, 0 fail; 7 live preskočeno; 3 dry-run                                                                                                                                                                               |
| `pnpm eval:rag:offline --embedding-mode fake --summary` | PASS, novi izveštaj `offline-fake-2026-11-17T22-42-56.104Z`; 4 slučaja (2 ranking + 2 behavior), label status u evaluatoru `pending_human_review`; study nDCG@2=1; passage nDCG@5: RAG-001 .613147 (lexical/hybrid/rerank), RAG-002 .501266 lexical/hybrid, .693426 rerank. Fake/hash, nije semantički dokaz. |
| `pnpm eval:rag:baseline` | Nije mogao da osveži jer `baseline-v2.json` namerno odbija overwrite (`EEXIST`); fajl je ostao netaknut. Lexicon-v3 rezultate voditi kao zasebno merenje. |
| Proposal queue schema      | PASS; četiri predloga ostaju `proposed`/`TODO`, pinned na v2 dataset/corpus i nisu evaluacioni gold                                                                                                                                       |
| Browser E2E                | 2/2 Playwright testa PASS u Edge na real-20 demo korpusu; exit code 0 i bez listenera/zaostalih servera na portovima 43173/5175 |
| `pnpm gold:metrics`        | 8 sintetičkih slučajeva; TP 9, FP 0, FN 1; precision 1, recall 0.9 — nije stvarni korisnički/medicinski benchmark                                                                                                                         |
| `pnpm sqlite:smoke`        | PASS, sqlite-vec v0.1.9 exact KNN                                                                                                                                                                                                         |

Zamrznuti baseline-v2 važi za petostudijski snapshot (2 stvarne + 3 sintetičke), ne za real-20 aktivni korpus; lexicon-v3 merenja nisu uporediva sa njim. Proposal oznake nisu evaluator ulaz. Live embedding/Gemini, GitHub Actions i pravni pregled nisu urađeni. `format:check` pada na 210 fajlova globalno; nema masovnog formatiranja. `git diff --check`, typecheck i lint prolaze.

## Pre zatvaranja Faze 2

1. 3.3: Jelena adjudikuje predloge i tek potom pravi hash-zamrznut benchmark snapshot sa odvojenim splitovima.
2. 4.2: Reranker analiza nad dva rankinga je preliminarna (study delta 0/0; passage +.192161 samo za RAG-002); potreban je veći nezavisno adjudikovan skup.
3. 6: evidentirati query/filter/pagination/kohortnu potpunost i dobiti odluku o pravima trećih strana; poreklo per-record samo po sebi nije pravno odobrenje.
4. 5.3: pripremiti i testirati demo profile isključivo prema već hash-odobrenim pravilima; nema novih pravila iz 18 dodatnih studija.
5. 5.2: per-criterion approval nije implementiran; koristiti minimalno bezbedno pravilo: samo eksplicitno pregledane stavke ulaze u draft studije/hash approval, ostatak ostaje `manual_review`/`unknown`.

Faze 3 i 4 ostaju van opsega. Nema merge/push preporuke dok navedeni Phase 2 kvalitetni i operativni dokazi ne budu rešeni.
