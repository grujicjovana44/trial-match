# Spremnost za Fazu 2 — implementaciona sesija 2026-11-12

Ovo beleži stvarno lokalno stanje ove implementacione sesije. Početno stanje pre izmena bilo je HEAD `990b4fb` uz prethodno postojeće korisničke izmene `.github/workflows/ci.yml`, `plan/` i dostavljeni raw snapshot. Te postojeće izmene nisu menjane.

## Polazne provere pre implementacije

Runtime: `node v24.20.0` (plan traži 24.22.1); lokalni pnpm `12.16.1` (plan traži 12.16.1). Obični launcher `pnpm` nije radio jer je pokušao da zaključa package-manager engine store van dozvoljenog filesystem-a. Komande su zatim pokrenute lokalnim, već instaliranim pnpm 12.16.1 putem direktne putanje; instalacija i mreža nisu korišćene.

| Komanda             | Ishod polaznog stanja                                                                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`    | PASS                                                                                                                                                              |
| `pnpm lint`         | PASS                                                                                                                                                              |
| `pnpm test`         | PASS — 44 test fajla, 163 testa                                                                                                                                   |
| `pnpm build`        | PASS                                                                                                                                                              |
| `pnpm smoke`        | PASS                                                                                                                                                              |
| `pnpm eval:offline` | BLOKIRANO okruženjem — runner je završio offline slučajeve, ali `spawnSync git` dobija `EPERM`; stdout je sadržao HEAD `990b4fbc2ba8094544e9c3f48767f26a7386cd73` |
| `pnpm gold:metrics` | PASS                                                                                                                                                              |
| `pnpm format:check` | FAIL — prethodno postojeće razlike u raw JSON-u, evidence/readiness dokumentima i `plan/prompt_plan.md`                                                           |

Polazni `eval:offline` koristio je `dist/` iz upravo prethodne uspešne build komande. Polazni izveštaji su sačuvani van repozitorijuma u `/tmp/trialmatch-003-checks/`.

## Implementirano u radnoj kopiji

Zajednički ugovor sada ima kalendarski datum, manifest, finalne API greške, poreklo opažene vrednosti/jedinicu, status/fazu studije, metapodatke provider/model i `excludedTrials`. API učitava manifest pri startu, ograničava UTF-8 telo uz granicu znakova, centralno validira odgovore, vraća `Retry-After`, omogućava loopback CORS i koristi idempotency ključ plus run lock.

Servis prima provider-neutral adapter. Dodati su Gemini REST adapter, serverski config sa live podrazumevanim režimom i eksplicitnim DEMO režimom, verzionisani promptovi, validirani/evidentirani pozivi, attempt/token brojači, rokovi i jedan repair pokušaj. Alatni registar sadrži eGFR, BMI, kriterijume i izbor pitanja; deterministički matcher čita izvedeni snapshot. UI prikazuje izvorno poreklo, jedinice, dataset origin/date, study status/phase i razloge isključenja.

Offline importer prepoznaje CTG v2 `studies` envelope, čuva originalne odlomke/hash-eve, status/fazu i probleme redova; pripremljen je lokalni `compile:rules` koji prima isključivo čovekom odobrena pravila. Dodati su odvojena kriterijumska gold metrika i strogo čuvani live-eval guardovi/rezultati.

Implementacija je prošla statičke i offline evaluacione provere navedene ispod; test-suite i API smoke nisu pokrenuti u ovoj sesiji. To ne zatvara zadatke koji traže testove, pregled u browser-u, ljudsko odobrenje pravila ili stvarni model.

## Završne provere posle izmena

Pokrenuto lokalnim pnpm 12.16.1, bez instalacije i mreže:

| Komanda / provera                                                                                      | Rezultat                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`                                                                                       | PASS                                                                                                                                                                                                                                                                               |
| `pnpm lint`                                                                                            | PASS                                                                                                                                                                                                                                                                               |
| `pnpm build`                                                                                           | PASS; Vite upozorava da je jedan JS chunk 500.13 kB, malo iznad podrazumevanih 500 kB                                                                                                                                                                                              |
| `pnpm eval:offline`                                                                                    | PASS; poslednje pokretanje posle izmene EV-02: 6 offline/fault slučajeva prošlo, 0 palo; 7 real-model slučajeva preskočeno i 3 dry-run; artifact je pod `eval/results/offline-2026-11-12T02-16-35.799Z-80b29912/`; git commit je `unavailable` jer sandbox odbija `git` subprocess |
| `pnpm gold:metrics`                                                                                    | PASS; 8 sintetičkih primera, TP=8, FP=0, FN=2, preciznost 1, odziv 0,8; nije statistička ni modelska potvrda                                                                                                                                                                       |
| `pnpm data:prepare data/fixtures/trials.json /tmp/trialmatch-003-fixtures-final2.json`                 | PASS; 3 fixture studije                                                                                                                                                                                                                                                            |
| `pnpm data:prepare data/raw/studies_50_recruiting_2026-11-12.json /tmp/trialmatch-003-raw-final3.json` | PASS; 50/50 prihvaćeno, 0 problema, svih 50 čeka ručno razdvajanje kriterijuma, `nextPageToken` je prisutan; jedinstvene nepoznate metadata putanje su prijavljene                                                                                                                 |
| Built UI bundle secret scan                                                                            | Nema poklapanja za `GEMINI_API_KEY` niti prepoznati API-key format                                                                                                                                                                                                                 |
| `pnpm format:check`                                                                                    | FAIL samo za netaknute `data/raw/studies_50_recruiting_2026-11-12.json` i `plan/prompt_plan.md`; izmenjeni kod i dokumentacija su formatirani                                                                                                                                      |
| `pnpm test`, `pnpm smoke`                                                                              | NISU POKRENUTI; ova sesija je ograničila izvršavanje test komandi                                                                                                                                                                                                                  |

Kriterijumski compiler i generator review šablona su implementirani, ali nema ljudski pregledanog draft-a za bezbedan success run; `compile:rules` nije korišćen za fabrikovanje odobrenja. Pregledani paket, live adapter call, live baseline i UI browser smoke ostaju neizvršeni.

## Otvoreni ljudski i plaćeni koraci

- Potvrditi endpoint/izvoz, query/filtere, paginaciju i licencu/uslove za dostavljeni raw snapshot. Importer ne izmišlja ova polja.
- Ručno razdvojiti i odobriti pravila za izabrane studije, sa reviewer, datumom i tačnim hash-evima. Trenutno nema odobrenog paketa.
- Ne postoje čovekove gold kriterijumske oznake; zato nema objavljive preciznosti/odziva.
- Gemini ključ nije konfigurisan u repozitorijumu (i ne treba da bude). Nije bilo live transporta ni plaćenog modelskog poziva.
- Prvi evaluacioni baseline i odvojeni UI live smoke traže sopstveno prethodno odobrenje; nisu izvršeni.
- Nije evidentiran stvarni UI pregled u browser-u.
- Formula/prag nije menjan; T336 se ne aktivira.

Status je „offline implementacija izgrađena i evaluator spreman uz otvorene dokaze i ljudske korake“, a ne „Faza 2 izvršena sa baseline-om“.
