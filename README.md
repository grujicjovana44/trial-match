# TrialMatch

TrialMatch je TypeScript veb-aplikacija za preliminarnu proveru sintetičkog profila u odnosu na kriterijume kliničkih studija za dijabetes tip 2. Prikazuje status svakog kriterijuma, podatke koji nedostaju, jedno ciljano pitanje i citate iz dostupnih odlomaka.

> **Jezički model čita pravila i objašnjava rezultat. Odluku donosi deterministički kod.**

## Bezbednosne granice

- Ovo nije alat za dijagnozu, lečenje, doziranje ni odluku o uključivanju. Konačnu odluku donosi lekar.
- Direktni server podrazumeva Gemini live režim; za lokalni razvoj `pnpm dev` eksplicitno bira mock sa `DEMO_MODE=true`. Bez serverskog ključa live režim se zaustavlja uz konfiguracionu grešku.
- Koristite isključivo izmišljene profile. Ne unosite stvarne podatke pacijenata.
- Studije T-A, T-B i T-C su sintetički testni primeri. Njihovi pragovi nisu klinički preporučeni.
- Nepoznata vrednost ostaje `unknown`; ne tumači se kao „da“ ili „ne“.
- Aplikacija radi sa lokalnim fajlovima i ne preuzima niti skrejpuje podatke.

## Preduslovi

- Node.js `24.15.0` ili noviji (`.nvmrc` bira `24.15.0`; CI proverava i `24.22.1`)
- pnpm `12.16.1`

```sh
pnpm install --frozen-lockfile
DEMO_MODE=true pnpm dev
```

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

`RAG_RERANKER=deterministic|gemini|disabled` konfiguriše drugu fazu nakon RRF-a. Gemini koristi jedan ograničen zahtev, vraća samo `{id, score}` i pri grešci ostaje RRF poredak. `pnpm eval:rag:offline` poredi četiri retrieval varijante na istim slučajevima, meri lokalno kašnjenje/paritet VectorStore-a i koristi samo lažni embedder. Predložene anotacije su dijagnostika, ne kvalitetom potvrđen dokaz. RAGAS-style TypeScript metrike su zasebne od matchera; `eval:rag:live` zahteva human-reviewed sintetički skup, approval fajl i potvrdu da cena nije dostupna.

## Podaci i izvori

Poreklo i ograničenja podataka opisani su u [data/README.md](data/README.md) i [data/manifest.json](data/manifest.json). Korisnik je dostavio jedan raw snimak u `data/raw/`; on još nije potvrđen ili uvezen u matcher. Nijedna komanda ne preuzima niti skrejpuje podatke.

Aktivni `clinicaltrials-20` demo koristi 20 T2D-povezanih ClinicalTrials.gov studija: 18 pojedinačno preuzetih 2026-11-16 i dve ranije odobrene studije. Izvori, URL-jevi, datumi, statusi i hash-evi su u [manifestu porekla](data/raw/studies_20_api_provenance_2026-11-16.json). Jovana je 2026-11-19 potvrdila 10 eksplicitnih numeričkih matcher pravila; preostalih 290 kriterijuma ostaje `manual_review` bez automatske presude. CSV-ova potvrda izvornog teksta prema Jeleninom pregledu vodi se odvojeno. Pravni pregled nije urađen; uslove korišćenja treba proveriti pre javnog objavljivanja. Ne iznosi se tvrdnja o licenci.

`pnpm demo` učitava 20 jedinstvenih studija iz paketa `data/rule_sets/studies_2_approved_20261115_1539/` i `data/rule_sets/studies_18_approved_REVIEWED/`. Corpus builder pravi 20 study dokumenata i 330 passage dokumenata; passage tekstovi uključuju kriterijume, ali ih retrieval koristi za izbor izvora, ne za presudu. Matcher zasebno obrađuje odobrena pravila, a 290 `manual_review` kriterijuma ostaje `unknown`.

Formule za eGFR, BMI i konverzije imaju izvore u kodu i potvrđene su u [docs/project-brief.md](docs/project-brief.md). Odluke i alternative su u [docs/decisions.md](docs/decisions.md).

## Dokumentacija i dokazi

- [Specifikacija](docs/spec.md)
- [Arhitektura](docs/architecture.md)
- [Bezbednost](docs/security.md)
- [Mapa podataka](docs/data-map.md)
- [Postupak evaluacije](docs/evaluation.md)
- [Mapa dokaza CAP-01–CAP-08](docs/evidence-map.md)
- [Sastav tima](docs/team.md)

Faza 2 implementacija je u toku. SQLite + sqlite-vec osnova je izabrana i jedan embeddings smoke poziv je uspeo; index build, stvarni EV baseline i browser review nisu izvršeni. RAG evaluacioni skup je nacrt koji čeka ljudsku adjudikaciju. Glas, javni deployment i AC-11 ostaju van opsega. Pogledajte [trenutnu spremnost](docs/phase-2-readiness.md).
