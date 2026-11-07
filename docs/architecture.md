# Arhitektura

## Komponente

- `apps/web`: React + Vite interfejs; ne sadrži modelske ključeve.
- `apps/server`: Fastify API, validacija, orkestracija, memorijski `runId` store, lokalno pronalaženje i DEMO adapter.
- `packages/shared`: Zod šeme i tipovi ugovora.
- `data/fixtures`: manifestovani sintetički zapisi T-A, T-B i T-C.
- `eval`: fiksni slučajevi, offline/fault izvršavanje i metrike zlatnog skupa.

## Tok podataka

Unos prolazi kroz Zod/tehničku validaciju pre alata. Adapter određuje nameru i može izdvojiti samo navedena polja. Retrieval vraća izvore; matcher obrađuje samo validirane sintetičke kriterijume. Server proverava citate i `RunResponse` pre slanja odgovora. `unknown` pokreće dopunu kada je moguće; odgovor menja samo traženo polje. Hipoteza je odvojena ruta koja menja samo eksplicitno izdvojene vrednosti.

Stanje postoji samo u memoriji servera i briše se njegovim restartom. Stvarna providerska integracija nije implementirana u Fazi 1. Mock adapter ne poziva mrežu i nije dokaz za CAP-02.

## Workflow

`received` vodi u `ready`, `awaiting_input`, `completed`, `rejected` ili `failed`. Dopuna nastavlja `awaiting_input → ready`; alat može iz `ready` preći u `running_tool`, zatim u `completed`, `awaiting_input` ili `failed`. Hipotetička izmena nakon `completed` ponavlja procenu pod istim `runId`. Nepoznat/izgubljen `runId` vraća kontrolisanu HTTP 404 grešku.

## Dozvoljeni alat

Faza 1 izlaže samo `evaluate_criteria`, čiji su argumenti profil i strukturisane studije validirani zajedničkim šemama. Nepoznat alat i nevalidni argumenti odbijaju se pre handler-a. Tekst studije je podatak, ne instrukcija.
