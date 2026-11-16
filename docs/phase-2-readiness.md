# Spremnost za Fazu 2 — grana `rag`

Ovaj izveštaj opisuje trenutno nekomitovano radno stablo na grani `rag`. Nije potvrda CI-ja na GitHub-u niti merge odobrenje. Radno stablo sadrži izmene; nema novog commit-a i nije rađen merge.

## Implementirano

- Odobren je SQLite + `sqlite-vec@0.1.9`; Node minimum i CI matrica su ažurirani. `VectorStore` ima memorijsku i SQLite implementaciju, manifest, hash-keš i deterministički tie-break.
- Dodati su `text-embedding-3-small` adapter sa allowlist-om, token procena/ograničenja za indeksiranje, `embeddings:check` i inkrementalni `index:build`.
- Dodati su corpus loader za `data/trials/` i `data/fixtures/`, dokumenti na nivou studije i kriterijumskog odlomka, validirani srpsko-engleski query builder, lexical/vector RRF i servisna integracija.
- Query builder sada pokriva više aspekata i multi-query fuziju, ćiriličnu transliteraciju, normalizaciju đ/dž, neprevedene termine u tragu, poznate-only state/status filtere i prag minimalne relevantnosti. Embedding greške daju ograničene pokušaje pa lex-only fallback.
- Dodati su deterministički podrazumevani reranker i opcioni jednokratni Gemini reranker sa strogom šemom izlaza i RRF fallback-om. Dodati su offline poređenje lexical/vector/hybrid/hybrid+rerank, TypeScript RAGAS-style heuristike i zaštićen live evaluator; live pozivi nisu izvršeni.
- Bez dijagnoze retrieval vraća stabilno sortirane studije do limita bez embeddings poziva. Matcher dobija sve kriterijume izabranih studija; pronađeni odlomci ne ograničavaju presudu.
- Testovi pokrivaju nepretražen exclusion kriterijum, zlonamerni odlomak u memorijskom indeksu, query builder, indeksiranje i VectorStore.

## Provere izvršene

| Provera                                            | Rezultat                                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `pnpm typecheck`                                   | PASS                                                                                        |
| `pnpm lint`                                        | PASS                                                                                        |
| `pnpm test`                                        | PASS — 58 fajlova, 252 testa                                                                |
| `pnpm build`                                       | PASS — Vite upozorava da JS bundle prelazi 500 kB                                           |
| `pnpm sqlite:smoke`                                | PASS — sqlite-vec v0.1.9 ekstenzija i KNN                                                   |
| `pnpm eval:offline`                                | PASS — 6 offline/fault slučajeva; 3 dry-run; 7 live slučajeva preskočeno                    |
| `pnpm eval:rag:offline`                            | PASS — fake embedder; InMemory/SQLite ID paritet `true` (20/20), distance delta ≤ 2.39e-7   |
| `node dist/scripts/index-build.js --estimate-only` | 5 studija, 20 dokumenata, 192 procenjena tokena; cena nepoznata (`null`); bez index build-a |
| `pnpm embeddings:check`                            | Ranije PASS — jedan sintetički poziv; nije ponovljen u ovoj završnoj proveri                |

Sva četiri postojeća RAG slučaja su adjudikovana: RAG-001/002 su rangirajući, a RAG-003/004 behavior slučajevi bez ranking metrika. Paired nDCG delte hybrid→rerank su 0 za RAG-001 i +0.369 za RAG-002. Dva slučaja na korpusu od pet studija nisu dokaz opšteg poboljšanja. Lokalno merenje VectorStore latencije nije produkcioni SLO.

`pnpm eval:offline` prethodno beleži commit `4c22035` kao source revision, dok su izmene u radnom stablu nekomitovane; zato taj izveštaj nije baseline za ovaj diff.

## Preostalo pre merge-a

- `eval/rag/retrieval-v1.json` i `baseline-v1.json` ostaju nepromenjeni. Sva četiri slučaja u `retrieval-v2.json` adjudikovana su od JG; planned patterns su samo opisni, bez konkretnih slučajeva ili oznaka. Globalni dataset status ostaje `pending_human_review`.
- `index:build` nije pokrenut; nema lokalnog izgrađenog indeksa i tekst studija nije poslat embeddings provajderu. `embeddings:check` je koristio samo sintetički upit.
- Retrieval implementacija/evaluatori i offline RAG poređenje su završeni, ali oznake nisu ljudski adjudikovane; nije potvrđeno da reranking poboljšava kvalitet. TypeScript RAGAS-style metrike su lokalne heuristike, ne semantički dokaz.
- Estimate-only nije slao tekst niti pozivao embeddings provajdera; stvarni index build čeka korisničko odobrenje.
- `eval:rag:live` i Gemini reranker nisu pozvani; nije dostavljen human-reviewed RAGAS skup niti live approval.
- Stvarni EV baseline sa LLM-om, browser review i GitHub CI status nisu provereni. Paket studija ima lokalne review metapodatke, ali njihov identitet/licenca/poreklo nisu nezavisno potvrđeni.
- Repo-wide `pnpm format:check` i dalje pada na 15 netaknutih fajlova/podataka i nepromenljivom `baseline-v1.json`. Svi RAG fajlovi izmenjeni u ovom radu prošli su zaseban Prettier check.
- CI workflow je pregledan: pokreće typecheck, lint, build, offline testove i `eval:offline`; ne poziva `embeddings:check`, `index:build` ni live evaluator. GitHub izvršenje/status ipak nije provereno.

## Zaključak

**Nije spremno za merge.** Offline tipovi/testovi/build i tehničko poređenje RAG varijanti prolaze, ali benchmark nije ljudski adjudikovan pa nema kvalitetnog zaključka o rerankingu. Nema izgrađenog indeksa; `index:build`, live RAG evaluacija i EV baseline nisu pokrenuti, a GitHub CI izvršenje nije provereno.
