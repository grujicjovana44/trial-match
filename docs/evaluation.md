# Evaluacija

## Fiksni slučajevi i režimi

`eval/cases.jsonl` čuva stabilnih 16 slučajeva, sintetičke ulaze, režime, očekivane osobine i zabranjene ishode. `real_model`, `offline` i `simulated_fault` ostaju različiti režimi i rezultati se ne spajaju u jednu metriku.

EV-07, EV-08 i EV-09 ostaju `real_model`. U Fazi 1 mogu se pokrenuti kao dry-run sa skriptovanim odgovorom mock adaptera radi provere učitavanja slučaja, povezivanja fixture-a i izvršnog okvira. Dry-run se u rezultatu označava `dry_run`, ne emituje prolaz/neuspeh EV slučaja i nikada ne ulazi u broj EV pass rezultata. Pravi EV-07–EV-09 zahtevaju kasniju živu evaluaciju.

EV-10 ostaje `real_model`. Dodatna provera pod imenom **EV-10-offline provera** je zaseban deterministički test: isti profil se proverava nad čistom probnom studijom i nad njenom varijantom sa zlonamernom instrukcijom. Izlaz matcher-a mora biti identičan, a registar mora odbiti svaki poziv alata koji nije na dozvoljenoj listi. Ova provera se beleži pod svojim imenom i nikada se ne označava kao izvršeni ili prošli EV-10.

B-03 je razrešen korisnički dostavljenim izvorima, formulama, konverzijama i kontrolnim vrednostima u `docs/project-brief.md`. EV-01, EV-02 i EV-04 mogu proveravati numeričke obračune koristeći navedene kontrolne vrednosti i toleranciju ±0,01. Tehnički sanity-check opsezi ne predstavljaju medicinske/laboratorijske referentne opsege.

## Zlatni skup parsiranja

Faza 1 definiše format anotacije, učitavač i skriptu za izračunavanje preciznosti i odziva. Početni skup sadrži 6–10 označenih primera iz sintetičkih probnih studija. Primeri proveravaju izdvajanje polja koja su eksplicitno prisutna; ne uvode nove kliničke pragove. Pun skup od oko 30 ručno označenih kriterijuma pripada Fazi 2.

Prijavljuju se broj tačnih pozitivnih, lažno pozitivnih i propuštenih polja uz preciznost i odziv. Prazan ili nevažeći skup ne sme da se prikaže kao rezultat 0% ili uspeh; prijavljuje se kao neizračunljiv ulaz.

## Rezultati i baseline

EV-06 uključuje dva različita događaja u istom izvršavanju: odgovor na pitanje o insulinu, pa eksplicitnu hipotetičku izmenu HbA1c. Provera obuhvata isti `runId`, očuvanje svih nepomenutih validiranih polja i odsustvo ponovljenog pitanja o već razrešenom insulinu. Rezultat posle hipoteze zamenjuje prethodni trenutni rezultat, ne otvara novo izvršavanje.

Faza 1 priprema offline/fault evaluator i zapis rezultata, ali ne izmišlja niti kreira živi baseline. Baseline nastaje tek u kasnijem odobrenom živom pokretanju i posle toga se ne prepisuje. Poređenje koristi iste ID-jeve slučajeva i prikazuje sve ishode i regresije.

EV-01–EV-09 se grupišu kao funkcionalni slučajevi, EV-10 kao bezbednosni slučaj, a EV-11–EV-16 kao determinističke/fault provere; uz svaku grupu se vidi stvarni režim i da li je slučaj izvršen ili preskočen. Dodatne offline provere, uključujući EV-10-offline provera, prikazuju se odvojeno.

Živi model može imati trošak. Živa evaluacija se pokreće samo uz izričitu potvrdu i odvojena je od testova i CI-ja. Rezultati nikada ne biraju samo najbolje pokušaje.
