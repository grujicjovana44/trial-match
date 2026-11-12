# Predaja za buduće pokretanje 003

Ovo su buduće provere, ne zapis izvršenja. Prvi paket i obavezna zaustavljanja su u [handoff.md](handoff.md). Implementacija feature-a 003 radi se na Git grani `feature/003-phase-2-live-integration`.

## Postojeće komande

U implementacionoj sesiji: git status --short, git log -8, node --version i pnpm --version; uporediti Node 24.22.1 / pnpm 12.16.1. Ne pozivati mrežu ili instalaciju automatski. Po potrebi koristiti postojeće lokalne zavisnosti; ako nedostaju, prijaviti.

Redosled punih offline provera nakon implementacije:

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm smoke
pnpm eval:offline
pnpm gold:metrics
pnpm format:check
pnpm data:prepare data/fixtures/trials.json /tmp/trialmatch-003-fixtures.json
```

Poslednje tri CLI data/eval/gold zavise od prethodnog build-a (dist/). data:prepare mora imati odvojen nov izlaz, ne prepisivati korpus. Posle importera proveriti i eksplicitnu stvarnu putanju koju čovek dostavi; sintetički ulaz ne dokazuje stvarni raw format. format:check može prijaviti postojeće tuđe izmene; ne formatirati ih automatski.

## Planirane komande i konfiguracija

Nisu sada dostupne: compile:rules CLI iz [ugovora podataka](contracts/data-rules.md) i eval:live flagovi iz [evaluacionog ugovora](contracts/evaluation.md). Prvo implementirati i offline proveriti njihove guard-ove, tek onda koristiti.

Posle T313: podrazumevani DEMO_MODE=false; LLM_PROVIDER=gemini, LLM_MODEL=gemini-3.5-flash-lite, GEMINI_API_KEY samo lokalno u serverskom okruženju. Bez ključa jasna konfiguraciona greška. Mock koristi eksplicitno DEMO_MODE=true; testovi/CI mock i bez mrežnog transporta. Ne kopirati ključ u komandu, razgovor, bundle ili trace.

Lokalna izgrađena verzija: T310 dokumentuje tačnu serversku entry komandu prema build izlazu i pokretanje Vite preview na loopback-u, sa VITE_API_BASE_URL podešenim pri build-u ako su portovi različiti; API dozvoljava samo taj lokalni origin. Nije Vercel deployment. Browser smoke proverava i čitanje Retry-After. Postojeći pnpm dev ostaje razvojni tok; ne predstavljati ga kao proveru izgrađenog UI-ja.

## Proverljivi scenariji

- Mock kompletan profil, dopuna i hipoteza: isti runId i kumulativni budžet, neizmenjena nepomenuta polja, ispravne jedinice/poreklo.
- 400/413: uporediti poslovni snapshot; 429: validne sekunde; retry iste operacije nema duplog modela, failed vodi na 002 Počni iznova.
- Stvarni model + sintetički fixture: istovremeno stvarni model i sintetički skup u oznakama. Nije stvarni korpus.
- Pregledani korpus: datum/poreklo/status/faza iz manifesta; nepregledana/izmenjena pravila odbijena, manual_review unknown.
- Pre živog poziva T330 prikazuje konkretnu komandu, model, broj slučajeva i limite; sačekati eksplicitno odobrenje. Proveriti baseline rezervaciju pre slanja.
- T325 je lokalni UI pregled; T331 izvršava prvo potpuno živo evaluaciono pokretanje, a T332 je zaseban, opciono odobreni live UI smoke. Raniji mali connectivity/UI probe nisu baseline; beležiti ih i ne optimizovati fiksne slučajeve pre baseline-a. Prvi kompletan pokušaj mora biti baseline čak i ako pada.
