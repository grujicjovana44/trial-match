# Zadaci: Hibridni RAG

Svaki zadatak je vezan za RAG ID-jeve iz [specifikacije](spec.md). Postojeći AC ID-jevi iz specifikacije 003 ostaju nepromenjeni.

## Paket 0 — benchmark pre izmene retrieval-a

- [x] RAG-T401 Napraviti retrieval skup sa srpskim i engleskim validiranim profilima, relevantnim studijama/tačnim criterion ID-jima, korpusnim verzijama/hash-evima i ljudskim anotacionim poreklom. Ne označiti assistant draft kao ljudski odobren. **Status (2026-11-18):** v1/v2 ostaju nepromenjeni; P001–P003 su preneti u `eval/rag/retrieval-v3-adjudicated.json`, a P004 u zaseban `eval/rag/behavior-adjudication-v1.json` jer je pregledan nad real-20 profilom. Negativni P003 važi samo za petostudijski `rag-corpus-v0-dev`. Odluke, reviewer i datum (`2026-11-18`) zabeleženi.
- [ ] RAG-T402 Dodati offline metrike recall@k, precision@k, MRR, nDCG, citation validity, context limit i deterministic rerun. Zamrznuti MiniSearch baseline bez prepisivanja i uz sačuvan git/corpus/dataset identitet. **Status (2026-11-17):** ID neslaganje je otklonjeno korišćenjem eksplicitnih retrieval `passageIds` umesto rekonstrukcije iz formatiranog teksta/širenja `sourceIds`. Zaseban RAG-002 query bug bio je nedovoljna ekspanzija `renal health` ka eGFR/albumin; lexicon v3 ciljano popravlja upit i regresija vraća oba gold passage ID-ja u top 5 bez menjanja gold/cutoff-a. Novi fake/hash offline izveštaj: `eval/results/rag/offline-fake-2026-11-17T22-42-56.104Z/summary.json`; RAG-002 passage nDCG@5 .501266 lexical/hybrid, .693426 rerank; RAG-001 .613147 za sva tri. Ovi lexicon-v3 rezultati nisu uporedivi sa neizmenjenim `baseline-v2.json`; reranker/provera je samo dva rankinga, hash embeddings nisu semantički dokaz. Ostaje otvoren.

## Paket 1 — izbor baze

- [x] RAG-T403 Uporediti aktuelnu zvaničnu dokumentaciju LanceDB Node SDK i SQLite + sqlite-vec; proveriti kompatibilnost Node 24.22.1, macOS i Linux CI, offline clean-checkout ponovljivost, licensing, native-build zavisnosti i izdanja starija od 14 dana. **Status:** istraživanje završeno; korisnik je odobrio SQLite + sqlite-vec; rizik pre-1.0/Node SQLite RC je dokumentovan. `pnpm sqlite:smoke` je prošao. **Zahtevi:** RAG-07.

## Paket 2 — osnovna hibridna arhitektura

