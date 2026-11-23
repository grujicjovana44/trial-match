# TrialMatch

TrialMatch je TypeScript veb-aplikacija za preliminarnu proveru sintetičkog profila u odnosu na kriterijume kliničkih studija za dijabetes tip 2. Prikazuje status svakog kriterijuma, podatke koji nedostaju, jedno ciljano pitanje i citate iz dostupnih odlomaka.

> **Jezički model čita pravila i objašnjava rezultat. Odluku donosi deterministički kod.**

## Bezbednosne granice

- Ovo nije alat za dijagnozu, lečenje, doziranje ni odluku o uključivanju. Konačnu odluku donosi lekar.
- Direktni server podrazumeva Gemini live režim; `pnpm dev` i `pnpm demo` eksplicitno biraju mock sa `DEMO_MODE=true`, a `pnpm demo:live` stvarni model. Bez serverskog ključa live režim se zaustavlja uz konfiguracionu grešku.
- Koristite isključivo izmišljene profile. Ne unosite stvarne podatke pacijenata.
- Studije T-A, T-B i T-C su sintetički testni primeri. Njihovi pragovi nisu klinički preporučeni.
- Nepoznata vrednost ostaje `unknown`; ne tumači se kao „da“ ili „ne“.
- Aplikacija radi sa lokalnim fajlovima i ne preuzima niti skrejpuje podatke.

## Preduslovi

- Node.js `24.15.0` ili noviji (`.nvmrc` bira `24.15.0`; CI proverava i `24.22.1`)
- pnpm `12.16.1`

```sh
pnpm install --frozen-lockfile
pnpm dev          # DEMO (mock), sintetičke studije T-A, T-B, T-C
pnpm demo         # DEMO (mock), 20 studija sa ClinicalTrials.gov
pnpm demo:live    # stvarni Gemini model, 20 studija; traži .env (vidi ispod)
```

Za `pnpm demo:live` kopirajte `.env.example` u `.env` i upišite `GEMINI_API_KEY`. Opcioni `OPENAI_API_KEY` (embeddings za `hybrid` retrieval) i `COHERE_API_KEY` (reranker) poboljšavaju retrieval; bez njih se koristi leksička pretraga. Ključevi ostaju samo na serveru. Pozivi se naplaćuju, pa unosite samo sintetičke profile.

`pnpm dev` always selects the synthetic `fixtures` profile. `pnpm demo` starts the same local DEMO app with the 20-study `clinicaltrials-20` profile. Both use lexical retrieval if the local RAG index is missing or invalid; `/health` and result technical details show the active retrieval mode, and fallback is announced in the server log and result UI.

Zatim otvorite `http://127.0.0.1:5173`. Primer sintetičkog profila:

```text
Muškarac, 62 godine, dijabetes tip 2, HbA1c 8,1%, kreatinin 1,3 mg/dL, visina 178 cm, težina 92 kg.
```

Lokalni DEMO može zatražiti dopunu, na primer podatak o upotrebi insulina. Za izgrađeni preview pokrenite API sa `DEMO_MODE=true`, napravite UI build sa `VITE_API_BASE_URL=http://127.0.0.1:3000`, pa `pnpm preview:ui`. API prihvata samo loopback origin naveden u `WEB_ORIGIN` (podrazumevano `http://127.0.0.1:4173`). Po završenoj preliminarnoj proveri polje „Šta ako?“ ponavlja procenu u istom `runId`.

## Komande

