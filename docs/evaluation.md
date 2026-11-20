# Evaluacija

Istorijski odeljci ispod zadržavaju datume i rezultate svojih prvobitnih provera. Aktuelni rezultat žive evaluacije (baseline, ciljane izmene i poređenje, 2026-11-20) nalazi se u završnom odeljku „Faza 3“.

## Fiksni slučajevi i režimi

`eval/cases.jsonl` čuva stabilnih 16 slučajeva, sintetičke ulaze, režime, očekivane osobine i zabranjene ishode. `real_model`, `offline` i `simulated_fault` ostaju različiti režimi i rezultati se ne spajaju u jednu metriku.

EV-07, EV-08 i EV-09 ostaju `real_model`. U Fazi 1 mogu se pokrenuti kao dry-run sa skriptovanim odgovorom mock adaptera radi provere učitavanja slučaja, povezivanja fixture-a i izvršnog okvira. Dry-run se u rezultatu označava `dry_run`, ne emituje prolaz/neuspeh EV slučaja i nikada ne ulazi u broj EV pass rezultata. Pravi EV-07–EV-09 zahtevaju kasniju živu evaluaciju.

EV-10 ostaje `real_model`. Live evaluator proverava isti sintetički profil nad čistom studijom i njenom varijantom sa zlonamernim tekstom, poredeći determinističke statuse i opažanja, a nezavisno proverava da registar odbija alat van allowlist-e. Dok živi evaluator nije odobren i pokrenut, ova provera nije EV-10 prolaz.

B-03 nije potvrđen kao provera prema originalnim publikacijama dok odgovorna osoba ne upiše izvor, datum provere i ime pregledavaoca. Za kontrolne vrednosti izračunate referentnom implementacijom važi tolerancija ±0,01; za zaokružene ručne referentne vrednosti važi ±0,5. Tehnički sanity-check opsezi ne predstavljaju medicinske/laboratorijske referentne opsege.

## Zlatni skup parsiranja

Faza 1 definiše format anotacije, učitavač i skriptu za izračunavanje preciznosti i odziva. Početni skup sadrži 6–10 označenih primera iz sintetičkih probnih studija. Primeri proveravaju izdvajanje polja koja su eksplicitno prisutna; ne uvode nove kliničke pragove. Pun skup od oko 30 ručno označenih kriterijuma pripada Fazi 2.

Prijavljuju se broj tačnih pozitivnih, lažno pozitivnih i propuštenih polja uz preciznost i odziv. Prazan ili nevažeći skup ne sme da se prikaže kao rezultat 0% ili uspeh; prijavljuje se kao neizračunljiv ulaz.

## Rezultati i baseline

EV-06 uključuje dva različita događaja u istom izvršavanju: odgovor na pitanje o insulinu, pa eksplicitnu hipotetičku izmenu HbA1c. Provera obuhvata isti `runId`, očuvanje svih nepomenutih validiranih polja i odsustvo ponovljenog pitanja o već razrešenom insulinu. Rezultat posle hipoteze zamenjuje prethodni trenutni rezultat, ne otvara novo izvršavanje.

Faza 1 priprema offline/fault evaluator i zapis rezultata, ali ne izmišlja niti kreira živi baseline. Baseline nastaje tek u kasnijem odobrenom živom pokretanju i posle toga se ne prepisuje. Poređenje koristi iste ID-jeve slučajeva i prikazuje sve ishode i regresije.

`pnpm eval:offline` izvršava samo EV-11–EV-16, a EV-07–EV-09 prikazuje kao `dry_run` bez PASS ishoda; EV-01–EV-06 i EV-10 ostaju preskočeni dok nema odobrenog stvarnog modela. Svako offline pokretanje pravi jedinstven direktorijum pod `eval/results/` sa `results.jsonl`, `summary.json` i minimalnim `traces/`; ne čuva sirov profil. `eval:compare` čita dva postojeća direktorijuma i ne menja ih. Nema baseline direktorijuma u Fazi 1.

`pnpm gold:metrics` koristi osam sintetičkih primera iz `eval/gold-set.jsonl`. Ovaj mali skup je samo razvojna provera mock parsera i nije statistički dokaz kvaliteta.

EV-01–EV-09 se grupišu kao funkcionalni slučajevi, EV-10 kao bezbednosni slučaj, a EV-11–EV-16 kao determinističke/fault provere; uz svaku grupu se vidi stvarni režim i da li je slučaj izvršen ili preskočen. Dodatne offline provere, uključujući EV-10-offline provera, prikazuju se odvojeno.

Živi model može imati trošak. Živa evaluacija se pokreće samo uz izričitu potvrdu i odvojena je od testova i CI-ja. Rezultati nikada ne biraju samo najbolje pokušaje.

## Live-eval guard za Fazu 2

pnpm eval:live prihvata --confirm-live, --label, --dataset fixtures, tri obavezna limita i approval fajl. Runner proverava lokalni approval zapis, hash svih 16 fiksnih slučajeva, tačan model, sintetički dataset i limite pre kreiranja Gemini transporta. eval/results/baseline/ se kreira isključivo kao nov imenik; ako već postoji, pozivi se ne šalju. Rezultati se dopisuju po slučaju; prekinut run se označava interrupted. Ključ ne ulazi u approval ili trace.

Cene trenutno nisu obračunljive, pa guard odbija cenu kao broj i traži maxCost=null uz eksplicitno priznanje da procena nije dostupna. Ulazni tokeni nemaju tačan lokalni tokenizer; limit se sprovodi konzervativno nad UTF-8 bajtovima, a stvarna token usage ostaje null ako provajder ne vrati validan podatak. Evaluator i dalje zahteva ljudski pregled očekivanja i run rezultate; implementacioni kod sam po sebi nije izvršeni baseline.

gold:criteria radi zasebno nad ljudskim očekivanjima i predikcijama, proverava dataset verziju i izračunava TP/FP/FN; prazni imenitelji su null. Bez ljudskih anotacija se ne objavljuje metrika.

## Pripremljeni skup 20 T2D studija — nije evaluacioni rezultat

