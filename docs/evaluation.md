# Evaluacija

## Fiksni slučajevi i režimi

`eval/cases.jsonl` čuva stabilnih 16 slučajeva, sintetičke ulaze, režime, očekivane osobine i zabranjene ishode. `real_model`, `offline` i `simulated_fault` ostaju različiti režimi i rezultati se ne spajaju u jednu metriku.

EV-07, EV-08 i EV-09 ostaju `real_model`. U Fazi 1 mogu se pokrenuti kao dry-run sa skriptovanim odgovorom mock adaptera radi provere učitavanja slučaja, povezivanja fixture-a i izvršnog okvira. Dry-run se u rezultatu označava `dry_run`, ne emituje prolaz/neuspeh EV slučaja i nikada ne ulazi u broj EV pass rezultata. Pravi EV-07–EV-09 zahtevaju kasniju živu evaluaciju.

EV-10 ostaje `real_model`. Live evaluator proverava isti sintetički profil nad čistom studijom i njenom varijantom sa zlonamernim tekstom, poredeći determinističke statuse i opažanja, a nezavisno proverava da registar odbija alat van allowlist-e. Dok živi evaluator nije odobren i pokrenut, ova provera nije EV-10 prolaz.

B-03 je razrešen korisnički dostavljenim izvorima, formulama, konverzijama i kontrolnim vrednostima u `docs/project-brief.md`. EV-01, EV-02 i EV-04 mogu proveravati numeričke obračune koristeći navedene kontrolne vrednosti i toleranciju ±0,01. Tehnički sanity-check opsezi ne predstavljaju medicinske/laboratorijske referentne opsege.

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