| Komanda                            | Namena                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| `pnpm dev`                         | Lokalni DEMO server i Vite interfejs                                          |
| `pnpm demo`                        | Lokalni DEMO server sa 20 ClinicalTrials.gov studija                          |
| `pnpm demo:live`                   | Isti tok sa stvarnim Gemini modelom; učitava `.env`, pozivi se naplaćuju      |
| `pnpm test:e2e:phase2`             | Playwright tok kroz interfejs u DEMO režimu (bez modelskih poziva)            |
| `pnpm test:e2e:live`               | Živi UI prolaz sa stvarnim modelom; samo uz `TRIALMATCH_LIVE_E2E=confirm`     |
| `pnpm typecheck`                   | TypeScript provera                                                            |
| `pnpm lint`                        | ESLint provera                                                                |
| `pnpm format:check`                | Provera Prettier formatiranja                                                 |
| `pnpm build`                       | Serverska TypeScript kompilacija i produkcioni UI build                       |
| `pnpm test`                        | Offline unit i integracioni testovi                                           |
| `pnpm smoke`                       | API demo smoke test                                                           |
| `pnpm sqlite:smoke`                | Proverava učitavanje sqlite-vec ekstenzije i KNN upit offline                 |
| `pnpm embeddings:check`            | Jedan mali stvarni poziv za proveru embeddings pristupa                       |
| `pnpm index:build`                 | Gradi/obnavlja lokalni inkrementalni RAG indeks                               |
| `pnpm eval:offline`                | Offline i simulirane fault provere; živi slučajevi se preskaču                |
| `pnpm eval:live -- ...`            | Zahteva `--confirm-live`, scope odobrenje, limits i serverski ključ           |
| `pnpm eval:rag:offline`            | Poredi lexical/vector/hybrid/hybrid+rerank bez mrežnih poziva                 |
| `pnpm eval:rag:live -- ...`        | RAGAS sudija; zahteva sintetički pregledan skup i strogo approval ograničenje |
| `pnpm data:prepare [ulaz] [izlaz]` | Lokalno validira normalizovani skup ili uvozi CTG v2 JSON; ne pristupa mreži  |
| `pnpm gold:metrics`                | Izračunava profilne mock metrike                                              |
| `pnpm gold:criteria ...`           | Izračunava odvojenu metriku ljudski označenih kriterijuma                     |
| `pnpm compile:rules ...`           | Lokalno validira i pakuje samo ljudski odobrena pravila                       |
| `pnpm rules:review-template ...`   | Pravi neodobren šablon sa source/rules hash-evima za ljudski pregled          |
| `pnpm preview:ui`                  | Lokalno servira prethodno izgrađen UI na loopback portu 4173                  |
| `pnpm eval:compare <pre> <posle>`  | Poredi dva sačuvana rezultata po ID-ju slučaja                                |

CI pokreće samo lokalne provere, bez modelskih API poziva.

### RAG indeks (lokalno, eksplicitno)

Za pripremu indeksa bez mreže pokrenite `pnpm build`, pa `node dist/scripts/index-build.js --estimate-only`; ova opcija prikazuje broj studija, tekstova i procenjene tokene bez API ključa, baze ili embedding poziva. Trošak se prikazuje kao nedostupan dok nema proverene cene i datuma. **Stvarni `pnpm index:build` se pokreće tek nakon odobrenja.** Embeddings dozvoljava samo `text-embedding-3-small`; indeksiranje šalje javne tekstove studija/odlomaka, a retrieval samo upitne aspekte validiranog sintetičkog profila. SQLite fajl indeksa je u `data/index/` i ne commit-uje se.

`index:build` podrazumevano čita `data/trials/` i `data/fixtures/` i piše `data/index/rag.sqlite`. Za drugi korpus ponovite `--corpus-root <direktorijum>` za svaki izabrani koren i navedite zasebnu `--index-path <fajl>` putanju. Na primer, RAG v2 procena bez mrežnih poziva:

```sh
node dist/scripts/index-build.js --corpus-root data/fixtures --corpus-root data/rule_sets/studies_2_approved_20261115_1539 --index-path data/index/rag-v2-eval.sqlite --estimate-only
```

Izabrani koreni se koriste umesto podrazumevanih; sirovi import nije uključen. Eksplicitno navedena putanja indeksa koja već postoji se ne prepisuje. Korpus odbija isti `trialId` sa različitim sadržajem i navodi oba izvora; isti sadržaj se koristi jednom. Originalni kriterijumski ID, `sourceId` i `sourceQuote` ostaju neizmenjeni.