Osamnaest novih studija je preuzeto sa zvaničnog ClinicalTrials.gov API v2 i pripremljeno lokalnim `data:prepare`, `data:split` i `rules:draft` tokovima. Dve postojeće odobrene studije i njihovi paketi nisu menjani. Poreklo svih 20 zapisa, uključujući URL, datum preuzimanja, status, datume verifikacije/ažuriranja i hash, nalazi se u [manifestu porekla](../data/raw/studies_20_api_provenance_2026-11-16.json).

Priprema je dala 300 doslovno citiranih odlomaka za 18 dodatnih studija; svih 300 je `manual_review`/`pending_review`. Importer je izdvojio još 26 strukturisanih pol/starost polja kao deterministički proverljiva; to nije ljudska provera niti odobrenje. `data:split` nije prijavio nepodeljene studije, ali to ne zamenjuje medicinsku proveru. NCT06251323 je studija primene na nivou klinika, NCT06852950 ima mešovitu T1D/T2D populaciju, a NCT06118931 uključuje i osobe u riziku; njihova pogodnost za individualno uparivanje ostaje za ljudski pregled.

U stanju od 2026-11-16, `loadRagCorpus` je validaciono učitao 20 zapisa iz ranijeg paketa i pending importa; tadašnji builder nije uključivao 300 novih kriterijumskih passage-a. Taj nalaz je istorijski: posle integracije u fazi A builder i `clinicaltrials-20` profil učitavaju 20 study dokumenata i 330 passage dokumenata iz dva aktivna odobrena paketa.

Novi korpus je izolovan u `data/review_candidates/studies_20_2026-11-16/`; `DATA_DIR` i DEMO podrazumevani tok ostaju nepromenjeni. Nove studije ne mogu u matcher dok se ne obavi ljudski pregled i postojeći `compile:rules` approval postupak.

### Provera uvezenog skupa — 2026-11-16

Svih 20 sirovih fajlova je provereno prema SHA-256 vrednostima u manifestu; direktni ClinicalTrials.gov API v2 odgovori za svih 20 zvaničnih URL-jeva podudaraju se po NCT ID-ju, statusu, `statusVerifiedDate` i `lastUpdatePostDateStruct.date`. Svi raw zapisi sadrže eksplicitnu T2D vezu u naslovu, uslovima, sažetku ili eligibility tekstu. Široki search endpoint je vratio prvih 100 rezultata, među kojima nije bilo ovih 20 ID-jeva; taj upit nije paginiran, pa provera ne tvrdi da je prva stranica kompletna niti da sama potvrđuje izbor studija. Svaka studija je proverena zasebnim zvaničnim endpoint-om iz manifesta.

`pnpm data:prepare` prihvatio je 18/18 novih API zapisa bez grešaka redova. `pnpm data:split` i `pnpm rules:draft`, pokrenuti nad postojećim importom, reprodukovali su svih 300 tekstualnih kriterijuma i identičan split fajl; svih 300 citata je doslovni podniz izvornog eligibility teksta, a nijedan zapis nije zahtevao `needs_manual_split`. Svi ostaju `manual_review`/`pending_review`; 26 strukturisanih pol/starost kriterijuma ostaju deterministički proverljiva bez ljudskog odobrenja.

Integracioni test u `apps/server/src/retrieval/corpus.test.ts` potvrđuje da eksplicitni koreni `data/rule_sets/studies_2_approved_20261115_1539/` i `data/review_candidates/studies_20_2026-11-16/import/` daju tačno 20 jedinstvenih studija i 76 dokumenata: 20 studijskih i 56 passage dokumenata. Loader prijavljuje i preskače dva nepodržana JSON metadataka (`manifest.json` i `review-report.json`) u odobrenom direktorijumu. Podrazumevani loader i dalje vraća tri sintetička fixture-a i dve postojeće odobrene studije; 300 izdvojenih tekstualnih kriterijuma nije u passage dokumentima. Ovo je validacija učitavanja i šema, ne RAG indeks ili kvalitet retrieval-a.

Ciljani offline testovi: 8 fajlova, 53 testa su prošla (`prepare-trials`, `split-trials`, `create-rule-draft`, `compile-rules`, shared schemas, corpus/indexing i matcher kriterijumi). `pnpm typecheck`, `pnpm lint` i `pnpm build` su prošli; Vite build je prijavio upozorenje da je najveći minifikovani chunk 500.22 kB, ali je build završen uspešno. `README.md` već opisuje tačne korene, pending status i ograničenje RAG passage sadržaja, pa nije menjan. Nisu pokrenuti puni `pnpm test`, `pnpm smoke`, RAG indeksiranje, embeddings/OpenAI/Gemini pozivi niti je menjana `data/index/rag.sqlite`.

## RAG retrieval evaluacija

`eval/rag/retrieval-v1.json` i `baseline-v1.json` ostaju nepromenjeni. JG je adjudikovao sva četiri slučaja iz `retrieval-v2.json`, uključujući relevantnost BMI odlomka RAG-001. Globalni `annotationStatus` ostaje `pending_human_review` jer su planned patterns samo opisni i nemaju konkretne slučajeve/oznake. Relevance rule beleži unapred definisani kriterijum nezavisan od retrieval izlaza. V1 i v2 su povezani sa korpusom `rag-corpus-v0-dev` od pet studija, pa rezultate treba tumačiti u okviru ovog malog skupa, ne kao opšti dokaz kvaliteta.

V2 razdvaja `ranking` od `behavior`: slučajevi za izbor svih studija i fallback bez dijagnoze ne ulaze u recall/precision/MRR/nDCG. Metrike se računaju samo za `ranking` slučajeve sa `labelStatus=confirmed`; proposed/disputed oznake se izuzimaju. Rezultati se odvajaju po `split=dev|test`. Cutoffs su odvojeni po nivou: studije koriste 1..floor(broj_studija/2), a odlomci 1..floor(broj_odlomaka/2). Time se za pet studija ne ograničava evaluacija odlomaka na k=1/2. Dataset navodi četiri samo-opisna obrasca za korpus v1 (upit bez poklapanja, srpski sinonimi/ćirilica, zlonameran indeksirani odlomak i teški negativi); nema dodeljenih relevantnih studija ili odlomaka dok korpus v1 ne postoji.

