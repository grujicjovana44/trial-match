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

## RAG retrieval evaluacija

`eval/rag/retrieval-v1.json` i `baseline-v1.json` ostaju nepromenjeni. `retrieval-v2.json` uvodi schema v2 i prenosi postojeće predloge kao `proposed`; `reviewer` i `reviewedAt` su `TODO` dok ih čovek ne potvrdi. Relevance rule beleži unapred definisano pravilo koje anotator primenjuje bez uvida u retrieval izlaz. V1 i v2 su povezani sa korpusom `rag-corpus-v0-dev` od pet studija: sva eventualna merenja na njemu su **razvojno, bez zaključaka** i nisu dokaz kvaliteta. Nema novog/većeg gold skupa na tom korpusu.

V2 razdvaja `ranking` od `behavior`: slučajevi za izbor svih studija i fallback bez dijagnoze ne ulaze u recall/precision/MRR/nDCG. Metrike se računaju samo za `ranking` slučajeve sa `labelStatus=confirmed`; proposed/disputed oznake se izuzimaju. Rezultati se odvajaju po `split=dev|test`. Dozvoljeni k cutoff-i su 1..floor(korpusa/2), pa se za pet studija ne računa nijedna metrika sa k većim od 2. Dataset navodi četiri samo-opisna obrasca za korpus v1 (upit bez poklapanja, srpski sinonimi/ćirilica, zlonameran indeksirani odlomak i teški negativi); nema dodeljenih relevantnih studija ili odlomaka dok korpus v1 ne postoji.

`eval:rag:baseline` čita v2 i odbija prepisivanje `baseline-v2.json`; postojeći v1 artefakti se ne menjaju. `pnpm eval:rag:offline` poredi lexical-only, vector-only, hybrid i hybrid+rerank na identičnim case ID-jevima koristeći deterministički lažni embedder. Izveštaj sadrži poredak studija/odlomaka, metrike po ID-ju, paired nDCG delta hybrid→rerank, latenciju svake varijante i paritet/latenciju InMemory/SQLite VectorStore-a. Metrike za predložene/osporene oznake označene su kao `provisional_diagnostic_only`; to ne potvrđuje da reranking pomaže. Samo ljudski potvrđene oznake mogu biti kvalitetni zaključci.

TypeScript `evaluateRagasStyle` računa faithfulness, answer relevancy, context precision i context recall kao lokalne heuristike sa praznim imeniteljima `null`; nije zamena za semantičkog sudiju i ne menja matcher. `eval:rag:live` prihvata samo `eval/rag/ragas-dataset.json` sa `synthetic=true` i `reviewStatus=human-reviewed`, eksplicitno `--confirm-live`, dataset hash approval, tačnu komandu i limite poziva/input bajtova/output tokena. Trošak mora biti odobren kao `maxCost=null` uz priznanje da cena nije dostupna. Runner upisuje neizmenjiv direktorijum i prekida na prekoračenje; u ovom koraku nema live poziva, a reviewed RAGAS dataset/approval nisu dostavljeni.

`node dist/scripts/index-build.js --estimate-only` prikazuje broj studija, dokumenata i procenjene embedding tokene bez API ključa, SQLite fajla ili mrežnog poziva. Trošak je `null` bez proverenog cenovnika/datumskog snapshot-a. `pnpm index:build` je operativni plaćeni korak i čeka odvojeno odobrenje; nije pokrenut. `embeddings:check` je ranije uspeo jednim sintetičkim pozivom, ali taj rezultat ne zamenjuje index build ni retrieval kvalitetnu proveru.

Završna lokalna provera: `pnpm eval:rag:offline` prošao je sa lažnim embedderom. VectorStore ID paritet je `true` za top-20; maksimalna distance razlika bila je `2.384185791015625e-7`. Na predloženim oznakama paired nDCG delta hybrid→rerank iznosi 0 za RAG-001 i +0.3691 za RAG-002; RAG-003/004 nemaju ranking metrike. Svi rezultati su `provisional_diagnostic_only`, pa se iz njih ne zaključuje da reranking pomaže.

Estimate-only nad trenutno podržanim ulazom prijavio je 5 studija, 20 dokumenata, 20 jedinstvenih tekstova i 192 procenjena tokena; cena je `null` jer nema verifikovanog cenovnika. Ovaj korak nije napravio indeks niti pozvao embeddings servis.
