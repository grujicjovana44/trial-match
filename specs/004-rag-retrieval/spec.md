# Specifikacija: Hibridni RAG za TrialMatch

**Funkcionalnost**: `004-rag-retrieval`  
**Datum**: 2026-11-15  
**Status**: Implementacija je proširena sa multi-query RRF-om, opcionim rerankiranjem, embedding fallback-om i offline evaluatorima. Operativni `index:build`, `eval:rag:live` i live RAGAS evaluator nisu pokrenuti.
**Nadovezuje se na**: [specifikaciju Faze 2](../003-phase-2-live-integration/spec.md), bez izmene njenih AC ID-jeva.

Jezički model čita pravila i objašnjava rezultat. Odluku donosi deterministički kod. RAG pronalazi studije i kontekstualne odlomke; ne određuje ishod podobnosti.

## Granice i nepromenljivi zahtevi

- Retrieval bira samo studije koje ulaze u razmatranje. Matcher za svaku izabranu studiju ocenjuje sve pregledane kriterijume iz podataka, ne samo kriterijume čiji su odlomci vraćeni retrieval-om.
- Rangirani odlomci služe za kontekst objašnjenja i citata. Odlomci su nepouzdani podaci; tekst ne može menjati matcher, pitanja, alate ni presude.
- Postojeće stabilne source ID-jeve i serversku proveru citata treba očuvati. Svaki citat mora biti iz izvora dostupnog u konkretnom run-u i verifikovan nad originalnim tekstom.
- Novi zahtevi koriste prefiks `RAG-`; postojeći AC ID-jevi iz `003` se ne preimenuju niti menjaju značenje.
- Pipeline mora raditi nad `data/trials/` i `data/fixtures/`. Novi ili izmenjeni izvori ulaze ponovnim pokretanjem `index:build`.
- CI, testovi i offline evaluacija nikad ne pozivaju embeddings ili druge plaćene servise.

## Korisnički scenariji

### US1 — Relevantne studije i izvori iz validiranog profila

Validiran strukturisani sintetički profil postaje skup upita za dijagnoze/komorbiditete i poznate laboratorijske oblasti (HbA1c, kreatinin/eGFR, BMI i lekovi). Srpski termini se transliterišu iz ćirilice, normalizuju (uključujući đ/dž) i prevode determinističkim, verzionisanim rečnikom; izvorni alias se zadržava kao dodatni upit. Nepoznati termin ostaje u upitu i beleži se kao `untranslated` u retrieval tragu. Sirovi profilni tekst se ne šalje embedding servisu.

Metapodaci mogu ograničiti skup studija samo po poznatim, dozvoljenim filterima. Ako nema dijagnoze ni drugog pretraživog koncepta, sistem vraća sve studije koje prođu metadata filtere, sortirane stabilno po normalizovanom ID-ju, līdz `maxCandidates` limitu. Nije dozvoljeno uzimati prvih N zapisa ulaznog fajla.

### US2 — Hibridna pretraga uz očuvan matcher

Sistem pretražuje studije i kriterijumske odlomke; MiniSearch indeks se izgradi pri inicijalizaciji. Kandidati se kombinuju po svim aspektima upita preko RRF-a, a zatim se top-N studija i odlomaka opciono rerangiraju jednim Gemini pozivom sa strogim `{id, score}` izlazom. Gemini rangira samo tekstualnu relevantnost i ne odlučuje podobnost niti kriterijume. Nevalidan izlaz ili greška poziva vraća RRF redosled. Testovi podrazumevano koriste deterministički reranker.

Posle odabira studija, matcher dobija kompletan kriterijumski niz iz svake izabrane studije. Čak i kada retrieval nije stavio exclusion odlomak u kontekst, matcher mora oceniti taj exclusion kriterijum; poznato kršenje i dalje daje `excluded`.

### US3 — Ponovljiv indeks