`RAG_RERANKER=cohere|deterministic|gemini|disabled` konfiguriše drugu fazu nakon RRF-a. Ako nije podešen, koristi se `cohere` u LIVE režimu kada postoji `COHERE_API_KEY`, a inače (i uvek u DEMO režimu) `disabled`; ovaj izbor sledi merenje u `docs/evaluation.md`, gde je Cohere dao najbolji redosled, a deterministički reranker lošiji od pretrage bez reranker-a. Cohere i Gemini koriste jedan ograničen zahtev, vraćaju samo `{id, score}` i pri grešci ostaje RRF poredak. `pnpm eval:rag:offline` poredi četiri retrieval varijante na istim slučajevima i meri lokalno kašnjenje/paritet VectorStore-a; podrazumevano koristi lažni embedder, a `--embedding-mode real` i `--reranker cohere` uključuju plaćene pozive i rade samo uz `--confirm-live`. Predložene anotacije su dijagnostika, ne kvalitetom potvrđen dokaz. RAGAS-style TypeScript metrike su zasebne od matchera; `eval:rag:live` zahteva human-reviewed sintetički skup, approval fajl i potvrdu da cena nije dostupna.

## Podaci i izvori

Poreklo i ograničenja podataka opisani su u [data/README.md](data/README.md) i [data/manifest.json](data/manifest.json). Korisnik je dostavio jedan raw snimak u `data/raw/`; on još nije potvrđen ili uvezen u matcher. Nijedna komanda ne preuzima niti skrejpuje podatke.

Aktivni `clinicaltrials-20` demo koristi 20 T2D-povezanih ClinicalTrials.gov studija: 18 pojedinačno preuzetih 2026-11-16 i dve ranije odobrene studije. Izvori, URL-jevi, datumi, statusi i hash-evi su u [manifestu porekla](data/raw/studies_20_api_provenance_2026-11-16.json). Jovana je 2026-11-19 potvrdila 10 numeričkih matcher pravila. Jelena je pripremila i integrisala 17 novih strukturisanih mapiranja u commitu `74a9b2d`; formalni approval zapis za njih navodi Jovanu kao `reviewer`. Konačni paket od 18 studija sadrži 300 kriterijuma: 27 `auto` i 273 `manual_review`. Kriterijum `NCT07775846#inc-5` ostaje ručni jer studija ne navodi verziju CKD-EPI formule. Za `NCT07350967#inc-2` trenutna starost je projektna zamena za starost pri pristanku, ne potvrđen istorijski podatak. Mešoviti kriterijumi, kao dijagnoza uz starost, ostaju ručni kao celina. CSV-ova potvrda izvornog teksta prema Jeleninom pregledu vodi se odvojeno. Pravni pregled nije urađen; uslove korišćenja treba proveriti pre javnog objavljivanja. Ne iznosi se tvrdnja o licenci.

`pnpm demo` učitava 20 jedinstvenih studija iz paketa `data/rule_sets/studies_2_approved_20261115_1539/` i `data/rule_sets/studies_18_approved_REVIEWED/`. Corpus builder pravi 20 study dokumenata i 330 passage dokumenata; passage tekstovi uključuju kriterijume, ali ih retrieval koristi za izbor izvora, ne za presudu. Za 18 novih studija matcher obrađuje 27 `auto` pravila, a 273 `manual_review` kriterijuma ostaju `unknown`. Aktuelni `review-report.json` ima hash-povezano odobrenje za svih 18 studija; stariji izveštaj je sačuvan zasebno. Automatska provera nije potvrda medicinske podobnosti.

Formule za eGFR, BMI i konverzije imaju izvore u kodu i potvrđene su u [docs/project-brief.md](docs/project-brief.md). Odluke i alternative su u [docs/decisions.md](docs/decisions.md).

## Dokumentacija i dokazi

- [Specifikacija](docs/spec.md)
- [Arhitektura](docs/architecture.md)
- [Bezbednost](docs/security.md)
- [Mapa podataka](docs/data-map.md)
- [Postupak evaluacije](docs/evaluation.md)
- [Mapa dokaza CAP-01–CAP-08](docs/evidence-map.md)
- [Sastav tima](docs/team.md)

## Stanje i dokazi za završnu predaju