- [x] RAG-T404 Definisati validirani profil-query builder, verzionisani srpsko-engleski terminološki rečnik i determinističko ponašanje bez dijagnoze; dodati eval slučajeve. **Status:** implementirani su multi-aspect/multi-query upiti, prošireni rečnik, ćirilična transliteracija, đ/dž normalizacija, trag neprevedenih termina i poznati-only metadata filteri; ljudska adjudikacija ostaje otvorena u RAG-T401. **Zahtevi:** RAG-01–04.
- [x] RAG-T405 Definisati `VectorStore` contract, memorijsku implementaciju, embeddings adapter, allowlist config za `text-embedding-3-small` i bezbedan manifest indeksa. **Status:** implementirano i pokriveno ciljanim offline testovima; stvarni provider pristup još nije proveren. **Zahtevi:** RAG-07, RAG-08, RAG-17.
- [x] RAG-T406 Posle odobrenja baze dodati ugrađenu implementaciju, `embeddings:check`, inkrementalni `index:build`, hash-keširanje, token procenu/potvrdu i resursne limite. Podaci generisanog indeksa ostaju necommitovani. **Status:** implementacija i offline testovi su završeni; jedan stvarni sintetički `embeddings:check` je uspeo. Operativni `index:build` namerno nije pokrenut. **Zahtevi:** RAG-08, RAG-09.
- [x] RAG-T407 Dodati nivo studije (naslov/stanja/sažetak) i criterion passage indeksiranje, leksičko/vektorsko pretraživanje i RRF. **Status:** nivoa studije/odlomka, multi-query RRF, minimalna relevantnost i lex-only fallback su implementirani; evaluacija je zabeležena u RAG-T409. **Zahtevi:** RAG-06, RAG-10.
- [x] RAG-T408 Dodati deterministički rerank i kontekstualizaciju; matcher uvek prima sve pregledane kriterijume izabranih studija. Testirati nepretražen exclusion criterion, srpski upit prema engleskom izvoru, no-diagnosis fallback, injection fixture, citations i context cap. **Status:** deterministički reranker, matcher scope, nepretražen exclusion, zlonamerni odlomak, context cap i RRF fallback pri reranker grešci su implementirani i testirani. **Zahtevi:** RAG-02–06, RAG-10–12.
- [x] RAG-T409 Proći isti zamrznuti skup kroz leksički, vektorski, hibridni i hibridni+deterministički reranker; izmeriti precision/recall/MRR/nDCG, paritet vector store-a, kašnjenje i regresije. **Status (2026-11-17 završna regresija):** fake/hash eval zapis `eval/results/rag/offline-fake-2026-11-17T22-42-56.104Z/summary.json`, InMemory/SQLite parity true (20/20 ID, bez distance mismatch). Pair na dva ranking slučaja: study nDCG@2 delta 0/0; passage nDCG@5 delta 0 / +.192161 (RAG-001/RAG-002). Lexicon v3 je izmereno nad v2 dataset/corpus, ali je zaseban run i nije uporediv sa baseline-v2. Samo razvojni signal, nije semantička evaluacija. **Zahtevi:** RAG-13, RAG-14.

## Paket 3 — proširenja ako ostane vremena

- [x] RAG-T410 Dodati ograničeni opcioni LLM reranker iza postojećeg adaptera, sa maksimalnim brojem poziva, offline mock-om, RRF fallback-om i istim benchmarkom. **Status:** opciona Gemini integracija ima jedan ograničeni poziv i strogu `{id, score}` validaciju; nije izvršen live poziv. **Zahtevi:** RAG-10.
- [x] RAG-T411 Dodati TypeScript RAGAS-style evaluator za faithfulness, answer relevancy, context precision/recall i eksplicitno zaštićen live izvršilac. **Status:** lokalni heuristički evaluator i guarded `eval:rag:live` su implementirani/testirani; live dataset i approval nisu dostavljeni, pa poziv nije izvršen. **Zahtevi:** RAG-15, RAG-16.

## Paket 4 — dokumentacija i zatvaranje

- [x] RAG-T412 Ažurirati README, architecture, data-map, security, evaluation, decisions, specifikaciju i task ledger; dokumentovati provider payload, nepoznat trošak, build/test komande i neizvršene provere. **Status:** dokumentacija je ažurirana; `embeddings:check` je poslao samo fiksni sintetički upit. **Zahtevi:** RAG-08–17.
- [x] RAG-T413 Pokrenuti typecheck, lint, test i offline RAG eval; proveriti da CI ne poziva embeddings/live evaluator i da se indeks/ključ ne commit-uju. **Status (2026-11-18):** `pnpm typecheck`, `pnpm lint`, `pnpm test` (307/307), `pnpm smoke`, `pnpm build`, offline RAG i Playwright real-20 u Chrome-u (2/2) prolaze. CI workflow je statički pregledan; pokreće samo offline test/eval komande. `.gitignore` isključuje `data/index/` i env fajlove, a nema praćenih indeksa ili tajni. GitHub Actions remote status/live provider nisu provereni.

## Završna revizija statusa — 2026-11-17

RAG-T401/T413 su dopunjeni 2026-11-18; RAG-T402 ostaje otvoren zbog malog, ne nezavisnog ranker skupa. Offline v3 fake/hash metrike su razvojni signal, ne semantički dokaz. Matcher odobrenja su dokumentovana zasebno u Phase 2 readiness izveštaju.
