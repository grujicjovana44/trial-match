# Model podataka 003 — planirana proširenja

Svi objekti na granici imaju stroge runtime šeme; nepoznati ključevi su greška, ne tiho uklonjeni. Brojevi su konačni. Postojeća profilna polja, trovalentna logika, formula/reference i odsutne vrednosti zadržavaju značenje. Nova verzija shared šeme beleži se u metapodacima; ne menjati postojeće fixture-e da liče na stvarni korpus.

## Manifest i pregledani korpus

`DatasetManifest`: `name`, `version`, `date` (validan kalendarski YYYY-MM-DD ili null), `origin`, `synthetic:boolean`, `license`/status pregleda uslova, `transformations`, `limitations[]`; za stvarni snimak `downloadDate`, `queryParameters`, `downloadedCount`, `includedCount`, `sourceHash`, `rulesVersion`. Brojevi su nenegativni celi, includedCount ≤ downloadedCount. Sintetički manifest ne dobija izmišljeni datum preuzimanja/CT.gov poreklo; njegov postojeći date ostaje datum sintetičkog skupa.

`SourcePassage`: trialId, sourceId (`<NCT>#inc-<n>`/`#exc-<n>`), originalni text, sourceVersion/hash i lokacija u originalu. Promena teksta menja verziju, ne nasleđuje odobrenje. NCT je normalizovan u velika slova i proverava se format; fixture T-A/B/C su eksplicitni zasebni skup.

`Trial`: postojeći naslov/stanja/lokacije/tekst; `overallStatus:string|null`, `phases:string[]` u normalizovanom modelu, jer stvarni izvor može imati više faza. Tačno mapiranje raw polja čeka fajl. API `phase:string|null` je deterministički spoj izvornog niza u izvornom redosledu, bez izmišljanja kliničkog značenja; prazno daje null. Import report čuva izvorni niz.

`RuleReview`: `status=draft|needs_manual_split|pending_review|approved|rejected`, reviewer (obavezno neprazno za approved/rejected), reviewedAt, sourceHash, rulesHash, rulesVersion, notes. Samo approved sa tačnim trenutnim hash-ovima dozvoljava studiju matcher-u. `manual_review` je proverljivost kriterijuma, ne status ljudskog odobrenja pravila: odobreno pravilo i dalje može biti unknown.

Nepodržan kriterijum ima varijantu pravila `checkability:manual_review`, originalni tekst/izvor i obrazloženje; nema izmišljenog field/operator/value samo da prođe stara šema. Automatska varijanta validira saglasnost polja, operatora, vrednosti i jedinice. `between` ima tačno dve rastuće granice. Zadržati svaki originalni kriterijum i uključivanje/isključivanje.

## Rezultat API-ja

`meta` zadržava postojeća polja i dodaje `dataSnapshotDate:string|null`, `dataOrigin:string`, `dataSynthetic:boolean`, `providerId:string`, `modelAttempts:integer>=0`. `modelId` odgovara stvarno izabranom adapteru, `tokens` je null ako ukupna potrošnja nije poznata; događaji mogu imati parcijalne usage podatke, bez predstavljanja parcijalnog zbira kao ukupnog. Verzije promptova po pozivu su u trace-u, postojeći promptVersion označava verziju paketa promptova. durationMs meri kumulativno proteklo vreme od createdAt.

`TrialResult` dodaje `overallStatus:string|null`, `phase:string|null`. `CriterionResult` dodaje `observedUnit:string|null`, `observedOrigin=profile|derived|unknown`; unknown nema opaženu vrednost/jedinicu. Poznata vrednost bez merne jedinice (boolean, kategorija) ima unit=null. Za derived mora postojati validiran `DerivedValue` i formula/reference. `profile.provenance` ostaje `origin=initial_input|answer|hypothesis`, `round>=0`; ovo se ne zamenjuje sa observedOrigin.

`RunResponse.excludedTrials:TrialResult[]` obavezan u svim statusima: samo `insufficient_evidence/no_matching_trial` sme imati stavke, sve sa verdict=excluded i najmanje jednim not_met razlogom; njegov results ostaje []. U ostalim statusima excludedTrials=[]; ok može i dalje sadržati isključene studije u results po postojećem ugovoru. `not_in_sources` nema ni results ni excludedTrials. To razdvaja nema izvora od postojećih izvora koji dokazuju isključenje.

## Izvršavanje i evidencija resursa

Poslovni snapshot: runId, revision, stage, profile/provenance, question, results, derived snapshot, source versions. Resursni dnevnik: createdAt/deadlineAt, logicalModelCalls, modelAttempts, toolCalls, questionRounds, events i opciona usage evidencija. Resursni dnevnik se nikad ne vraća unazad zbog neuspeha validacije ili transporta. Snapshot se menja atomski tek nakon validacije; 400/413 ne menja njegov sadržaj.

Izvedeni snapshot je vezan za relevantne ulazne vrednosti: eGFR age/sex/creatinine, BMI height/weight. Promena drugog polja ne zahteva novi obračun; nema keša između run-ova. Alatni i modelski budžet važe kroz ceo run, dopune i hipoteze. Cache hit nije novi alatni poziv, trace to razlikuje.

Dozvoljeni postojeći prelazi: received → ready/awaiting_input/completed/rejected/failed; ready → running_tool/awaiting_input/completed/failed; running_tool → completed/awaiting_input/failed; awaiting_input + answer → ready ili novo awaiting_input u okviru limita; completed + hypothesis → nova procena istog run-a. failed/rejected nemaju nastavak. Korisnik je potvrdio ponašanje 002: failed ostaje terminalan; nema novog prelaza.

Za konkurenciju zaključati obradu po runId i revision; različiti run-ovi napreduju nezavisno. Ugovor identiteta operacije iz contracts/api.md čuva istu putanju i telo kao 002 i sprečava ponovno izvršavanje nakon izgubljenog odgovora.

## Evaluacija i gold

`EvaluationRun`: run label, execution status reserved/running/completed/interrupted, manifestHash, caseSetHash/version, fixture version, prompt/schema versions, gitCommit, dirty flag i hash redigovanog diff-a, provider/model/settings, odobren scope i limit, timestamps, rezultati po stabilnom case_id. Nema sadržaja .env u diff-u. `CaseResult`: mode, executed/skipped/dry_run/interrupted, passed boolean samo za izvršene, assertions, source IDs, trace reference. Nepotpuna provera ne postaje PASS.

`TraceEvent`: runId, caseId, revision, eventId, step, validation outcome, error category, source IDs, tool name, bezbedni sintetički argumenti, durationMs, model logical call/attempt, usage kada poznat. Bez ključeva, celog HTTP/provider odgovora, sirovog profila ili unutrašnjeg rezonovanja.

`GoldCriterionAnnotation`: annotationId, sourceId/hash, originalText, ljudski expected rule/status manual_review, reviewer/date, annotationVersion. `CriterionPrediction`: annotationId, candidate rule, prompt/schema/model version, generation method (manual/model), trace ID. Ljudske oznake ne prepisuje generator. Predikcija ne postaje odobreno pravilo automatski.