Lokalni `index:build` čita sve podržane izvore u `data/trials/` i `data/fixtures/`, izračunava hash-eve, ponovo koristi embedding keš po hash-u teksta i modela, i piše indeks sa manifestom. Manifest beleži embedding model, dimenziju, verzije i hash-eve korpusa/odlomaka, kao i verziju normalizacije. Indeksni fajlovi su generisani lokalni artefakti i ne commit-uju se.

Pre stvarnog poziva indeksiranja alat prikazuje procenu tokena. Ako se pređe konfigurisani prag, traži se potvrda pre slanja bilo kakvog teksta. Greška ključa, naloga ili modela je eksplicitna; nema promene modela ili providera kao fallback-a.

### US4 — Merljiva offline i live evaluacija

Verzionisan retrieval skup sadrži sintetičke profile/upite, relevantne studije i tačne relevantne odlomke i vezan je za verziju i hash korpusa. Skup se ljudski potvrđuje i zamrzava pre izmena retrieval-a. Na istim ID-jevima slučajeva meri se postojeći MiniSearch baseline, pa leksički, vektorski, hibridni i rerankovani pristupi.

Metrike uključuju recall@k, precision@k, MRR, nDCG, stabilnost tie-break-a, citatnu validnost i granicu konteksta. Poređenje beleži kašnjenje i paritet rezultata implementacija `VectorStore`.

`eval:rag:offline` koristi samo lažni deterministički embedder i ne pristupa mreži. `eval:rag:live` traži eksplicitnu potvrdu, prikazuje procenjeni broj embeddings/LLM poziva i trošak pre slanja, i beleži modele/verzije/ishode. Live rezultati se nikada ne biraju po najboljem pokušaju.

`eval:rag:offline` poredi lexical-only, vector-only, hybrid i hybrid+rerank na istim case ID-jevima i meri metrike, kašnjenje i paritet InMemory/SQLite VectorStore-a. Predložene oznake se prikazuju samo kao razvojna dijagnostika. TypeScript RAGAS-style evaluator izračunava četiri metrike lokalnim heuristikama; `eval:rag:live` je odvojen, koristi sintetički ljudski pregledan skup i zahteva immutable approval, limite i eksplicitno priznanje da cena nije dostupna. Nijedan evaluator ne menja determinističke ishode.

## Zahtevi i kriterijumi prihvatanja

