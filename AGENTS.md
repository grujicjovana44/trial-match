# Uputstva za agente

## Svrha

TrialMatch je TypeScript veb-aplikacija za preliminarnu proveru sintetičkih profila u odnosu na kriterijume podobnosti kliničkih studija. Nije alat za dijagnostiku, lečenje niti odlučivanje o uključivanju pacijenta.

**Jezički model čita pravila i objašnjava rezultat. Odluku donosi deterministički kod.**

Detaljan izvor zahteva je [docs/project-brief.md](docs/project-brief.md); specifikacije funkcionalnosti su u `specs/`.

## Arhitektura

pnpm monorepo razdvaja React + Vite interfejs, Fastify API, zajedničke Zod šeme i determinističku domensku logiku, kao i lokalne podatke/evaluacije. Faza 1 je DEMO režim sa mock adapterom; stvarni model nije povezan. Domen se menja zamenom paketa podataka, a ne ugrađivanjem u matcher.

## Pravila rada

- TypeScript strict; bez `any` osim uz obrazloženje u komentaru.
- Validiraj podatke na svakoj granici izvršavanja; tipovi sami po sebi nisu runtime validacija.
- Nikada ne unosi tajne; ključevi ostaju samo na serveru, a primeri idu u `.env.example`.
- Testovi i offline provere ne pozivaju plaćene API-je modela.
- Koristi samo sintetičke profile. Pravi snimak studija može postaviti čovek u `data/raw/`; ne pristupaj mreži, ne preuzimaj podatke i ne skrejpuj sajtove.
- Zadrži stabilne AC ID-jeve. Uz svaku izmenu ponašanja ažuriraj specifikaciju i prateću dokumentaciju, pa pokreni offline provere.
- Medicinske formule i pragovi moraju imati izvor i oznaku „PROVERITI prema originalnoj publikaciji“ dok ih čovek ne potvrdi.

## Provere

Komande: `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test`, `pnpm smoke`, `pnpm eval:offline`, `pnpm gold:metrics` i `pnpm data:prepare`. Pokreći samo one koje odgovaraju izmenama i prijavi tačno šta je izvršeno.