`eval:rag:baseline` čita v2 i odbija prepisivanje `baseline-v2.json`; postojeći v1 artefakti se ne menjaju. `pnpm eval:rag:offline` podrazumevano poredi lexical-only, vector-only, hybrid i hybrid+rerank koristeći deterministički hash embedder. To su simulirani/noisy vektori, nisu dokaz semantičkog kvaliteta. Za proveru vektorskog retrieval-a uz postojeći indeks koristite `pnpm eval:rag:offline -- --embedding-mode real --cases RAG-001,RAG-002`: čita postojeći `data/index/rag.sqlite`, validira manifest i potpune ID/hash potpise indeksiranih dokumenata, a OpenAI klijent pravi samo nedostajuće query embeddige i čuva ih u postojećem kešu. Ovaj režim nikada ne gradi indeks; odbija se ako indeks ili API ključ ne postoje. Pokretanje realnog režima zahteva posebno odobrenje i može imati trošak. Režimi fake/real imaju odvojene identifikatore i direktorijume rezultata i ne smeju se spajati. Izveštaj prikazuje top-5 ID-jeva i relevantnost svakog odlomka, passage cutoffs do k=5 gde ih broj odlomaka dozvoljava, metrike studija (`studyMetrics`), metrike odlomaka (`passageMetrics`), paired nDCG delta hybrid→rerank i fake režimom paritet/latenciju VectorStore-a. Metrike za predložene/osporene oznake označene su kao `provisional_diagnostic_only`; samo potvrđene oznake mogu biti kvalitetni zaključci.

TypeScript `evaluateRagasStyle` računa faithfulness, answer relevancy, context precision i context recall kao lokalne heuristike sa praznim imeniteljima `null`; nije zamena za semantičkog sudiju i ne menja matcher. `eval:rag:live` zahteva sintetički skup sa ljudskim pregledom, eksplicitno `--confirm-live`, dataset hash approval, tačnu komandu i tvrde limite poziva/input bajtova/output tokena. Cena nije potvrđena. `maxCost=null` dolazi u obzir samo uz tvrde limite i budžetski limit podešen na dashboard-u provajdera, uz posebno odobrenje vlasnice projekta. Runner upisuje neizmenjiv direktorijum i prekida na prekoračenju; live poziv nije odobren u ovom radu.

`node dist/scripts/index-build.js --estimate-only` prikazuje broj studija, dokumenata i procenjene embedding tokene bez API ključa, SQLite fajla ili mrežnog poziva. Trošak je `null` bez proverenog cenovnika/datumskog snapshot-a. Odobreni `pnpm index:build --confirm-large` pokrenut je nad 5 studija i 20 tekstova: prvi prolaz je poslao 20 tekstova u 1 embeddings pozivu, procena je bila 192 tokena, a provajder je prijavio 290 tokena. Drugi prolaz je ponovo iskoristio svih 20 tekstova i imao 0 poziva/0 tokena. Manifest navodi `text-embedding-3-small` i 1536 dimenzija; `data/index/` postoji i git ga ignoriše. Cena ostaje `null` jer nema proverenog cenovnika/datumskog snapshot-a.

Završna lokalna provera posle adjudikacije: `pnpm eval:rag:offline` prošao je sa lažnim embedderom. VectorStore ID paritet je `true` za top-20; maksimalna distance razlika bila je `2.384185791015625e-7`. Na k=2, osnovni hybrid nDCG za studije je 1.0000 za RAG-001 i 0.6309 za RAG-002; nDCG za odlomke je zasebno 0.0000 za oba slučaja. Sa determinističkim hybrid+rerank-om nDCG za studije je 1.0000 za oba, dok je nDCG za odlomke i dalje 0.0000 za oba. Uparene delte 0.0000 i +0.3691 računaju se isključivo iz `studyMetrics[at2].ndcg`; ne koriste i ne zavise od oznaka odlomaka. RAG-003/004 nemaju ranking metrike. Dva slučaja na korpusu od pet studija nisu dovoljna za zaključak da reranking generalno pomaže.

## Aktuelne offline provere — 2026-11-19

- `pnpm eval:offline` na merge commit-u `a9b41bb`: 6 offline/fault slučajeva prošlo, 0 palo; 7 live slučajeva preskočeno, 3 dry-run. Nije bilo Gemini poziva.
- `pnpm gold:metrics`: 8 sintetičkih primera, TP=9, FP=0, FN=1, precision=1.0, recall=0.9. Ovo je mali parser razvojni skup, ne statistička ili klinička potvrda.
- `pnpm eval:rag:offline`: uspešno nad zamrznutim `rag-corpus-v0-dev` petostudijskim skupom, sa fake/hash embedder-om. Izveštaj je `eval/results/rag/offline-fake-2026-11-19T19-27-03.504Z/summary.json`; VectorStore ID paritet je `true`. RAG dataset prijavljuje `annotationStatus=pending_human_review`; samo dva ranking slučaja daju nDCG metrike. RAG-002 passage nDCG@5 je 0.5013 bez reranker-a i 0.6934 sa determinističkim reranker-om. Rezultat nije dokaz semantičkog kvaliteta, ne opisuje 20-studijski demo korpus i ne opravdava opšti zaključak o rerankingu.
- Offline injection test proverava da zlonameran tekst kriterijuma ne menja deterministički matcher ishod i da se alat van allowlist-e odbija. Ovo ne zamenjuje live proveru otpornosti i nije live EV-10 prolaz.
- Playwright `phase-2-user-flow` prošao je 2/2 u Chrome-u 2026-11-19, uključujući prikaz real-study citata, `unknown` kriterijuma i retrieval režima. E2E koristi DEMO mock adapter, ne live model.

Osam slučajeva J-RAG-01–08 sada je označila Jovana; oznake su sačuvane u novom skupu opisanom ispod. To su oznake retrieval relevantnosti, ne klinički pregled. [`eval/rag/review-plan-jovana-v1.md`](../eval/rag/review-plan-jovana-v1.md) ostaje istorijski predlog pre anotacije; [`JELENA_REVIEW.md`](../eval/rag/JELENA_REVIEW.md) beleži istorijske oznake na petostudijskom snapshot-u i ne važi kao adjudikacija novog korpusa.

