# Arhitektura

## Komponente

- `apps/web`: React + Vite interfejs; ne sadrži modelske ključeve.
- `apps/server`: Fastify API, validacija, orkestracija, memorijski `runId` store, lokalno pronalaženje, provider-neutral adapter i Gemini REST adapter; `DEMO_MODE=true` eksplicitno bira mock.
- `packages/shared`: Zod šeme i tipovi ugovora.
- `data/fixtures`: manifestovani sintetički zapisi T-A, T-B i T-C.
- `eval`: fiksni slučajevi, offline/fault izvršavanje i metrike zlatnog skupa.

## Tok podataka

Unos prolazi kroz Zod/tehničku validaciju pre alata. Adapter određuje nameru i može izdvojiti samo navedena polja. Retrieval vraća izvore; matcher obrađuje sintetičke fixture-e ili lokalni paket pregledanih pravila sa potvrđenom licencom. Server proverava citate i `RunResponse` pre slanja odgovora. `unknown` pokreće dopunu kada je moguće; odgovor menja samo traženo polje. Hipoteza je odvojena ruta koja menja samo eksplicitno izdvojene vrednosti.

Stanje postoji samo u memoriji servera i briše se njegovim restartom. Run zapisi ističu posle 30 minuta i store zadržava najviše 1.000 zapisa; uklanjanje run-a uklanja i njegovu sesiju i izvedeni cache. Direktni server podrazumeva Gemini; `pnpm dev` bira lokalni mock. Run-scoped sesija beleži logičke pozive, pokušaje, alate, tokene kada su dostupni i zajednički rok. Idempotency cache i zaključavanje su process-local; idempotency zapisi imaju rok od 60 sekundi, a revisions se uklanjaju kada se red operacija za run isprazni.

## Workflow

`received` vodi u `ready`, `awaiting_input`, `completed`, `rejected` ili `failed`. Dopuna nastavlja `awaiting_input → ready`; alat može iz `ready` preći u `running_tool`, zatim u `completed`, `awaiting_input` ili `failed`. Hipotetička izmena nakon `completed` ponavlja procenu pod istim `runId`. Nepoznat/izgubljen `runId` vraća kontrolisanu HTTP 404 grešku.

## Dozvoljeni alat

Registar sadrži `compute_egfr`, `compute_bmi`, `evaluate_criteria` i `select_next_question`; server proverava stroge ulazne/izlazne šeme i izvršava matcher samo nad odobrenim lokalnim dataset-om. Nepoznat alat i nevalidni argumenti odbijaju se pre handler-a. Tekst studije je podatak, ne instrukcija.

## Provider i dataset granica 003

ModelSession obavija svaki logički poziv rokom po run-u, ograničenom popravkom, retry pravilom i redigovanim događajima. GeminiAdapter koristi fiksni REST endpoint; prompt ne određuje provider alate ni URL-ove. Importer radi offline, a početni izlaz označava tekst kriterijuma za ručno razdvajanje. `compile:rules` objavljuje samo redove čiji ljudski review odgovara trenutnim hash-evima izvora i pravila. Repo sadrži lokalni paket sa review metapodacima, ali njihov identitet/licenca nisu nezavisno potvrđeni; stvarni EV baseline nije pokrenut.

## RAG retrieval — Faza 2

`HybridTrialRetriever` prima `ProfileSchema` validiran profil i odobrene lokalne studije. Upit se pravi od strukturisanih dijagnoza preko verzionisanog srpsko-engleskog rečnika (`sr-en-clinical-v1`); sirovi profilni tekst i ostala polja profila se ne šalju embeddings endpoint-u. Bez pretraživog termina nema embeddings poziva: vraćaju se studije po stabilnom ID redosledu do `maxCandidates`.

Korpusni dokumenti se grade odvojeno za nivo studije (naslov, stanja, sažetak) i kriterijumski odlomak. MiniSearch i vektorski rezultati se spajaju Reciprocal Rank Fusion-om. `VectorStore` ugovor ima memorijsku i lokalnu SQLite + `sqlite-vec` implementaciju; tačan L2 pregled je deterministički, a razrešenje izjednačenja radi po ID-ju u aplikaciji. `data/index/` sadrži generisane fajlove i nije deo repozitorijuma.

Retrieval bira samo studije; matcher dobija sve pregledane kriterijume izabranih studija. Odlomci retrieval-a utiču na kontekst, ne na presude. U kontekst uključeni studijski tekst ostaje nepouzdan, a postojeća serverska provera citata ostaje na snazi. Metadata filteri, zaseban deterministic reranker i puna poredbena/offline RAG evaluacija još nisu završeni.

Embeddings koristi samo `text-embedding-3-small`. Pri indeksiranju šalju se javni tekstovi studija (naslov, stanja, sažetak i criterion `sourceQuote`); pri pretrazi se šalje samo normalizovani upit izveden iz sintetičkog validiranog profila. API ključ ostaje u serverskom okruženju. Testovi koriste deterministički lažni embedder. Jedan `embeddings:check` sintetički poziv uspeo je; `index:build` i EV baseline nisu pokrenuti.
