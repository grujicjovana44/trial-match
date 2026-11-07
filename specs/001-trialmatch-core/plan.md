# Plan implementacije: Osnovna provera TrialMatch

**Grana**: `001-trialmatch-core` | **Datum**: 2026-11-07 | **Specifikacija**: [spec.md](spec.md)

**Ulaz**: Funkcionalna specifikacija u `specs/001-trialmatch-core/spec.md`; tehnička ograničenja iz `docs/project-brief.md`, odeljci 5–12 i 16.

## Sažetak

Planira se veb aplikacija koja prima samo sintetički profil, prikazuje poređenje sa dostupnim kriterijumima studija i daje proverljivo objašnjenje. LLM služi za izdvajanje profila i objašnjenje; deterministička logika računa izvedene vrednosti, ocenjuje kriterijume, bira pitanje i proverava izvore. Predložena organizacija je pnpm monorepo sa React + Vite klijentom, Fastify serverom i zajedničkim Zod ugovorima. Pretraga je zasnovana na metapodacima i MiniSearch-u; stanje izvršavanja ostaje u memoriji, a studijski podaci dolaze iz lokalnih fajlova. Pravila nad stvarnim studijama koriste se tek po ljudskom pregledu. Rangiranje je po presudi, udelu `met` kriterijuma, pa NCT ID normalizovanom na velika slova i rastuće leksikografski.

## Tehnički kontekst

Odgovor na pitanje i hipotetička promena profila imaju odvojene rute; hipoteza menja samo izričito navedena polja i ponavlja procenu pod istim `runId`. Izvorno pitanje koje se ne može potkrepiti dostupnim podacima vraća `insufficient_evidence/not_in_sources`, bez odgovora iz opšteg znanja. B-03 je razrešen korisnički dostavljenim i potvrđenim izvorima, formulama i kontrolnim vrednostima; granice profila su tehnički sanity check, a ne medicinski referentni opsezi.

**Jezik/verzija**: TypeScript strict; Node.js `24.22.1` LTS i pnpm `12.16.1`. Tačne verzije paketa su pinovane u `package.json`, a frozen lockfile provera je uspešno završena offline. Lokalni Node runtime treba uskladiti pre build/test-a.

**Glavne zavisnosti**: pnpm workspaces, Fastify, React, Vite, Zod, Vitest i MiniSearch — verzije su navedene u `package.json`. Frozen lockfile provera je uspešno završena offline; commit se, po korisničkom zahtevu, odlaže do prvog implementacionog prolaza.

**Granica Faze 1 i CAP-02**: Faza 1 koristi mock model-adapter radi provere toka, ugovora, validacije i fault ponašanja; time se **ne ispunjava CAP-02** za stvarni poziv modela u glavnom toku. CAP-02 ostaje otvoren do kasnije faze koja obezbedi serverski adapter stvarnog provajdera, tajne samo na serveru, runtime validaciju odgovora modela i provere glavnog toka sa stvarnim modelom. Živa evaluacija se pokreće odvojeno samo uz izričitu potvrdu troška; mock testovi se ne prikazuju kao dokaz uspešne real-model integracije.

**Skladištenje**: podaci studija i fixture-i su lokalni fajlovi. Stanje provere je u memoriji, izolovano po `runId`; restart servera ga briše. Nije predviđena baza podataka.

**Provera kvaliteta**: Vitest za unit, integracione i fault provere; jsdom + Testing Library za UI i tastaturnu navigaciju; Playwright E2E je opciono u Fazi 4, ne u Fazi 1; API smoke provera; offline evaluacija bez plaćenih modela; odvojena živa evaluacija sa izričitom potvrdom troška. CI izvršava samo offline provere.

**Ciljna platforma**: Node.js serversko okruženje i savremeni pregledač; tačan operativni sistem nije ograničen.

**Tip projekta**: veb aplikacija u pnpm monorepo strukturi, sa klijentskim interfejsom, serverom i zajedničkim ugovorima.

**Ciljevi performansi**: Konkretni kašnjenje i propusnost nisu definisani. Sistem mora poštovati ograničenja ulaza, konteksta, poziva i vremena iz konfiguracije; vrednosti i sprovođenje limita, uključujući `TOOL_TIMEOUT_MS=2000`, usaglašeni su sa AC-10 i navedeni u `research.md` i ugovorima.

**Ograničenja**: Sintetički profili; bez mrežnog pristupa pri pripremi podataka; nema stvarnog upisa, dijagnoze ili saveta; deterministička procena; trovalentni statusi; samo izvori dostupni u tom izvršavanju; najviše jedan pokušaj popravke strukturisanog izlaza u zajedničkom omotaču `generateStructured`; mrežni retry samo za model timeout/429/5xx; determinističke greške alata se ne retry-uju i alatni poziv ima `TOOL_TIMEOUT_MS=2000`; bez tajni u repozitorijumu ili trace-u.

**Obim**: Lokalni snimak može sadržati oko 50–100 zapisa, a demo korpus oko 15–20 ručno pregledanih studija prema brief-u. Osnovna evaluacija ima 16 fiksnih slučajeva. Broj korisnika, paralelnih izvršavanja i veličina snimka nisu dalje definisani.