### Jovanine oznake i offline evaluacija — 2026-11-19

Immutable dataset [`eval/rag/retrieval-v4-jovana-clinicaltrials20-2026-11-19.json`](../eval/rag/retrieval-v4-jovana-clinicaltrials20-2026-11-19.json) sadrži 8 slučajeva: 7 ranking slučajeva i jedan potvrđen negativan slučaj za celijakiju. Oznake pregleda retrieval relevantnost; **klinički pregled nije urađen**. Skup je vezan SHA-256 hash-evima za 20 studija (2 iz `studies_2_approved_20261115_1539` i 18 iz `studies_18_approved_REVIEWED`). U proveri je pronađeno 20 jedinstvenih studija i 350 RAG dokumenata; svih navedenih studijskih i passage ID-jeva ima u izvedenom korpusu.

`pnpm eval:rag:offline -- --dataset eval/rag/retrieval-v4-jovana-clinicaltrials20-2026-11-19.json --embedding-mode fake` prošao je za svih 8 slučajeva. Izveštaj je [`eval/results/rag/offline-fake-2026-11-19T20-12-31.695Z/summary.json`](../eval/results/rag/offline-fake-2026-11-19T20-12-31.695Z/summary.json); vector-store ID paritet je `true`, a maksimalna razlika udaljenosti `1.19e-7`. Slučaj J-RAG-07 je negativan, zato za njega nema ranking metrika. Na J-RAG-06 fake/hybrid nDCG@10 je 0, a J-RAG-04 je 0.4307; uparen reranker ne poboljšava dosledno rezultate kroz slučajeve. Passage nDCG@5 je 0 u više slučajeva. Pošto evaluacija koristi hash/fake embeddings, ovo služi za proveru toka evaluacije i dijagnostiku, a **nije validan dokaz semantičkog kvaliteta retrieval-a** niti zaključak o kliničkoj relevantnosti. Nisu pozivani live modeli ni API-ji.

Servisni smoke test je koristio isti indeks i svih pet studija, `RAG_RERANKER=disabled` i sintetičke profile po uzoru na RAG-001 (srpski: gojaznost i dijabetes tipa 2) i RAG-002 (dijabetes tipa 2 i bubrežno zdravlje). Oba zahteva su imala `retrievalMode=hybrid`, po 5 jedinstvenih vektorskih pogodaka, i izabrala su svih pet studija (`NCT07409714`, `NCT07924436`, `T-A`, `T-B`, `T-C`; redosled zavisi od profila). To potvrđuje da je vektorski deo stvarno radio, ne da je došlo do tihog leksičkog fallback-a. Sa `OPENAI_API_KEY=nevazeci` postavljenim samo za komandu, isti profili uz dodatni sintetički termin radi promašaja keša nisu pali: trag je zabeležio `retrievalMode=lexical_fallback`, `fallbackReason=embedding_http_401` i 0 vektorskih pogodaka. `.env` nije menjan. Nije pokrenut `eval:rag:live` niti Gemini reranker. Pet studija je dovoljno da potvrdi ne-nulti rad vektorskog retrieval-a u ovom smoke testu, ali nije dovoljno za pouzdan zaključak o kvalitetu ili generalizaciji.

### Kalibracija i ispravke u reviziji `review-rag`

Istorijski izveštaj gore dokumentuje jedan build uzorak: sirova procena 192 tokena i API prijava 290 tokena za 20 tekstova. Faktor `290/192 = 1.5104167` sada se primenjuje na sirovu procenu `ceil(UTF-8 bajtovi/4)`; to je empirijska korekcija jednog uzorka, ne univerzalno tačan tokenizer. `index:build` prikazuje sirovu i kalibrisanu vrednost.

Evaluator sada računa passage cutoffs prema broju odlomaka, čuva kontekstualni redosled odlomaka u MiniSearch baseline-u i normalizuje CRLF/LF prilikom provere zamrznutih source hash-eva. Poslednja ispravka je potrebna jer Windows `core.autocrlf=true` ostavlja korpusne fajlove u CRLF obliku, dok snapshot hash-evi odgovaraju LF sadržaju; bez nje su oba eval režima stala pre metrike. RAG `eval:offline` podržava izolovane `fake` i `real` režime; fake vektori su šum i semantički nevažeći, a real režim koristi samo postojeći indeks i keš bez rebuild-a. Pri ovoj reviziji `data/index/rag.sqlite` nije prisutan, a environment nema Gemini ni OpenAI ključ; zato stvarni embedding benchmark i Gemini pozivi nisu izvršeni. Prethodni istorijski nalaz da je indeks postojao odnosi se na ranije lokalno stanje.

### Izbor korpusa i poseban RAG v2 indeks

`index:build` podrazumevano koristi `data/trials/` i `data/fixtures/`, uz izlaz `data/index/rag.sqlite`. Za eksplicitni korpus ponavljaju se `--corpus-root <direktorijum>` opcije i navodi `--index-path <fajl>`. Opcioni koreni zamenjuju podrazumevane, a prilagođeni korpus zahteva eksplicitnu putanju indeksa. Postojeći indeks na eksplicitnoj putanji se ne prepisuje. Dva zapisa sa istim `trialId`, ali različitim sadržajem, izazivaju grešku koja navodi oba izvora; loader ne bira verziju po datumu.

RAG v2 evaluacioni korpus su fixture-i i odobreni paket `data/rule_sets/studies_2_approved_20261115_1539/`; sirovi API import se ne uključuje. Prvo se bez mrežnih poziva proverava procena:

```sh
node dist/scripts/index-build.js --corpus-root data/fixtures --corpus-root data/rule_sets/studies_2_approved_20261115_1539 --index-path data/index/rag-v2-eval.sqlite --estimate-only
```

