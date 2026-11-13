# Arhitektura

## Komponente

- `apps/web`: React + Vite interfejs; ne sadrži modelske ključeve.
- `apps/server`: Fastify API, validacija, orkestracija, memorijski `runId` store, lokalno pronalaženje, provider-neutral adapter i Gemini REST adapter; `DEMO_MODE=true` eksplicitno bira mock.
- `packages/shared`: Zod šeme i tipovi ugovora.
- `data/fixtures`: manifestovani sintetički zapisi T-A, T-B i T-C.
- `eval`: fiksni slučajevi, offline/fault izvršavanje i metrike zlatnog skupa.

## Tok podataka

Unos prolazi kroz Zod/tehničku validaciju pre alata. Adapter određuje nameru i može izdvojiti samo navedena polja. Retrieval vraća izvore; matcher obrađuje sintetičke fixture-e ili lokalni paket pregledanih pravila sa potvrđenom licencom. Server proverava citate i `RunResponse` pre slanja odgovora. `unknown` pokreće dopunu kada je moguće; odgovor menja samo traženo polje. Hipoteza je odvojena ruta koja menja samo eksplicitno izdvojene vrednosti.

Stanje postoji samo u memoriji servera i briše se njegovim restartom. Direktni server podrazumeva Gemini; `pnpm dev` bira lokalni mock. Run-scoped sesija beleži logičke pozive, pokušaje, alate, tokene kada su dostupni i zajednički rok. Idempotency cache i zaključavanje su process-local; restart briše run stanje.

## Workflow

`received` vodi u `ready`, `awaiting_input`, `completed`, `rejected` ili `failed`. Dopuna nastavlja `awaiting_input → ready`; alat može iz `ready` preći u `running_tool`, zatim u `completed`, `awaiting_input` ili `failed`. Hipotetička izmena nakon `completed` ponavlja procenu pod istim `runId`. Nepoznat/izgubljen `runId` vraća kontrolisanu HTTP 404 grešku.

## Dozvoljeni alat

Registar sadrži `compute_egfr`, `compute_bmi`, `evaluate_criteria` i `select_next_question`; server proverava stroge ulazne/izlazne šeme i izvršava matcher samo nad odobrenim lokalnim dataset-om. Nepoznat alat i nevalidni argumenti odbijaju se pre handler-a. Tekst studije je podatak, ne instrukcija.

## Provider i dataset granica 003

ModelSession obavija svaki logički poziv rokom po run-u, ograničenom popravkom, retry pravilom i redigovanim događajima. GeminiAdapter koristi fiksni REST endpoint; prompt ne određuje provider alate ni URL-ove. Importer radi offline, a početni izlaz označava tekst kriterijuma za ručno razdvajanje. compile:rules objavljuje samo redove čiji ljudski review odgovara trenutnim hash-evima izvora i pravila. Repo i dalje nema odobren realni korpus ni live baseline.
