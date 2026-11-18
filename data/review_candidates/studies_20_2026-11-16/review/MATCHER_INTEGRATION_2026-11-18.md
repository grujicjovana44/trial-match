# TrialMatch – pripremljena integracija 18 studija (18.11.2026.)

**Šta je urađeno:** iz potvrđenog CSV-a preneto je svih 300 originalnih kriterijuma u validan `TrialSchema` draft. Tekst, izvor i citati su sačuvani. Identifikovano je 10 tehnički jednoznačnih numeričkih pravila kao `checkability: auto` **isključivo u neobjavljenom draftu**, a ostalih 290 ostaju `manual_review` (mogu se pretraživati i citirati, bez automatske presude). Polazni `studies_18_rules_draft_2026-11-16.json`, aktivni podaci i postojeća 2 odobrena zapisa ostaju netaknuti.

Potvrda izvornog sadržaja od strane Jelene: `content_review_confirmed_2026-11-18.csv`. To nije isto što i odobrenje novopredloženih `auto` pravila. Ne menjati `pending_review` u `approved` bez pregleda 10 konkretnih pravila (vrsta inclusion/exclusion, operator, prag, jedinica, izvor, granice); u odobrenju koristiti stvarni datum/vreme i reviewer, uz hash koji odgovara konačnom draftu. Ostale 290 ostaju manual/unknown.

**Datoteke:**
- `studies_18_matcher_draft_2026-11-18.json`: 18 studija, 300 kriterijuma
- `studies_18_matcher_reviews_PENDING_2026-11-18.json`: pripremljeni source/rules hash-evi i `pending_review` za sve studije
- `content_review_confirmed_2026-11-18.csv`: originalna evidencija izvorne provere

**Na tvojoj mašini, pošto potvrdiš predložene auto mape:**

```powershell
corepack pnpm build
corepack pnpm compile:rules --input data/review_candidates/studies_20_2026-11-16/import/studies_18_api_import_2026-11-16.json --draft data/review_candidates/studies_20_2026-11-16/review/studies_18_matcher_draft_2026-11-18.json --reviews data/review_candidates/studies_20_2026-11-16/review/studies_18_matcher_reviews_PENDING_2026-11-18.json --output data/rule_sets/studies_18_approved_REVIEWED
```

Poslednja komanda **sa trenutnim pending statusom namerno neće izdati paket**. Nakon provere napravi novu kopiju reviews JSON-a, upiši `approved`, `reviewer` i stvarni `reviewedAt` za svaku od 18 studija i proveri hash-eve; koristi tu novu putanju u `--reviews`. Ako se draft izmeni, regeneriši hash-eve (`rules:review-template`) i ponovi pregled. Nemoj prepisivati postojeći `studies_2_approved_20261115_1539` paket.

**Važno za UI:** `DATASET_PROFILE=clinicaltrials-20` trenutno učitava staru split verziju u `apps/server/src/service/trialmatch.ts`; novi odobreni paket se neće sam uključiti u ovaj profil. Tek posle uspešnog compile, dodatne izmene loadera i integracionih testova može da postane aktivan. Učitavanje svih 20 i prikaz citata već radi nezavisno od ovog drafta.

**Izuzeci:** `NCT07919236#exc-5` pominje GFR u mL/min, dok je predlog bio eGFR u mL/min/1.73 m² – zbog medicinski bitne razlike ostao je manual. Neizričite inclusivity granice za `between` ostale su manual dok se ne proveri semantika. `NCT07919236#inc-6` eksplicitno kaže 'both inclusive', pa se može pripremiti kao `between`.