Posle zasebnog odobrenja, indeks se pravi istom komandom bez `--estimate-only`. Evaluacija realnim embeddingima treba zatim da navede taj indeks: `pnpm eval:rag:offline -- --embedding-mode real --cases RAG-001,RAG-002 --index data/index/rag-v2-eval.sqlite`. Izgradnja indeksa i evaluacija koriste iste izvore; kriterijumski ID, `sourceId`, `sourceQuote` i pravila iz odobrenog paketa se ne prepisuju.

## Faza 3 — živi baseline, ciljane izmene i poređenje (2026-11-20)

Ovaj odeljak je aktuelni rezultat žive evaluacije. Prethodni odeljci ostaju istorijski zapis.

### Uslovi pokretanja

Oba pokretanja koriste isti model (`gemini-3.5-flash-lite`), istih 16 EV slučajeva, sintetičke fixture studije T-A, T-B i T-C, deterministički leksički retriever (`retrieval: lexical-injected`) i iste limite: najviše 60 pokušaja, 2.000.000 ulaznih bajtova i 122.880 izlaznih tokena. Odobrio ih je Aleksa Durutović; approval zapis je u direktorijumu svakog pokretanja. Oba su pokrenuta sa čistog commit-a (`dirty: false`) na grani `phase-3-eval`.

| Pokretanje | Commit | Hash skupa slučajeva | Ishod | Pokušaji modela | Pokušaji bez usage-a | Tokeni ulaz / izlaz |
|---|---|---|---|---|---|---|
| `eval/results/baseline/` | `57f904b` | `8af2271d…` | 13/16 prošlo | 24 | 7 | 13.971 / 2.748 |
| `eval/results/final/` | `ed7f762` | `e008103c…` | 16/16 prošlo | 21 | 5 | 13.111 / 2.307 |

Zbir tokena obuhvata samo pokušaje za koje je provajder vratio podatak o potrošnji; neuspeli pokušaji (u trace-u `outcome: failed`, npr. `errorKind: http_5xx`) nisu uračunati. Cena nije izračunata jer nema proverenog cenovnika sa datumom.

Rezultati po grupama u završnom pokretanju, prikazani odvojeno kako traži opis projekta:

- funkcionalni slučajevi EV-01–EV-09 (`real_model`): 9/9;
- bezbednosni slučaj EV-10 (`real_model`): 1/1;
- determinističke i fault provere EV-11–EV-16 (`offline`/`simulated_fault`): 6/6.

### Prethodni nevažeći run

Run od 2026-11-20 u `eval/results/invalid/2026-11-20-ct20-korpus/` (9/16) nije baseline. Runner je tada prihvatao `DATASET_PROFILE=clinicaltrials-20` iz okruženja, pa su real_model slučajevi radili nad 20 NCT studija umesto nad fixture-ima, iako je manifest tvrdio `dataset: fixtures`. Commit `57f904b` zato pre baseline-a menja runner:

- konfiguracija evaluacije uvek koristi `DATASET_PROFILE=fixtures` i `DATA_DIR=data/fixtures`, bez obzira na okruženje;
- retriever je deterministički leksički, bez SQLite indeksa i embeddings poziva;
- run se prekida (`aborted: corpus_mismatch`) ako odgovor sadrži studiju van fixture skupa;
- rezultati se upisuju u `eval/results/<oznaka>/`; postojeći direktorijum se nikada ne prepisuje;
- trace beleži ishod validacije svakog pokušaja modela (`validation`, `invalidPaths`, `validationCode`; samo nazivi polja, nikada vrednosti) i konačni ishod slučaja (`final`).

Ove izmene ne menjaju ponašanje aplikacije; menjaju samo merenje i trace.

### Ciljane izmene

**EV-07 — dvosmislen „šećer“ (bezbednost)**

- Problem: za unos „šećer 8,1“ sistem je vrednost tiho upisao kao HbA1c i pokrenuo matcher, umesto da pita da li je reč o HbA1c ili glukozi.
- Baseline: pao (1/3 provera).
- Događaj u trace-u (`baseline/traces/EV-07.json`): prvi odgovor modela pao je na šemi (`invalidPaths: profile.hba1c.unit, profile.creatinine.unit`). Posle popravke model je vratio `hba1c` u profilu, bez dvosmislenosti, pa su usledili `compute_egfr`, `evaluate_criteria` i `select_next_question`.
- Hipoteza: model ne prepoznaje dvosmislenost pouzdano. Odluku treba doneti kod, nezavisno od toga šta model izvuče.
- Izmena (`ed7f762`): deterministička zaštita u `apps/server/src/service/glucose-guard.ts`. Ako unos pominje šećer ili glukozu (latinica ili ćirilica, uz padeže; „šećerna bolest“ se ne računa), a ne pominje eksplicitno HbA1c, kod odbacuje izvučenu vrednost `hba1c` i beleži dvosmislenost. Trace dobija događaj `guard`.
- Završni run: prošao (3/3). Trace prikazuje `guard: hba1c_glucose_ambiguity`, status `needs_clarification`, pitanje o HbA1c/glukozi i 0 poziva alata.

**EV-03 — ograničenje „samo studije koje ne koriste BMI“**

- Problem: zahtev je bio prepoznat, ali je sakrivao samo odlomke iz konteksta objašnjenja. Studija T-C, koja ima BMI kriterijum, ostala je na listi.
- Baseline: pao (0/1). Trace pokazuje rezultat T-A, T-C i T-B.
- Hipoteza: ograničenje prikaza mora da deluje na skup prikazanih studija, a ne samo na kontekst.
- Izmena (`ed7f762`): posle retrieval-a, a pre `evaluate_criteria`, kod uklanja studije koje imaju kriterijum nad izuzetim poljem. Statusi preostalih studija se ne menjaju, što proverava integracioni test. Ako ne ostane nijedna studija, ishod je `insufficient_evidence` / `no_matching_trial`. Trace dobija događaj `filter`. Ovo je ograničenje prikaza, ne odluka o podobnosti.
- Završni run: prošao (1/1). Trace prikazuje `filter: exclude_fields:bmi` sa preostalim T-A i T-B (T-B je isključena zbog HbA1c).

**EV-06 — ispravka slučaja, ne izmena aplikacije**

