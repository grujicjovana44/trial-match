# Evaluacija

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

`loadRagCorpus` je validaciono učitao 20 jedinstvenih zapisa iz odobrenog paketa i pending importa. `buildRagDocuments` proizveo je 76 dokumenata, uključujući 56 passage dokumenata, ali 300 novih odlomaka iz `data:split` nisu u tim dokumentima: postojeći builder ne čita `eligibilityText` ili import `sources`. Nije pokrenut RAG indeks, retrieval evaluacija, embeddings poziv niti LLM API poziv. Ovi podaci zato nisu RAG quality rezultat i ne menjaju istorijske evaluacione artefakte.

Novi korpus je izolovan u `data/review_candidates/studies_20_2026-11-16/`; `DATA_DIR` i DEMO podrazumevani tok ostaju nepromenjeni. Nove studije ne mogu u matcher dok se ne obavi ljudski pregled i postojeći `compile:rules` approval postupak.

### Provera uvezenog skupa — 2026-11-16

Svih 20 sirovih fajlova je provereno prema SHA-256 vrednostima u manifestu; direktni ClinicalTrials.gov API v2 odgovori za svih 20 zvaničnih URL-jeva podudaraju se po NCT ID-ju, statusu, `statusVerifiedDate` i `lastUpdatePostDateStruct.date`. Svi raw zapisi sadrže eksplicitnu T2D vezu u naslovu, uslovima, sažetku ili eligibility tekstu. Široki search endpoint je vratio prvih 100 rezultata, među kojima nije bilo ovih 20 ID-jeva; taj upit nije paginiran, pa provera ne tvrdi da je prva stranica kompletna niti da sama potvrđuje izbor studija. Svaka studija je proverena zasebnim zvaničnim endpoint-om iz manifesta.

`pnpm data:prepare` prihvatio je 18/18 novih API zapisa bez grešaka redova. `pnpm data:split` i `pnpm rules:draft`, pokrenuti nad postojećim importom, reprodukovali su svih 300 tekstualnih kriterijuma i identičan split fajl; svih 300 citata je doslovni podniz izvornog eligibility teksta, a nijedan zapis nije zahtevao `needs_manual_split`. Svi ostaju `manual_review`/`pending_review`; 26 strukturisanih pol/starost kriterijuma ostaju deterministički proverljiva bez ljudskog odobrenja.

Integracioni test u `apps/server/src/retrieval/corpus.test.ts` potvrđuje da eksplicitni koreni `data/rule_sets/studies_2_approved_20261115_1539/` i `data/review_candidates/studies_20_2026-11-16/import/` daju tačno 20 jedinstvenih studija i 76 dokumenata: 20 studijskih i 56 passage dokumenata. Loader prijavljuje i preskače dva nepodržana JSON metadataka (`manifest.json` i `review-report.json`) u odobrenom direktorijumu. Podrazumevani loader i dalje vraća tri sintetička fixture-a i dve postojeće odobrene studije; 300 izdvojenih tekstualnih kriterijuma nije u passage dokumentima. Ovo je validacija učitavanja i šema, ne RAG indeks ili kvalitet retrieval-a.

Ciljani offline testovi: 8 fajlova, 53 testa su prošla (`prepare-trials`, `split-trials`, `create-rule-draft`, `compile-rules`, shared schemas, corpus/indexing i matcher kriterijumi). `pnpm typecheck`, `pnpm lint` i `pnpm build` su prošli; Vite build je prijavio upozorenje da je najveći minifikovani chunk 500.22 kB, ali je build završen uspešno. `README.md` već opisuje tačne korene, pending status i ograničenje RAG passage sadržaja, pa nije menjan. Nisu pokrenuti puni `pnpm test`, `pnpm smoke`, RAG indeksiranje, embeddings/OpenAI/Gemini pozivi niti je menjana `data/index/rag.sqlite`.

## RAG retrieval evaluacija

`eval/rag/retrieval-v1.json` i `baseline-v1.json` ostaju nepromenjeni. JG je adjudikovao sva četiri slučaja iz `retrieval-v2.json`, uključujući relevantnost BMI odlomka RAG-001. Globalni `annotationStatus` ostaje `pending_human_review` jer su planned patterns samo opisni i nemaju konkretne slučajeve/oznake. Relevance rule beleži unapred definisani kriterijum nezavisan od retrieval izlaza. V1 i v2 su povezani sa korpusom `rag-corpus-v0-dev` od pet studija, pa rezultate treba tumačiti u okviru ovog malog skupa, ne kao opšti dokaz kvaliteta.

