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

## Komande i konfiguracija

Lokalni `rules:draft`, `compile:rules` CLI i `eval:live` guard-ovi su implementirani. `rules:draft` prihvata samo runtime-validne `trialmatch-import-v2` ili `trialmatch-review-draft-v1` ulaze. Preporučen je `data:split` izlaz za kriterijume izdvojene iz eligibility teksta; `data:prepare` prenosi samo kriterijume koje već sadrži. `compile:rules` radi nad prethodno uvezenim JSON-om i odbija svaku studiju bez potvrđenog ljudskog pregleda izvora i pravila. Ne praviti review zapis bez stvarnog pregleda.

Primeri offline korišćenja nakon `pnpm build`:

```sh
pnpm data:prepare data/raw/studies_50_recruiting_2026-11-12.json /tmp/trialmatch-import.json
pnpm data:split --input /tmp/trialmatch-import.json --output /tmp/trialmatch-split.json
pnpm rules:draft --input /tmp/trialmatch-split.json --output /tmp/trialmatch-rules-draft.json
pnpm rules:review-template --input /tmp/trialmatch-import.json --draft /tmp/trialmatch-rules-draft.json --output /tmp/trialmatch-reviews.json
pnpm gold:criteria eval/gold-criteria.jsonl eval/predictions/predictions.jsonl DATASET_VERSION /tmp/trialmatch-gold-metrics.json
```

`data:split` je preporučen za kriterijume iz originalnog eligibility teksta, jer `data:prepare` čuva tekst nerazdvojen. Ako se `rules:draft` pokrene direktno nad `data:prepare` izlazom, prenosi samo postojeće kriterijume. `rules:draft` niz nije review šablon: zasebni `rules:review-template` izlaz ostaje `pending_review`. Čovek i dalje mora proveriti citate i pravila, urediti kriterijume u domenski oblik, ponovo izračunati šablon posle izmena, pa dodati svoj reviewer/date. Nijedna komanda ne odobrava pravila. Izlazi paketa moraju biti nove putanje. Poreklo/licenca korpusa i ljudski review se ne zaključuju iz samog uspešnog importa.

Podrazumevani `DEMO_MODE=false`; `LLM_PROVIDER=gemini`, `LLM_MODEL=gemini-3.5-flash-lite`, `GEMINI_API_KEY` samo lokalno u serverskom okruženju. Bez ključa jasna konfiguraciona greška. Mock koristi eksplicitno `DEMO_MODE=true`; testovi/CI mock i bez mrežnog transporta. Ne kopirati ključ u komandu, razgovor, bundle ili trace.

Lokalna izgrađena verzija: `pnpm build`, zatim pokrenuti API sa `DEMO_MODE=true node dist/apps/server/src/index.js` i preview sa `pnpm preview:ui`. Podrazumevani preview proxy prosleđuje `/api` na loopback API; za drugi API origin postaviti `VITE_API_BASE_URL` pri build-u, a `WEB_ORIGIN` na tačan preview origin. Nije deployment. Browser smoke proverava i čitanje `Retry-After`; nije izvršen u ovoj sesiji. Postojeći `pnpm dev` ostaje razvojni tok i nije provera izgrađenog UI-ja.

## Proverljivi scenariji

- Mock kompletan profil, dopuna i hipoteza: isti runId i kumulativni budžet, neizmenjena nepomenuta polja, ispravne jedinice/poreklo.
- 400/413: uporediti poslovni snapshot; 429: validne sekunde; retry iste operacije nema duplog modela, failed vodi na 002 Počni iznova.
- Stvarni model + sintetički fixture: istovremeno stvarni model i sintetički skup u oznakama. Nije stvarni korpus.
- Pregledani korpus: datum/poreklo/status/faza iz manifesta; nepregledana/izmenjena pravila odbijena, manual_review unknown.
- Pre živog poziva T330 prikazuje konkretnu komandu, model, broj slučajeva i limite; sačekati eksplicitno odobrenje. Proveriti baseline rezervaciju pre slanja.
- T325 je lokalni UI pregled; T331 izvršava prvo potpuno živo evaluaciono pokretanje, a T332 je zaseban, opciono odobreni live UI smoke. Raniji mali connectivity/UI probe nisu baseline; beležiti ih i ne optimizovati fiksne slučajeve pre baseline-a. Prvi kompletan pokušaj mora biti baseline čak i ako pada.
