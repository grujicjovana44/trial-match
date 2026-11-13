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

- Node.js `24.22.1`
- pnpm `12.16.1`

```sh
pnpm install --frozen-lockfile
DEMO_MODE=true pnpm dev
```

Zatim otvorite `http://127.0.0.1:5173`. Primer sintetičkog profila:

```text
Muškarac, 62 godine, dijabetes tip 2, HbA1c 8,1%, kreatinin 1,3 mg/dL, visina 178 cm, težina 92 kg.
```

Lokalni DEMO može zatražiti dopunu, na primer podatak o upotrebi insulina. Za izgrađeni preview pokrenite API sa `DEMO_MODE=true`, napravite UI build sa `VITE_API_BASE_URL=http://127.0.0.1:3000`, pa `pnpm preview:ui`. API prihvata samo loopback origin naveden u `WEB_ORIGIN` (podrazumevano `http://127.0.0.1:4173`). Po završenoj preliminarnoj proveri polje „Šta ako?“ ponavlja procenu u istom `runId`.

## Komande

| Komanda                            | Namena                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| `pnpm dev`                         | Lokalni DEMO server i Vite interfejs                                         |
| `pnpm typecheck`                   | TypeScript provera                                                           |
| `pnpm lint`                        | ESLint provera                                                               |
| `pnpm format:check`                | Provera Prettier formatiranja                                                |
| `pnpm build`                       | Serverska TypeScript kompilacija i produkcioni UI build                      |
| `pnpm test`                        | Offline unit i integracioni testovi                                          |
| `pnpm smoke`                       | API demo smoke test                                                          |
| `pnpm eval:offline`                | Offline i simulirane fault provere; živi slučajevi se preskaču               |
| `pnpm eval:live -- ...`            | Zahteva `--confirm-live`, scope odobrenje, limits i serverski ključ          |
| `pnpm data:prepare [ulaz] [izlaz]` | Lokalno validira normalizovani skup ili uvozi CTG v2 JSON; ne pristupa mreži |
| `pnpm gold:metrics`                | Izračunava profilne mock metrike                                             |
| `pnpm gold:criteria ...`           | Izračunava odvojenu metriku ljudski označenih kriterijuma                    |
| `pnpm compile:rules ...`           | Lokalno validira i pakuje samo ljudski odobrena pravila                      |
| `pnpm rules:review-template ...`   | Pravi neodobren šablon sa source/rules hash-evima za ljudski pregled         |
| `pnpm preview:ui`                  | Lokalno servira prethodno izgrađen UI na loopback portu 4173                 |
| `pnpm eval:compare <pre> <posle>`  | Poredi dva sačuvana rezultata po ID-ju slučaja                               |

CI pokreće samo lokalne provere, bez modelskih API poziva.

## Podaci i izvori

Poreklo i ograničenja podataka opisani su u [data/README.md](data/README.md) i [data/manifest.json](data/manifest.json). Korisnik je dostavio jedan raw snimak u `data/raw/`; on još nije potvrđen ili uvezen u matcher. Nijedna komanda ne preuzima niti skrejpuje podatke.

Formule za eGFR, BMI i konverzije imaju izvore u kodu i potvrđene su u [docs/project-brief.md](docs/project-brief.md). Odluke i alternative su u [docs/decisions.md](docs/decisions.md).

## Dokumentacija i dokazi

- [Specifikacija](docs/spec.md)
- [Arhitektura](docs/architecture.md)
- [Bezbednost](docs/security.md)
- [Mapa podataka](docs/data-map.md)
- [Postupak evaluacije](docs/evaluation.md)
- [Mapa dokaza CAP-01–CAP-08](docs/evidence-map.md)
- [Sastav tima](docs/team.md)

Faza 2 implementacija je u toku; stvarni poziv modela, odobreni korpus, live baseline i browser review nisu izvršeni. Glas, embeddings, javni deployment i AC-11 ostaju van opsega. Pogledajte [trenutnu spremnost](docs/phase-2-readiness.md).
