# Spremnost za Fazu 2 — grana `rag`

Ovaj izveštaj opisuje trenutno nekomitovano radno stablo na grani `rag`. Nije potvrda CI-ja na GitHub-u niti merge odobrenje. Radno stablo sadrži izmene; nema novog commit-a i nije rađen merge.

## Implementirano

- Odobren je SQLite + `sqlite-vec@0.1.9`; Node minimum i CI matrica su ažurirani. `VectorStore` ima memorijsku i SQLite implementaciju, manifest, hash-keš i deterministički tie-break.
- Dodati su `text-embedding-3-small` adapter sa allowlist-om, token procena/ograničenja za indeksiranje, `embeddings:check` i inkrementalni `index:build`.
- Dodati su corpus loader za `data/trials/` i `data/fixtures/`, dokumenti na nivou studije i kriterijumskog odlomka, validirani srpsko-engleski query builder, lexical/vector RRF i servisna integracija.
- Bez dijagnoze retrieval vraća stabilno sortirane studije do limita bez embeddings poziva. Matcher dobija sve kriterijume izabranih studija; pronađeni odlomci ne ograničavaju presudu.
- Testovi pokrivaju nepretražen exclusion kriterijum, zlonamerni odlomak u memorijskom indeksu, query builder, indeksiranje i VectorStore.

## Provere izvršene

| Provera                 | Rezultat                                                                          |
| ----------------------- | --------------------------------------------------------------------------------- |
| `pnpm typecheck`        | PASS                                                                              |
| `pnpm lint`             | PASS                                                                              |
| `pnpm test`             | PASS — 55 fajlova, 231 test                                                       |
| `pnpm build`            | PASS — Vite upozorava da JS bundle prelazi 500 kB                                 |
| `pnpm sqlite:smoke`     | PASS — sqlite-vec v0.1.9 ekstenzija i KNN                                         |
| `pnpm eval:offline`     | PASS — 6 offline/fault slučajeva; 3 dry-run; 7 live slučajeva preskočeno          |
| `pnpm embeddings:check` | PASS — jedan sintetički poziv; `text-embedding-3-small`, 1536 dimenzija, 4 tokena |

`pnpm eval:offline` beleži commit `4c22035` kao source revision, dok su izmene u radnom stablu nekomitovane; zato taj izveštaj nije baseline za ovaj diff. RAG-specifični eval poređenja nije pokrenut.

## Preostalo pre merge-a

- `eval/rag/retrieval-v1.json` i `baseline-v1.json` ostaju nepromenjeni. `retrieval-v2.json` sadrži predložene oznake (`TODO` pregledavaoci/datumi) i opisne corpus-v1 obrasce; ljudska adjudikacija nije urađena. Merenja na v0-dev su razvojna, bez zaključaka.
- `index:build` nije pokrenut; nema lokalnog izgrađenog indeksa i tekst studija nije poslat embeddings provajderu. `embeddings:check` je koristio samo sintetički upit.
- Nisu završeni metadata filteri, poseban deterministic reranker, `eval:rag:offline` poređenje lexical/vector/hybrid/reranked varijanti ni TypeScript RAGAS/`eval:rag:live` evaluator.
- Stvarni EV baseline sa LLM-om, browser review i GitHub CI status nisu provereni. Paket studija ima lokalne review metapodatke, ali njihov identitet/licenca/poreklo nisu nezavisno potvrđeni.
- Repo-wide `pnpm format:check` i dalje pada na 15 netaknutih fajlova/podataka i nepromenljivom `baseline-v1.json`. Svi RAG fajlovi izmenjeni u ovom radu prošli su zaseban Prettier check.
- CI workflow je pregledan: pokreće typecheck, lint, build, offline testove i `eval:offline`; ne poziva `embeddings:check`, `index:build` ni live evaluator. GitHub izvršenje/status ipak nije provereno.

## Zaključak

**Nije spremno za merge.** Offline tipovi/testovi/build prolaze, ali ključni ulazni benchmark nije ljudski adjudikovan, nema izgrađenog indeksa ni poređenja RAG varijanti, a postojeći live/CI provere nisu izvršene. Nije pokrenut `index:build`, live RAG evaluacija niti EV baseline.