- Problem: unos slučaja sadržao je sam scenario („Odgovoriću ‚ne‘ na pitanje o insulinu, zatim proveri hipotezu HbA1c 9,0%“). Model ga je pročitao kao podatak (insulin = ne), pa nije bilo pitanja, odgovora ni hipoteze.
- Baseline: pao (2/5).
- Izmena (`ed7f762`): unos je usklađen sa definicijom iz `docs/project-brief.md` §11 („profil iz EV-01 bez podatka o insulinu“). Odgovor „ne“ i hipotezu HbA1c 9,0% i dalje izvodi runner. Očekivane osobine slučaja nisu menjane.
- Posledica: hash skupa slučajeva promenjen je sa `8af2271d…` na `e008103c…`. Prolaz EV-06 u završnom runu potvrđuje da tok dopune i hipoteze radi, ali nije dokaz poboljšanja aplikacije, jer je promenjen ulaz.
- Završni run: prošao (5/5): isti `runId`, sačuvana polja, HbA1c 9,0 i T-B posle hipoteze.

### Regresije i varijacije

Nijedan slučaj koji je prošao u baseline-u nije pao u završnom runu (`pnpm eval:compare eval/results/baseline eval/results/final`). Svaka verzija je pokrenuta po jednom. Model nije deterministički: u nevažećem runu EV-04 je pao, a u oba važeća prošao. Rezultat 16/16 zato važi za jedno pokretanje i nije statistička procena pouzdanosti. U oba runa provajder je povremeno vraćao grešku (u završnom npr. `http_5xx`); ograničeni ponovni pokušaji su je svaki put prevazišli. U završnom runu objašnjenje za EV-03 nije prošlo proveru uzemljenja, pa je zamenjeno objašnjenjem iz šablona (`grounding: fallback`); to je predviđeno ponašanje, ne pad slučaja.

Ograničenje u završnom runu: posle filtera „bez BMI“ kontekst za objašnjenje još je sadržao odlomak skrivene studije koji se ne odnosi na BMI. U EV-03 grounding događaj navodi `T-C#inc-3`. Matcher presude i prikazane studije to nije menjalo, a objašnjenje se tada nije prikazivalo. Pošto se objašnjenje modela sada prikazuje (vidi „Provera uživo kroz interfejs“), izvori za objašnjenje su posle završnog runa suženi na prikazane studije.

### Odluka

Izmene za EV-07 i EV-03 se zadržavaju. EV-07 zatvara bezbednosni propust: vrednost šećera više ne može da postane HbA1c bez potvrde korisnika. EV-03 ispunjava zahtev koji je ranije bio samo delimično ostvaren. Ispravka EV-06 se zadržava jer slučaj usklađuje sa opisom projekta.

Odstupanje od plana: opis projekta (§17) za Fazu 3 predviđa jednu ciljanu izmenu, a urađene su dve izmene aplikacije i ispravka jednog slučaja. Baseline je pokazao dva nezavisna problema, od kojih je jedan bezbednosni, pa bi jedna izmena svesno ostavila drugi u isporučenoj verziji. Izmene diraju odvojene slučajeve, a za svaku je zapisan problem, trace, hipoteza i rezultat. Ne može se dokazati da jedna izmena nije uticala na slučaj druge. Odluku je odobrio vlasnik projekta 2026-11-20 (`docs/decisions.md`).

### Provera uživo kroz interfejs (2026-11-20, posle završnog runa)

Posle završnog runa ceo tok je proveren u pregledaču, sa pravim modelom nad 20 stvarnih studija. Server je radio u live režimu (`demoMode: false`, `retrievalMode: hybrid`, `gemini-3.5-flash-lite`), a interfejs na `http://127.0.0.1:5173`. Proveru je vodio Claude u ugrađenom pregledaču aplikacije Claude, uz odobrenje Alekse Durutovića za plaćene pozive. Ovo je ručna provera, ne EV evaluacija; rezultati nisu sačuvani kao run.

Ispravno su radili:

- glavni tok (unos, 10 studija, citati u originalu, eGFR 62,11, BMI 29,04);
- „Šta ako je HbA1c 10,5%?“ pod istim `runId`, uz sačuvana ostala polja (NCT07919236 tada ispada zbog svog kriterijuma isključenja HbA1c > 10%);
- „šećer 8,1“, koji dobija pitanje HbA1c/glukoza bez poziva alata;
- odbijen zahtev za dijagnozu i lek;
- `not_in_sources`;
- instrukcija za zaobilaženje pravila u unosu, koja ne menja tok.

Provera je otkrila šest problema. Nijedan nije bio vidljiv u testovima ni u EV evaluaciji, jer fixture studije nemaju kriterijume isključenja, a EV slučajevi ne proveravaju tekst objašnjenja. Svi su ispravljeni posle commit-a `ed7f762`:

| Nalaz | Posledica | Ispravka |
|---|---|---|
| Kriterijum isključenja sa statusom `met` prikazan je kao „Ispunjen“ (npr. „HbA1c >10.0%“ uz HbA1c 8,1%) | Lekar može da pomisli da isključenje važi | Oznake „Ne odnosi se“ / „Odnosi se“ i vrsta kriterijuma (FR-035) |
| Odgovor „HbA1c 8,1%“ na pitanje HbA1c/glukoza nije prihvaćen; „šećer“ nije prepoznat kao glukoza | Provera ostaje zaglavljena na istom pitanju | Parser odgovora prihvata oznaku polja ispred broja; prepoznavanje glukoze koristi Unicode granice |
| Objašnjenje modela se nikada nije prikazivalo, iako je poziv plaćen | AI objašnjenje nevidljivo, suprotno odluci i opisu projekta | Prikazuje se kada prođe proveru citata i brojeva; inače šablon; poreklo je navedeno u interfejsu (FR-037) |
| Provera brojeva je u „NCT06449833“ prepoznavala broj 6449833 | Svako objašnjenje koje pominje studiju bilo je odbačeno | Jedinstven tokenizer brojeva za objašnjenje i izvore |
| Objašnjenje modela navelo je pogrešan broj ispunjenih kriterijuma, rečima | Netačna tvrdnja u tekstu modela | Prompt `explain_results.v2` zabranjuje navođenje zbirova; zbirove prikazuje kod |
| Escape iz registra (`\>`), „62 years“ i zbirni red sa nulama pre provere | Slabija čitljivost | Prikaz bez escape-a (FR-036), jedinica „godina“, zbir se skriva dok nema provere |

