# Plan implementacije: Faza 2, stvarna integracija

**Funkcionalnost**: 003-phase-2-live-integration | **Datum**: 2026-11-12 | [Specifikacija](spec.md)

Implementacija funkcionalnosti 003 radi se na Git grani `feature/003-phase-2-live-integration`. Grana je kreirana i trenutno je aktivna radna grana; izmene ove funkcionalnosti ne ciljaju `main`.

## Sažetak

Dopuniti postojeći sistem počev od B ugovora, zatim uključiti C adapter/alate i C/D pregledani korpus, povezati A i pripremiti D evaluator pre prvog punog živog pokretanja. Q2–Q5 su razrešena odgovorima korisnika. Buduće odgovornosti iz Q1 i ljudski unosi ostaju otvoreni; plaćeni koraci nisu odobreni. Sirovi JSON sa 50 studija je dostavljen; poreklo snimka i ljudski pregled ostaju otvoreni. Detalji i alternative su u [research.md](research.md).

## Tehnički kontekst

TypeScript strict, Node 24.22.1, pnpm 12.16.1; pinovane verzije u package.json ostaju. Fastify 5.12.5, React 19.3.1, Vite 8.3.5, Zod 4.6.7, MiniSearch 7.2.0, Vitest 5.0.5; postojeći motion ostaje. Model: Gemini `gemini-3.5-flash-lite`; planirati Node fetch prema zvaničnom REST generateContent ugovoru bez nove SDK zavisnosti. Budući OpenAI adapter nije deo ove isporuke. Testovi su Vitest i jsdom/Testing Library, bez mreže; pravi pregledač je zasebna ručna provera.

Platforma je lokalni Node proces i pregledač. Memorijski store gubi stanje pri restartu. Podaci/odobrenja/evaluacije su lokalni verzionisani fajlovi. Nema baze, javnog hostinga ni distribuiranog store-a. Obim: 50–100 sirovih (trenutno dostavljen je `data/raw/studies_50_recruiting_2026-11-12.json` sa 50 redova), oko 15–20 odobrenih studija, oko 30 kriterijumskih oznaka, 16 EV slučajeva nad fixture-ima. Ograničenja su F2-06; 002 indikator do 1 s i upotrebljivih 50 sintetičkih kartica do 1 s ostaju UI provere, ne obim matchera.

## Provera konstitucije

| Princip | Pre istraživanja / posle dizajna | Sprovođenje |
|---|---|---|
| I kod odlučuje | Usklađeno / usklađeno | Adapter nema presude; izvedeni snapshot i četiri deterministička alata. |
| II unknown | Usklađeno / usklađeno | Nema podrazumevanih profilnih vrednosti; manual_review ostaje unknown. |
| III bezbednost | Usklađeno / usklađeno | Odbijanje pre alata; formule već potvrđene; nove čekaju čoveka. |
| IV validacija | Usklađeno / planirana | Strogi Zod na HTTP/model/tool/fajl/config granicama; testovi pre tvrdnje o ispunjenosti. |
| V dokazi | Usklađeno / planirano | Rezervacija prvog baseline-a, neuspehi i prekidi ostaju, odvojene metrike. |
| VI tajne/podaci | Usklađeno / usklađeno | Sintetički profili, serverski ključ, lokalni snimak od čoveka, bez mreže u proverama. |
| VII jednostavnost | Usklađeno / usklađeno | Jedan izabrani adapter, bez dodatnih domena/usluga/deployment-a. |
| VIII stabilni ID | Usklađeno / usklađeno | AC/EV ostaju, nova lokalna F2 oznaka i T301+; mapiranje u readiness. |
| IX dokumentacija | Usklađeno / planirano | Svaki paket ažurira spec/dokaze prema stvarnom rezultatu. |

Nema odobrenih odstupanja od konstitucije. Ljudski unosi nisu „prolaz“ pune spremnosti. Korisnički prompt dozvoljava nezavisni dizajn uz označene blokatore, i ima prednost nad pravilom veštine plan da sve nepoznato mora biti razrešeno pre izlaza.

## Struktura projekta

Dokumentacija 003: spec, research, plan, data-model, tasks, quickstart, handoff, analysis, checklists/requirements i pet ugovora u contracts/.