V2 razdvaja `ranking` od `behavior`: slučajevi za izbor svih studija i fallback bez dijagnoze ne ulaze u recall/precision/MRR/nDCG. Metrike se računaju samo za `ranking` slučajeve sa `labelStatus=confirmed`; proposed/disputed oznake se izuzimaju. Rezultati se odvajaju po `split=dev|test`. Cutoffs su odvojeni po nivou: studije koriste 1..floor(broj_studija/2), a odlomci 1..floor(broj_odlomaka/2). Time se za pet studija ne ograničava evaluacija odlomaka na k=1/2. Dataset navodi četiri samo-opisna obrasca za korpus v1 (upit bez poklapanja, srpski sinonimi/ćirilica, zlonameran indeksirani odlomak i teški negativi); nema dodeljenih relevantnih studija ili odlomaka dok korpus v1 ne postoji.

`eval:rag:baseline` čita v2 i odbija prepisivanje `baseline-v2.json`; postojeći v1 artefakti se ne menjaju. `pnpm eval:rag:offline` podrazumevano poredi lexical-only, vector-only, hybrid i hybrid+rerank koristeći deterministički hash embedder. To su simulirani/noisy vektori, nisu dokaz semantičkog kvaliteta. Za validnu proveru vektorskog retrieval-a koristite `pnpm eval:rag:offline -- --embedding-mode real --cases RAG-001,RAG-002`: čita postojeći `data/index/rag.sqlite`, validira manifest i potpune ID/hash potpise indeksiranih dokumenata, a OpenAI klijent pravi samo nedostajuće query embeddige i čuva ih u postojećem kešu. Ulazni evaluacioni izvori zasebno se proveravaju prema zamrznutim hash-evima. Ovaj režim nikada ne gradi indeks; odbija se ako indeks ili API ključ ne postoje. `--cases` omogućava ciljanu proveru bez pune evaluacije. Režimi fake/real imaju odvojene identifikatore i direktorijume rezultata i ne smeju se spajati. Izveštaj prikazuje top-5 ID-jeva i relevantnost svakog odlomka, passage cutoffs do k=5 gde ih broj odlomaka dozvoljava, metrike studija (`studyMetrics`), metrike odlomaka (`passageMetrics`), paired nDCG delta hybrid→rerank i fake režimom paritet/latenciju VectorStore-a. Metrike za predložene/osporene oznake označene su kao `provisional_diagnostic_only`; samo potvrđene oznake mogu biti kvalitetni zaključci.

TypeScript `evaluateRagasStyle` računa faithfulness, answer relevancy, context precision i context recall kao lokalne heuristike sa praznim imeniteljima `null`; nije zamena za semantičkog sudiju i ne menja matcher. `eval:rag:live` prihvata samo `eval/rag/ragas-dataset.json` sa `synthetic=true` i `reviewStatus=human-reviewed`, eksplicitno `--confirm-live`, dataset hash approval, tačnu komandu i limite poziva/input bajtova/output tokena. Trošak mora biti odobren kao `maxCost=null` uz priznanje da cena nije dostupna. Runner upisuje neizmenjiv direktorijum i prekida na prekoračenje; u ovom koraku nema live poziva, a reviewed RAGAS dataset/approval nisu dostavljeni.

`node dist/scripts/index-build.js --estimate-only` prikazuje broj studija, dokumenata i procenjene embedding tokene bez API ključa, SQLite fajla ili mrežnog poziva. Trošak je `null` bez proverenog cenovnika/datumskog snapshot-a. Odobreni `pnpm index:build --confirm-large` pokrenut je nad 5 studija i 20 tekstova: prvi prolaz je poslao 20 tekstova u 1 embeddings pozivu, procena je bila 192 tokena, a provajder je prijavio 290 tokena. Drugi prolaz je ponovo iskoristio svih 20 tekstova i imao 0 poziva/0 tokena. Manifest navodi `text-embedding-3-small` i 1536 dimenzija; `data/index/` postoji i git ga ignoriše. Cena ostaje `null` jer nema proverenog cenovnika/datumskog snapshot-a.

Završna lokalna provera posle adjudikacije: `pnpm eval:rag:offline` prošao je sa lažnim embedderom. VectorStore ID paritet je `true` za top-20; maksimalna distance razlika bila je `2.384185791015625e-7`. Na k=2, osnovni hybrid nDCG za studije je 1.0000 za RAG-001 i 0.6309 za RAG-002; nDCG za odlomke je zasebno 0.0000 za oba slučaja. Sa determinističkim hybrid+rerank-om nDCG za studije je 1.0000 za oba, dok je nDCG za odlomke i dalje 0.0000 za oba. Uparene delte 0.0000 i +0.3691 računaju se isključivo iz `studyMetrics[at2].ndcg`; ne koriste i ne zavise od oznaka odlomaka. RAG-003/004 nemaju ranking metrike. Dva slučaja na korpusu od pet studija nisu dovoljna za zaključak da reranking generalno pomaže.

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