| ID | Zahtev | Kriterijum prihvatanja |
|---|---|---|
| RAG-01 | Upit se gradi samo od `ProfileSchema` validiranog profila. | Nijedna retrieval/embedding funkcija ne prima sirov korisnički tekst. Nepoznate vrednosti ostaju odsutne. |
| RAG-02 | Srpski termini rade nad engleskim korpusom. | Verzionsani rečnik, ćirilična transliteracija i normalizacija đ/dž rade deterministički; nepoznati termini ostaju u upitu i označeni su u tragu. |
| RAG-03 | Ponašanje bez dijagnoze je eksplicitno. | Bez pretraživog koncepta vraćaju se svi metadata-dozvoljeni zapisi do limita u stabilnom ID redosledu, nikad početni ulazni redosled. |
| RAG-04 | Metadata filtering ne nagađa. | Poznata state/status polja filtriraju se kao posebna faza; vrednost nepoznata u korpusu se ne primenjuje kao tvrdi filter. |
| RAG-05 | Obim kandidata je odvojen od obima kriterijumske procene. | Matcher dobija sve pregledane kriterijume svake izabrane studije. Test dokazuje da nepretražen exclusion kriterijum i dalje daje `excluded`. |
| RAG-06 | Leksički retrieval radi na studiji i odlomku. | MiniSearch indeks se gradi jednom po inicijalizovanom korpusu; prazno/nepovezano pretraživanje ne vraća proizvoljne najbliže rezultate. |
| RAG-07 | `VectorStore` je zamenljiv. | Postoji memorijska implementacija za testove/CI/offline i odobrena ugrađena implementacija za lokalni/demo/live rad; zajednički ugovorni test proverava paritet. |
| RAG-08 | Embeddings su kontrolisani i otporni na greške. | Dozvoljen je samo `text-embedding-3-small`; timeout, 429/5xx ili nevalidan odgovor imaju ograničene pokušaje, zatim lex-only fallback sa tragom. Query embeddings keširaju se po modelu i hash-u upita. |
| RAG-09 | Indeksiranje je inkrementalno i ograničeno. | `index:build` prihvata oba data-root-a, kešira hash teksta+modela, prikazuje procenu pre poziva, traži potvrdu preko praga i poštuje batch/timeout/retry/max-chunks. |
| RAG-10 | Fuzija je ponovljiva i rerankiranje ograničeno. | RRF pravi kandidate; top-N studija/odlomaka rerankira deterministički ili jednim opcionim Gemini pozivom sa strogim `{id, score}` izlazom. Greška/invalidan izlaz vraća RRF redosled. |
| RAG-11 | Kontekst i citati su bezbedni. | Kontekst ne prelazi `MAX_CONTEXT_CHARS`; ID-jevi i postojeća server provera citata ostaju; studijski tekst je jasno označen kao nepouzdan. |
| RAG-12 | Zlonameran odlomak ne menja matcher. | Adversarial fixture može dospeti u kontekst kao nepouzdan tekst; alatni izlaz/presude/pitanja ostaju funkcija samo validiranog profila, pregledanih kriterijuma i determinističkog koda. |
| RAG-13 | Retrieval skup je verzionisan i ima anotaciono poreklo. | Schema v2 dodaje `relevanceRule`, `labelStatus`, `reviewer`, `reviewedAt`, `kind` i `split`; nepotvrđene oznake ostaju `proposed`/`TODO`. V1 ostaje nepromenljiv. Obrasci bez dostupnog korpusa opisuju se bez relevantnih ID-jeva ili oznaka. |
| RAG-14 | Retrieval metrike su proverljive i primerene tipu slučaja. | Offline poređenje izvršava lexical/vector/hybrid/hybrid+rerank na istim ID-jevima; meri recall/precision/MRR/nDCG, latency i paritet skladišta. Nepotvrđene oznake su jasno označene kao dijagnostika. |
| RAG-15 | Generisanje ima odvojenu RAGAS-stil evaluaciju. | TypeScript evaluator računa faithfulness, answer relevancy, context precision/recall; live sudija je poseban guarded command, a heuristički offline rezultat nije semantički dokaz. |
| RAG-16 | Live trošak je vidljiv pre poziva. | Live evaluator prikazuje pozive/model/trošak procenjen pre početka, zahteva eksplicitnu potvrdu i beleži stvarni rezultat bez biranja najboljeg pokušaja. |
| RAG-17 | Podaci upućeni embedding provajderu su dokumentovani. | `docs/data-map.md` navodi da se šalju samo javni tekst studija i deterministički upit izveden iz sintetičkog validiranog profila; tajne ostaju serverske. |

## Ograničenja isporuke

Prvi paket u trajanju od 2–3 radna dana isporučuje se kao minimalna hibridna pretraga sa merenjem. LLM reranker, paritet performansi dve ugrađene baze i dodatni RAGAS export rade se samo ako ostane vremena; ne smeju odložiti korektnost granice matcher/retriever, baseline, embedding index i offline testove.

Izbor ugrađene baze: SQLite `node:sqlite` + `sqlite-vec@0.1.9`, kupljen/instaliran je uz korisničko odobrenje. `pnpm sqlite:smoke` i ciljane offline VectorStore testove treba/je potrebno izvesti pre oslanjanja na indeks; stvarni embeddings check i index build ostaju zasebni, eksplicitni koraci. Retrieval anotacije su assistant-authored nacrt i njihove metrike ne smeju se predstavljati kao validiran kvalitet pre ljudske adjudikacije.