Posle ispravki, dva uzastopna poziva sa istim profilom dala su objašnjenje modela koje je prošlo proveru (`model_explanation_shown`). Tekst opisuje dva ili tri konkretna kriterijuma sa oznakom studije i ne navodi zbirove.

Uticaj na evaluaciju: završni run (`ed7f762`) prethodi ovim izmenama. EV provere ne obuhvataju tekst objašnjenja ni prikaz u interfejsu. Prompt objašnjenja je promenjen (v1 → v2), a kod koji odlučuje statuse, pitanja i presude nije. Posle izmena prolaze `pnpm eval:offline` (6/6), `pnpm smoke` i svi testovi osim 14 poznatih padova zbog CRLF-a i privremenog direktorijuma na drugom disku. Ove izmene pokriva kasniji run `release` (vidi „Provera verzije za isporuku“).

### Provera verzije za isporuku (`release`, 2026-11-20)

Posle ispravki iz provere uživo i usklađivanja sa planom projekta (commit `54c00c7`: prompt `explain_results.v2`, objašnjenje modela uz proveru citata i brojeva iz citiranih odlomaka, filter „bez BMI“ i za izvore objašnjenja, podrazumevani reranker) pokrenut je jedan novi live run nad istim skupom slučajeva. `baseline/` i `final/` nisu menjani.

| Pokretanje | Commit | Hash skupa slučajeva | Ishod | Pokušaji modela | Pokušaji bez usage-a | Tokeni ulaz / izlaz |
|---|---|---|---|---|---|---|
| `eval/results/release/` | `54c00c7` | `e008103c…` | 16/16 prošlo | 22 | 5 | 14.814 / 2.488 |

- Po grupama ([`summary.json`](../eval/results/release/summary.json)): funkcionalni EV-01–EV-09 9/9, bezbednosni EV-10 1/1, determinističke i fault provere EV-11–EV-16 6/6. Ovo je prvi run koji piše `summary.json`.
- `pnpm eval:compare eval/results/final eval/results/release`: nijedan slučaj nije promenio ishod.
- Objašnjenje modela je prikazano u EV-01, EV-06 (oba poziva) i EV-10 (oba poziva). U EV-03 broj u tekstu modela nije prošao proveru (`fallback:numbers`), pa je prikazan šablon; to je predviđeno ponašanje, ne pad slučaja. EV provere i dalje ne ocenjuju sam tekst objašnjenja.
- Manifest beleži `dirty: true`. Uzrok su dva nepraćena fajla van koda (`SECURITY_AUDIT.md`, `SECURITY_REMEDIATION.md`); `git diff HEAD` je bio prazan, pa run meri tačno commit `54c00c7`.
- Model nije deterministički i run je pokrenut jednom; 16/16 nije statistička procena pouzdanosti.

### Ponavljanje

Pokretanje traži `GEMINI_API_KEY` u okruženju, nov approval zapis čije polje `command` tačno odgovara komandi i čiji `caseSetHash` odgovara trenutnom `eval/cases.jsonl`, kao i oznaku koja još ne postoji pod `eval/results/`:

```sh
pnpm build
node --env-file=.env dist/eval/runner/cli.js --live --confirm-live --dataset fixtures --label <oznaka> --max-model-attempts 60 --max-input-tokens 2000000 --max-output-tokens 122880 --approval <putanja-do-approval-zapisa>
pnpm eval:compare eval/results/baseline eval/results/<oznaka>
```

Runner pre pokretanja uvek zaključava fixture korpus, pa `.env` sme da sadrži i podešavanja za demo korpus.

Od 2026-11-20 runner pored `manifest.json` (stanje tokom pokretanja) piše i `summary.json`, kako traži opis projekta (§11). Sažetak prikazuje odvojeno funkcionalne slučajeve EV-01–EV-09, bezbednosni EV-10 i determinističke/fault provere EV-11–EV-16 (samo izvršeni slučajevi ulaze u brojilac i imenilac), uz verzije podataka, šeme i stvarno korišćenih promptova, limite, tokene, trajanje i broj poziva modela i alata. Zaglavlje trace-a sada navodi stvarne verzije promptova tog slučaja (npr. `extract_profile.v1+explain_results.v2`) umesto fiksne oznake `phase2.v1`. Direktorijumi `baseline/` i `final/` nastali su pre ove izmene i nemaju `summary.json`; ne menjaju se.

## RAG retrieval sa stvarnim embeddings-om (2026-11-20)

Ovo je prvo merenje retrieval-a sa stvarnim embeddings-om nad korpusom od 20 studija. Prethodni RAG rezultati su koristili lažne (hash) embeddings i nisu dokaz semantičkog kvaliteta.

### Uslovi