Istorijsko stanje provereno 22. 11. 2026: aktivna grana bila je `main`, bazni HEAD `9cf7fc68e1c41b1efbe0f9d3d8e0c80516a6495c`, a tag `capstone-v1` nije postojao. Lokalna grana `security-audit-fixes` i lokalne remote reference tada su pokazivale na isti commit; remote nije osvežavan. Odobrenje novih live provera i dalje nije zabeleženo.

**CAP-08 stanje 23. 11. 2026:** [Jovana](docs/team/jovana.md) i [Jelena](docs/team/jelena.md) — **POPUNJENO I POTVRĐENO** od strane članica. [Igorova](docs/team/igor.md) postojeća beleška je popunjena; [Aleksina](docs/team/aleksa.md) beleška je popunjena, ali posebna potvrda člana nije zabeležena. Kratka podela doprinosa i statusi su u [team.md](docs/team.md). Zajednički tag još nije postavljen.

Faze 1–3 su završene. Faza 3 je dodala živu evaluaciju, ciljane izmene posle baseline-a i proveru kroz interfejs sa stvarnim modelom. Glavni dokazi:

- **Istorijski live EV rezultat:** `baseline` 13/16 → `final` 16/16 → `predaja-3` 16/16 na commit-u `a62df6b` ([eval/results/](eval/results/), [postupak](docs/evaluation.md)); nije ponovljen u današnjoj proveri.
- **Sačuvan glavni tok kroz web sa stvarnim modelom:** profil → dopunsko pitanje → rezultat sa citatom i linkom ka registru → „Šta ako?“ u istom `runId` ([eval/results/ui-live/predaja-ui-3/](eval/results/ui-live/predaja-ui-3/), snimci i `run.json`; istorijski run na commit-u `2a4e71d`).
- **Mapa dokaza** sa režimom i korpusom svakog prolaza: [docs/evidence-map.md](docs/evidence-map.md).

### Offline provera na checkout-u zasnovanom na `9cf7fc6` (22. 11. 2026)

Sa pnpm `12.16.1`: typecheck, lint, build, svih 417 testova, smoke, offline EV, gold metrike, priprema lokalnog skupa, sqlite-vec smoke, Chromium E2E (3/3) i fake/offline RAG provera su prošli. Nijedna od ovih provera nije pozvala stvarni model. Detalji režima, korpusa, izlaznih putanja i ograničenja su u [mapi dokaza](docs/evidence-map.md) i [evaluaciji](docs/evaluation.md).

Izolovan klon je napravljen iz lokalnog Git izvora u `/tmp`; frozen instalacija nije završena jer offline pnpm store nema `@types/react@19.3.0`. Nije pokušana mrežna instalacija, pa provere nisu ponovljene u tom klonu. Novi `eval/results/` artefakti su git-ignorisani i nisu deo commita; njihovi ishodi su sažeti u dokumentaciji. Ova radna kopija sadrži necommitovane izmene formatiranja i predajnih beleški; nije završna označena verzija.

### Šta drugi član može da ponovi

Bez API ključa, iz čistog checkout-a:

```sh
pnpm install --frozen-lockfile
pnpm typecheck && pnpm lint && pnpm build
pnpm test && pnpm smoke && pnpm eval:offline && pnpm gold:metrics
pnpm test:e2e:phase2      # Playwright, Microsoft Edge (E2E_BROWSER_CHANNEL za drugi kanal)
pnpm demo                 # pa http://127.0.0.1:5173
```

Sa `GEMINI_API_KEY` u `.env` (plaćeni pozivi):

```sh
pnpm demo:live
TRIALMATCH_LIVE_E2E=confirm TRIALMATCH_LIVE_LABEL=<nova-oznaka> pnpm test:e2e:live
```

U PowerShell-u se promenljive postavljaju sa `$env:TRIALMATCH_LIVE_E2E='confirm'`. Živi EV run traži i approval zapis ([docs/evaluation.md](docs/evaluation.md) → „Ponavljanje“).

Van opsega su glas u javnom deployment-u, javna dostupnost aplikacije (nalazi TM-01–TM-05 iz [bezbednosnog audita](SECURITY_AUDIT.md)) i statistička procena pouzdanosti modela, jer je svaki run pokrenut jednom.