| Komponente / budući fajlovi | Promena i granica |
|---|---|
| packages/shared/src/index.ts | Meta, manifest, observed poreklo, excludedTrials, kategorije; verzija šeme; strogi ugovori. |
| apps/server/src/api/app.ts, config/index.ts | Validirani omotači, Retry-After, async rute, eksplicitan režim po Q5, istinit health; bez tajni. |
| service/trialmatch.ts, store/run-store.ts, budget/run-budget.ts | Run-scoped adapter kontekst, kumulativni dnevnik, zaključavanje po runId/reviziji, deadline i abort; oporavak iz 002 uz terminalni failed i memorijsku zaštitu identiteta operacije. |
| llm/adapter.ts, llm/provider-adapter.ts, llm/generate-structured.ts | Novi provider-neutral interfejs i izabrana implementacija; postojeći mock ostaje; Gemini REST implementacija bez SDK-a. |
| tools/executor.ts, derived/, matcher/, questions/, retrieval/ | Četiri stvarna alata; snapshot izvedenih vrednosti; deterministički izbor, filteri i kontekst. |
| citations/verify.ts, grounding/numeric.ts, trace/redact.ts | Provera izvora konkretnog poziva, ograničene tvrdnje, brojevi i stvarni redigovani događaji. |
| scripts/prepare-trials.ts, scripts/compile-rules.ts | Lokalni importer i validacija/pregled pravila, bez automatskog preuzimanja. |
| prompts/extract_profile.v1, explain_results.v1 | Verziji promptova i hash-evi su povezani sa trace-om; model ne računa i ne donosi presudu. |
| data/raw/, trials/, manifest.json, eval/gold-criteria.jsonl | Čovek daje snimak/pregled; postojeći fixture i profilni gold se ne zamenjuju. |
| apps/web/src/api/, state/, components/, result-view-model.ts, copy.ts | Novi ugovor uz postojeći dizajn; sintetičnost odvojena od modela; A vlasništvo. |
| eval/runner/live.ts, cli.ts, results.ts, gold-metrics.ts | Stvarni aplikacioni tok, rezervacija/upis/prekid, odvojene metrike; CI ostaje offline. |

Testovi se dodaju uz postojeće *.test.ts module i u apps/server/test/{contract,integration}, apps/web/test/, scripts/ i eval/runner/. Ne kopirati nepostojeće istorijske test putanje iz 001.

## Redosled i kompatibilnost

1. **B prvi paket — T301–T310**: polazne offline provere, shared ugovori i server/API, isključenja, 429, provenance i lokalni build serve. Ne zahteva model, raw snapshot ili plaćeni poziv.
2. **B/C adapteri/alati — T311–T316**: kumulativni budžet/trace, provider-neutral adapter, Gemini REST i verzionisani extract/explain promptovi, četiri stvarna alata, retrieval/citation provera. Testovi ostaju offline/mock; stvarni model test se odobrava naknadno.
3. **C/D podaci i gold — T317–T323**: proveriti v2 importer sintetički i nad dostavljenim fajlom; čovek potvrđuje metapodatke/paginaciju/uslove i odobrava tačna pravila; compile:rules ostaje samo lokalni; metrika i ljudski kriterijumski skup su odvojeni od profilnog gold-a.
4. **A povezivanje — T324–T325**: prikaz novih API polja i local built preview. T220/T221/T232 iz 002 zatvaraju se jednim dokazom 003; T244 live-mode smoke je zaseban, opciono odobreni T332. A ne dodeljuje se automatski Aleksi.
5. **D evaluacija — T326–T335**: evaluator guardovi, EV oracle freeze, rezervacija baseline-a, key/approval i prvi potpuni baseline, zatim zaseban opcioni UI smoke, dokumentacija i offline provere. T331 je prvi kompletan EV baseline; T332 live UI smoke je zaseban scope i oba zahtevaju sopstveno prethodno odobrenje. T336 se traži samo ako se uvede ili promeni formula/prag.

Spec shared/client/server se menja koordinisano: stroga stara šema odbija nova polja, zato ih uvesti u isti paket uz kompatibilne test fixtures. Nova schema/dataset verzija beleže se; nema tvrdnje o kompatibilnosti starog zasebno izgrađenog klijenta. Za `insufficient_evidence` zadržati `results=[]`, dodati `excludedTrials` samo za no_matching_trial (inače prazno). Prazan skup izvora ne proizvodi izmišljena isključenja.

Stroga stara šema odbija dodata polja: server i shared menjaju se zajedno, a postojeći UI koristi novi shared import i dobija testove kompatibilnosti u prvom B paketu bez redizajna. Nova verzija šeme i dataset verzije se beleže; nema tvrdnje o kompatibilnosti starog zasebno izgrađenog klijenta. Za `insufficient_evidence` zadržati `results=[]`, dodati `excludedTrials` samo za no_matching_trial (inače prazno). Prazan skup izvora ne proizvodi izmišljena isključenja.

## Rizici i provere

Najveći rizici su dvostruki async zahtevi, skrivena potrošnja pri odbijenoj hipotezi, računanje alata više puta, preširoka allowlist izvora, odobrenje starih pravila posle izmene i baseline koji se rezerviše prekasno. Ugovori definišu testove za svaki rizik. Rok uključuje čekanje korisnika; demo od tri minuta može prevazići 60 s za jedan run, pa ručni pregled mora prijaviti timeout, ne povećati limit potajno.

Završni ishodi implementacione sesije i tačne putanje artefakata su u [readiness evidenciji](../../docs/phase-2-readiness.md): typecheck, lint, build, eval:offline, gold:metrics, fixture/raw data:prepare i UI secret scan su izvršeni. `test`/`smoke` nisu pokrenuti, `format:check` prijavljuje samo netaknute raw snapshot i `plan/prompt_plan.md`, a `compile:rules` nije dobio ljudski pregledane ulaze. Live adapter/baseline i browser smoke nisu pokretani. Matrica komandi je u quickstart.md.

## Složenost

Zadržava se postojeći monorepo. Jedino opravdano novo stanje su run-scoped budžet/revizija/zaštita dupliranja, evidencija pregleda i trajni evaluacioni zapis. Ne uvode se baza, agentski okvir ili alternativni deployment.