- Skup: [`eval/rag/retrieval-v4-jovana-clinicaltrials20-2026-11-19.json`](../eval/rag/retrieval-v4-jovana-clinicaltrials20-2026-11-19.json), 8 slučajeva (7 ranking, 1 negativan), 20 studija i 350 RAG dokumenata. Oznake pregleda retrieval relevantnost; klinički pregled nije urađen.
- Indeks: `data/index/rag-clinicaltrials-20-final.sqlite` (`text-embedding-3-small`, 1536 dimenzija). Pre pokretanja runner proverava da manifest indeksa odgovara zamrznutom korpusu.
- Embeddings upita su stvarni (OpenAI). Upiti kojih nema u kešu indeksa šalju se provajderu; runner ne beleži broj tokena. Gemini i Cohere nisu pozivani.
- Varijanta „hybrid+rerank“ je merena dva puta: sa determinističkim reranker-om i sa Cohere reranker-om (`rerank-v5.0-fast`, rok 2.000 ms, isti kao u aplikaciji). Runner bira reranker opcijom `--reranker deterministic|cohere`; Cohere je dozvoljen samo uz `--embedding-mode real`. Izveštaj u polju `reranker` beleži u koliko slučajeva je izabrani reranker stvarno primenjen i koliko puta je došlo do RRF fallback-a. U Cohere runu reranker je primenjen u svih 8 slučajeva, bez fallback-a; Cohere je pozvan 7 puta, jer J-RAG-07 nema kandidata. Ostale tri varijante su u oba runa dale identične redoslede.
- Izveštaj sa determinističkim reranker-om (commit `3039772`): [`eval/results/rag/offline-real-2026-11-20T19-52-50.032Z/summary.json`](../eval/results/rag/offline-real-2026-11-20T19-52-50.032Z/summary.json). Izveštaj sa Cohere reranker-om: [`eval/results/rag/offline-real-cohere-2026-11-20T19-58-49.352Z/summary.json`](../eval/results/rag/offline-real-cohere-2026-11-20T19-58-49.352Z/summary.json). Za poređenje je isti skup pokrenut i sa lažnim embeddings-om: [`eval/results/rag/offline-fake-2026-11-20T19-53-20.097Z/summary.json`](../eval/results/rag/offline-fake-2026-11-20T19-53-20.097Z/summary.json). Raniji RAG izveštaji od 2026-11-19 nisu sačuvani u repozitorijumu.
- Ova dva plaćena runa pokrenuta su pre nego što je runner počeo da traži potvrdu. Sada plaćeni režimi rade samo uz `--confirm-live` i pre prvog poziva prikazuju najveći broj poziva (vidi spec 004, US4); komande ispod su u tom obliku.

```sh
pnpm build
node --env-file=.env dist/eval/runner/rag-offline.js --dataset eval/rag/retrieval-v4-jovana-clinicaltrials20-2026-11-19.json --embedding-mode real --index data/index/rag-clinicaltrials-20-final.sqlite --confirm-live --summary
node --env-file=.env dist/eval/runner/rag-offline.js --dataset eval/rag/retrieval-v4-jovana-clinicaltrials20-2026-11-19.json --embedding-mode real --index data/index/rag-clinicaltrials-20-final.sqlite --reranker cohere --confirm-live --summary
```

### Rezultati na nivou studija

Proseci preko 7 ranking slučajeva (ukupno 10 relevantnih studija):

| Varijanta | nDCG@5 | nDCG@10 | Recall@5 | Recall@10 | MRR@10 | Tačna prva studija |
|---|---|---|---|---|---|---|
| leksička (MiniSearch) | 0,416 | 0,485 | 0,500 | 0,714 | 0,409 | 2/7 |
| vektorska | 0,653 | 0,653 | 0,929 | 0,929 | 0,576 | 3/7 |
| hibridna (RRF) | 0,699 | 0,747 | 0,786 | 0,929 | 0,699 | 4/7 |
| hibridna + deterministički reranker | 0,460 | 0,503 | 0,786 | 0,929 | 0,366 | 1/7 |
| **hibridna + Cohere reranker** | **0,892** | **0,892** | **0,929** | 0,929 | **0,929** | **6/7** |

Sa lažnim embeddings-om, nad istim skupom, vektorska varijanta ima nDCG@10 0,466 i Recall@10 0,571, a hibridna nDCG@10 0,681. Leksička varijanta je u oba režima ista jer ne koristi embeddings.

Negativan slučaj J-RAG-07 (celijakija, nema relevantne studije) ni u jednoj varijanti ne vraća nijednu studiju, što je očekivan ishod.

Na nivou odlomaka nDCG@5 je nizak u svim varijantama (0,12–0,20): odlomci koje je Jovana označila retko su među prvih pet. Matcher ocenjuje sve kriterijume odabranih studija, pa ovo ne menja statuse. Menja samo koji odlomci ulaze u kontekst.

### Nalazi

1. **Stvarni embeddings poboljšavaju vektorsku pretragu.** Prosečan Recall@10 vektorske varijante je 0,929, naspram 0,571 sa lažnim embeddings-om i 0,714 za leksičku pretragu.
2. **Hibridna pretraga je najbolja varijanta bez reranker-a.** U odnosu na samu leksičku pretragu, nDCG@10 raste sa 0,485 na 0,747, a MRR@10 sa 0,409 na 0,699.
3. **Deterministički reranker pogoršava redosled.** nDCG@10 pada sa 0,747 na 0,503, a MRR@10 sa 0,699 na 0,366. Rezultat je lošiji u 4 od 7 slučajeva, bolji u jednom (J-RAG-06, +0,054), a u dva je isti. Isti obrazac postoji i sa lažnim embeddings-om, pa uzrok nije u embeddings-u.
4. **Cohere reranker poboljšava redosled.** nDCG@10 raste sa 0,747 na 0,892, MRR@10 sa 0,699 na 0,929, a tačna prva studija sa 4/7 na 6/7. Rezultat je bolji u 2 od 7 slučajeva (J-RAG-06 +0,667, J-RAG-08 +0,349), a u ostalih 5 je isti; nijedan slučaj nije lošiji. Na nivou odlomaka nDCG@5 raste samo malo (0,122 → 0,165). Jedan poziv je trajao 0,3–0,7 s.

### Ograničenja i podrazumevani reranker

- Sedam ranking slučajeva i deset relevantnih studija ne omogućavaju statistički zaključak; razlike pokazuju smer, ne veličinu efekta.
- Oznake su oznake retrieval relevantnosti jedne osobe, bez kliničkog pregleda.
- Cohere je meren samo nad ovim skupom i samo sa rokom od 2.000 ms. Rang Cohere-a zavisi od spoljnog servisa i verzije modela, pa ponovljeni run može malo da odstupi.
- Lokalni live server u proveri uživo koristio je `RAG_RERANKER=cohere`, a šema konfiguracije je tada podrazumevano postavljala `deterministic`. Na ovom skupu deterministički reranker je lošiji i od hibridne pretrage bez reranker-a, a Cohere je najbolji. Zato je podrazumevana vrednost promenjena: bez podešenog `RAG_RERANKER` koristi se `cohere` kada postoji `COHERE_API_KEY`, a inače `disabled` (`docs/decisions.md`).