## Provera usklađenosti sa konstitucijom

**Pre istraživanja — prolazi.** Plan zadržava sledeće obavezne granice:

- LLM izdvaja i objašnjava; matcher, numerički proračuni, izbor pitanja i provera citata ostaju deterministički.
- `met`, `not_met` i `unknown` ostaju odvojeni; odsutan ili nejasan podatak ne dobija podrazumevanu vrednost.
- Nijedan rezultat ne odlučuje o podobnosti, dijagnozi ili lečenju; lekar donosi odluku.
- Klijentski, serverski, modelom proizvedeni i datotečni podaci validiraju se tokom izvršavanja.
- Sintetički profili su jedini dozvoljeni profili. Sirovi studijski snimak ručno postavlja čovek; plan ne zahteva mrežni pristup.
- Citati su ograničeni na odlomke dostupne u tekućoj proveri, a nepouzdan tekst ne može da dodeli ovlašćenja.
- Fiksni evaluacioni skup i nepromenljivi baseline čuvaju se odvojeno; neuspehi i regresije se ne prikrivaju.
- Svaki zahtev ostaje povezan sa stabilnim AC ID-jem; specifikacija se ne menja ovim planom.
- Bez dodatnih opcionih funkcija i bez proširenja AC-11 u osnovnu verziju.

**Ponovna provera posle dizajna — dizajn i lockfile usklađeni; runtime dostupnost preostaje.** Interfejsi omogućavaju zamenu adaptera ili retriever-a bez prenosa odlučivanja na model. B-03 je razrešen, a lockfile prolazi offline frozen proveru. Pre build/test izvršavanja treba obezbediti lokalni Node.js `24.22.1` umesto trenutno dostupnog `24.20.0`; nema potrebe da se lockfile ponovo generiše ako se manifest ne promeni. Izbor živog modela i uslovi korišćenja stvarnog snimka pripadaju Fazi 2.

## Struktura projekta

### Dokumentacija funkcionalnosti

```text
specs/001-trialmatch-core/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── api.md
    └── ai-rag-tools.md
```

### Izvorni kod i projektni podaci

```text
package.json
pnpm-workspace.yaml
pnpm-lock.yaml
tsconfig.base.json
.nvmrc
.env.example
.github/workflows/ci.yml
apps/
├── server/src/
│   ├── api/             # HTTP granica i mapiranje kontrolisanih grešaka
│   ├── config/          # validirana konfiguracija i limiti
│   ├── workflow/        # stanja i nastavak istog izvršavanja
│   ├── llm/             # mock i provajderski adapter
│   ├── extraction/      # profil i namera
│   ├── derived/         # normalizacija jedinica, eGFR i BMI
│   ├── retrieval/       # filtriranje, MiniSearch i rerangiranje
│   ├── matcher/         # deterministička trovalentna procena
│   ├── questions/       # izbor pitanja
│   ├── citations/       # provera dostupnosti i teksta izvora
│   ├── grounding/       # numerička provera objašnjenja
│   ├── tools/           # dozvoljeni alati i izvršavanje
│   ├── safety/          # ograničenja i bezbedno rukovanje sadržajem
│   ├── trace/           # redigovani tragovi
│   └── store/           # izolovana stanja u memoriji
└── web/src/             # React + Vite korisnički tok i prikaz rezultata
packages/shared/         # Zod šeme i ugovoreni tipovi
scripts/
├── prepare-trials.ts    # offline priprema snimka
└── compile-rules.ts     # predlozi pravila za ljudski pregled
data/
├── raw/                 # ručno postavljen sirovi snimak
├── trials/              # normalizovani studijski zapisi
├── fixtures/            # odvojeni sintetički evaluacioni primeri
└── manifest.json        # poreklo/verzija/ograničenja
prompts/                 # verzionisani promptovi
eval/
├── cases.jsonl          # 16 fiksnih evaluacionih slučajeva
├── runner/              # offline, live i poređenje
├── results/             # rezultati; baseline je nepromenljiv
└── traces/              # tragovi evaluacije
```

Testovi se smeštaju u `apps/server/test/` (unit, contract, integration i smoke), `apps/web/test/` (unit i UI integration, jsdom + Testing Library), `packages/shared/test/`, `scripts/test/` i `eval/runner/test/`.

**Odluka o strukturi**: Koristi se struktura monorepo-a iz brief-a uz podelu na `apps/server`, `apps/web` i `packages/shared`. Serverske odgovornosti ostaju razdvojene po domenskim granicama; studijski korpus i sintetičke fixture-i su zasebni skupovi. Stvarni profili nisu deo studijskih datoteka i ne upisuju se u njih.

## Složenost

Nema odstupanja od konstitucije koje zahtevaju dodatno obrazloženje. Odabrani stek i komponente navedeni su u zahtevu i brief-u; nisu predložene baza, vektorska baza, deployment, višekorisničke uloge ni dodatni agenti.
