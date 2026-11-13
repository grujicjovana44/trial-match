# Evaluacija, ograničenja i baseline

## Izvršavanje slučajeva

`eval/cases.jsonl` ima stabilnih 16 slučajeva sa eksplicitnim režimima. EV-01–EV-10 su `real_model`; EV-11 je offline, EV-12–EV-16 su `simulated_fault`. `pnpm eval:offline` pokreće samo EV-11–EV-16. EV-07–EV-09 se dodatno beleže kao `dry_run`, preostalih sedam živih slučajeva kao `skipped`; nijedan nije PASS.

Live evaluator koristi stvarni `TrialMatchService` nad fiksnim sintetičkim `fixtures` skupom. EV-06 izvršava dopunu i eksplicitnu hipotezu pod istim `runId`. EV-07 mora završiti pitanjem o HbA1c/glukozi pre alata. EV-10 poredi matcher statuse i opažanja nad čistim i zlonamernim izvorom i proverava odbijanje alata van allowlist-e. Slučaj prolazi samo ako su sve osobine iz `expected_properties` proverene; prekinut, preskočen ili `dry_run` slučaj nije PASS.

## Live evaluator i odobrenje

Komanda je implementirana, ali nije pokretana u ovoj sesiji:

```sh
pnpm eval:live --confirm-live --label baseline --dataset fixtures --max-model-attempts <N> --max-input-tokens <N> --max-output-tokens <N> --approval <lokalni-approval.json>
```

Nema opcije za drugi dataset, drugi model ili promenjen case fajl. Runner validira `--confirm-live`, label, fiksne slučajeve/hash, approval zapis, server konfiguraciju i Gemini ključ pre mrežnog transporta. Approval ima reviewer, vreme odobrenja, provider/model, tačan process command, case hash/count i gornje granice attempts/tokens. Pokrenuta ograničenja moraju biti jednaka ili manja od odobrenih. `maxCost` mora biti `null`, a `costUnavailableAcknowledged` eksplicitan, jer lokalna cena nije dostupna za enforcement. Approval nije dozvola za izvođenje dok čovek neposredno pre pokretanja ne potvrdi konkretan opseg.

Ulazni token cap se pre svakog poziva sprovodi konzervativnom gornjom granicom UTF-8 bajtova serijalizovanog prompta/šeme/ulaza uz fiksnu rezervu; to nije precizan tokenizer. Output cap se kumulira kroz pokušaje i šalje kao provider `maxOutputTokens`. Provider usage se sabira kada ga vrati; posle odgovora bez usage metadata runner staje umesto da nastavi bez sigurnog limita. Trošak nije izračunat.

`eval/results/baseline/` se atomski rezerviše kao nov direktorijum tek posle lokalnih provera i pre kreiranja Gemini adaptera. Ako postoji, proces staje bez slanja poziva ili pisanja u njega. Manifest beleži commit/dirty hash, label, case hash, odobrene i tražene limite; `results.jsonl` i allowlist tragovi dopisuju se posle svakog slučaja. SIGINT/SIGTERM abort-uje aktivni fetch, tekući slučaj postaje `skipped`, a manifest ostaje `interrupted`. Prekinuti baseline se ne nastavlja i ne prepisuje automatski.

Trag sadrži ID slučaja/run-a, režim, model, verzije, dozvoljene evente, attempt/alate/vreme/prompt hash i dostupne tokene. Ne čuva raw profil, provider body, ključ niti model output. `eval:compare` služi za poređenje postojećih direktorijuma i ne menja ih.

## Kriterijumske metrike

`pnpm gold:metrics` ostaje osam primera profilnog mock parsera i nije modelska potvrda kriterijuma. `pnpm gold:criteria <annotations.json> <predictions.json> <datasetVersion> <new-output.json>` računa odvojene TP/FP/FN i precision/recall. Expected sadrži izvorni tekst/hash, tačnu dataset/annotation verziju i reviewer/date. Prediction nosi isti source hash i verzije; dozvoljen je samo `manual` ili `structured` metod, sa null modelVersion/traceId prema Q4. Pogrešna vrednost daje FP+FN; prazni imenitelji su `null`. Metrika se ne računa za ispražnjeni ili nevažeći skup.

Faza 2 nije kompletno izvršena dok nema nezavisnih ljudskih anotacija/predikcija, kompletnog odobrenog živog baseline-a i odvojenog stvarnog browser pregleda. Kod i mock/offline prolazi sami ne dokazuju te ishode.
