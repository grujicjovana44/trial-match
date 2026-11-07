# TrialMatch

TrialMatch je demonstraciona TypeScript veb-aplikacija za preliminarnu proveru sintetičkog profila u odnosu na kriterijume kliničkih studija za dijabetes tip 2. Prikazuje status svakog kriterijuma, podatke koji nedostaju, jedno ciljano pitanje i citate iz dostupnih odlomaka.

> **Jezički model čita pravila i objašnjava rezultat. Odluku donosi deterministički kod.**

## Bezbednosne granice

- Ovo nije alat za dijagnozu, lečenje, doziranje ni odluku o uključivanju. Konačnu odluku donosi lekar.
- Trenutna Faza 1 radi u **DEMO režimu** sa mock adapterom; ne poziva stvarni modelski provajder niti plaćeni API.
- Koristite isključivo izmišljene profile. Ne unosite stvarne podatke pacijenata.
- Studije T-A, T-B i T-C su sintetički testni primeri. Njihovi pragovi nisu klinički preporučeni.
- Nepoznata vrednost ostaje `unknown`; ne tumači se kao „da“ ili „ne“.
- Aplikacija radi sa lokalnim fajlovima i ne preuzima niti skrejpuje podatke.

## Preduslovi

- Node.js `24.22.1`
- pnpm `12.16.1`

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Zatim otvorite `http://127.0.0.1:5173`. Primer sintetičkog profila:

```text
Muškarac, 62 godine, dijabetes tip 2, HbA1c 8,1%, kreatinin 1,3 mg/dL, visina 178 cm, težina 92 kg.
```

DEMO može zatražiti dopunu, na primer podatak o upotrebi insulina. Po završenoj preliminarnoj proveri polje „Šta ako?“ ponavlja procenu u istom `runId`.

## Komande

| Komanda                            | Namena                                                          |
| ---------------------------------- | --------------------------------------------------------------- |
| `pnpm dev`                         | Lokalni DEMO server i Vite interfejs                            |
| `pnpm typecheck`                   | TypeScript provera                                              |
| `pnpm lint`                        | ESLint provera                                                  |
| `pnpm format:check`                | Provera Prettier formatiranja                                   |
| `pnpm build`                       | Serverska TypeScript kompilacija i produkcioni UI build         |
| `pnpm test`                        | Offline unit i integracioni testovi                             |
| `pnpm smoke`                       | API demo smoke test                                             |
| `pnpm eval:offline`                | Offline i simulirane fault provere; živi slučajevi se preskaču  |
| `pnpm eval:live`                   | Trenutno namerno onemogućeno; stvarni provajder nije deo Faze 1 |
| `pnpm data:prepare [ulaz] [izlaz]` | Validira lokalni JSON snimak; ne pristupa mreži                 |
| `pnpm gold:metrics`                | Izračunava izdvajanje prema malom sintetičkom zlatnom skupu     |
| `pnpm eval:compare <pre> <posle>`  | Poredi dva sačuvana rezultata po ID-ju slučaja                  |

CI pokreće samo lokalne provere, bez modelskih API poziva.

## Podaci i izvori

Poreklo i ograničenja podataka opisani su u [data/README.md](data/README.md) i [data/manifest.json](data/manifest.json). Pravi snimak nije uključen. Ako se kasnije odobri, čovek ga ručno postavlja u `data/raw/`; nijedna komanda ga ne preuzima.

Formule za eGFR, BMI i konverzije imaju izvore u kodu i potvrđene su u [docs/project-brief.md](docs/project-brief.md). Odluke i alternative su u [docs/decisions.md](docs/decisions.md).

## Dokumentacija i dokazi

- [Specifikacija](docs/spec.md)
- [Arhitektura](docs/architecture.md)
- [Bezbednost](docs/security.md)
- [Mapa podataka](docs/data-map.md)
- [Postupak evaluacije](docs/evaluation.md)
- [Mapa dokaza CAP-01–CAP-08](docs/evidence-map.md)
- [Sastav tima](docs/team.md)

Faza 1 ne uključuje stvarni model, glas, embeddings, deployment ni AC-11. Zato se njeni mock i offline rezultati ne predstavljaju kao dokaz stvarne integracije modela.
