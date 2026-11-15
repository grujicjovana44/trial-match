# Zadaci: Hibridni RAG

Svaki zadatak je vezan za RAG ID-jeve iz [specifikacije](spec.md). Postojeći AC ID-jevi iz specifikacije 003 ostaju nepromenjeni.

## Paket 0 — benchmark pre izmene retrieval-a

- [ ] RAG-T401 Napraviti sintetički retrieval skup sa srpskim i engleskim validiranim profilima, relevantnim studijama/tačnim criterion ID-jima, korpusnim verzijama/hash-evima i ljudskim anotacionim poreklom. Ne označiti assistant draft kao ljudski odobren. **Status:** v1 ostaje nepromenljiv; sva četiri postojeća slučaja v2 adjudikovao je JG (2026-11-15). Planirani corpus-v1 obrasci i dalje nemaju konkretne slučajeve/oznake, pa globalni status ostaje `pending_human_review`. **Zahtevi:** RAG-02, RAG-13.
- [ ] RAG-T402 Dodati offline metrike recall@k, precision@k, MRR, nDCG, citation validity, context limit i deterministic rerun. Zamrznuti MiniSearch baseline bez prepisivanja i uz sačuvan git/corpus/dataset identitet. **Status:** v1 baseline ostaje nepromenljiv; v2 runner izuzima behavior/proposed/disputed slučajeve iz rangiranja, ograničava k na polovinu korpusa i razdvaja dev/test. Svaka metrika nad v0-dev je razvojna, bez zaključaka. **Zahtevi:** RAG-13, RAG-14. **Blokira:** sve retrieval algoritamske evaluacije.

## Paket 1 — izbor baze

- [x] RAG-T403 Uporediti aktuelnu zvaničnu dokumentaciju LanceDB Node SDK i SQLite + sqlite-vec; proveriti kompatibilnost Node 24.22.1, macOS i Linux CI, offline clean-checkout ponovljivost, licensing, native-build zavisnosti i izdanja starija od 14 dana. **Status:** istraživanje završeno; korisnik je odobrio SQLite + sqlite-vec; rizik pre-1.0/Node SQLite RC je dokumentovan. `pnpm sqlite:smoke` je prošao. **Zahtevi:** RAG-07.

## Paket 2 — osnovna hibridna arhitektura

- [x] RAG-T404 Definisati validirani profil-query builder, verzionisani srpsko-engleski terminološki rečnik i determinističko ponašanje bez dijagnoze; dodati eval slučajeve. **Status:** implementirani su multi-aspect/multi-query upiti, prošireni rečnik, ćirilična transliteracija, đ/dž normalizacija, trag neprevedenih termina i poznati-only metadata filteri; ljudska adjudikacija ostaje otvorena u RAG-T401. **Zahtevi:** RAG-01–04.
- [x] RAG-T405 Definisati `VectorStore` contract, memorijsku implementaciju, embeddings adapter, allowlist config za `text-embedding-3-small` i bezbedan manifest indeksa. **Status:** implementirano i pokriveno ciljanim offline testovima; stvarni provider pristup još nije proveren. **Zahtevi:** RAG-07, RAG-08, RAG-17.
- [x] RAG-T406 Posle odobrenja baze dodati ugrađenu implementaciju, `embeddings:check`, inkrementalni `index:build`, hash-keširanje, token procenu/potvrdu i resursne limite. Podaci generisanog indeksa ostaju necommitovani. **Status:** implementacija i offline testovi su završeni; jedan stvarni sintetički `embeddings:check` je uspeo. Operativni `index:build` namerno nije pokrenut. **Zahtevi:** RAG-08, RAG-09.
- [x] RAG-T407 Dodati nivo studije (naslov/stanja/sažetak) i criterion passage indeksiranje, leksičko/vektorsko pretraživanje i RRF. **Status:** nivoa studije/odlomka, multi-query RRF, minimalna relevantnost i lex-only fallback su implementirani; evaluacija je zabeležena u RAG-T409. **Zahtevi:** RAG-06, RAG-10.
- [x] RAG-T408 Dodati deterministički rerank i kontekstualizaciju; matcher uvek prima sve pregledane kriterijume izabranih studija. Testirati nepretražen exclusion criterion, srpski upit prema engleskom izvoru, no-diagnosis fallback, injection fixture, citations i context cap. **Status:** deterministički reranker, matcher scope, nepretražen exclusion, zlonamerni odlomak, context cap i RRF fallback pri reranker grešci su implementirani i testirani. **Zahtevi:** RAG-02–06, RAG-10–12.
- [x] RAG-T409 Proći isti zamrznuti skup kroz leksički, vektorski, hibridni i hibridni+deterministički reranker; izmeriti precision/recall/MRR/nDCG, paritet vector store-a, kašnjenje i regresije. **Status:** `pnpm eval:rag:offline` je prošao sa lažnim embedderom; InMemory/SQLite paritet je `true` (20/20 ID-jeva, maksimalna distance razlika 2.384185791015625e-7). Potvrđene paired nDCG delte: RAG-001 0, RAG-002 +0.3691. Dva slučaja na malom korpusu nisu dovoljna za zaključak da reranking generalno poboljšava kvalitet. **Zahtevi:** RAG-13, RAG-14.

## Paket 3 — proširenja ako ostane vremena

- [x] RAG-T410 Dodati ograničeni opcioni LLM reranker iza postojećeg adaptera, sa maksimalnim brojem poziva, offline mock-om, RRF fallback-om i istim benchmarkom. **Status:** opciona Gemini integracija ima jedan ograničeni poziv i strogu `{id, score}` validaciju; nije izvršen live poziv. **Zahtevi:** RAG-10.
- [x] RAG-T411 Dodati TypeScript RAGAS-style evaluator za faithfulness, answer relevancy, context precision/recall i eksplicitno zaštićen live izvršilac. **Status:** lokalni heuristički evaluator i guarded `eval:rag:live` su implementirani/testirani; live dataset i approval nisu dostavljeni, pa poziv nije izvršen. **Zahtevi:** RAG-15, RAG-16.

## Paket 4 — dokumentacija i zatvaranje

- [x] RAG-T412 Ažurirati README, architecture, data-map, security, evaluation, decisions, specifikaciju i task ledger; dokumentovati provider payload, nepoznat trošak, build/test komande i neizvršene provere. **Status:** dokumentacija je ažurirana; `embeddings:check` je poslao samo fiksni sintetički upit. **Zahtevi:** RAG-08–17.
- [x] RAG-T413 Pokrenuti typecheck, lint, test i offline RAG eval; proveriti da CI ne poziva embeddings/live evaluator i da se indeks/ključ ne commit-uju. **Status:** `pnpm typecheck`, `pnpm lint`, `pnpm test` (58 fajlova/252 testa), `pnpm build` i `pnpm eval:rag:offline` prolaze. Offline eval ne koristi mrežu; `data/index/` nije kreiran. Operativni `index:build` i live evaluatori nisu pokrenuti. GitHub CI izvršenje i živi provajderi nisu provereni. **Zahtevi:** RAG-07–17.
