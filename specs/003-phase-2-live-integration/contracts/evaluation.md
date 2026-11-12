# Evaluacija, trošak i prvo kreiranje baseline-a

Sve nove opcije u ovom dokumentu su PLANIRANE, nisu sada dostupne. Postojeći eval:live je onemogućen. Ne pokretati živi model tokom pripreme 003.

## Planirani ulaz komande

`pnpm eval:live --confirm-live --label baseline --cases eval/cases.jsonl --dataset fixtures --max-model-attempts <N> --max-input-tokens <N> --max-output-tokens <N> --approval <lokalni-zapis.json>`

Potvrdni flag nema podrazumevanu vrednost. Jedini dataset za 16 fiksnih slučajeva je fixtures; raw/trials/corpus se odbijaju pre poziva. Sva tri limita su pozitivni celi brojevi i obavezna; pokušaji uključuju retry/popravke, ne samo logičke pozive. Pre svakog poziva proveriti preostali limit i podesiti maksimalni izlaz; ako tačna ulazna tokenizacija nije dostupna bez mreže, koristiti konzervativnu granicu i prijaviti ograničenje procene, ne pretvarati karaktere u precizne tokene. Minimalno čvrsto ograničenje je broj pokušaja i maksimalni izlaz po pozivu; nedostupna potrošnja ostaje null.

Approval zapis sadrži čoveka, datum, provider/model, tačnu komandu, caseSet hash, broj slučajeva, dopuštene pokušaje/tokene i odobrenu potrošnju. Ako postoji proverena cena, dodati `--max-cost <decimal> --currency <oznaka> --price-snapshot <lokalni-json>` sa modelom, cenom i datumom; ako ne postoji, procena je „nije dostupna“ i čovek odobrava izričite tehničke granice uz tu nepoznanicu. CLI flag nije zamena za ljudsku dozvolu neposredno pre slanja. API ključ se unosi lokalno na serveru, nikada u approval zapis. Model je gemini-3.5-flash-lite; pristup dokumentaciji ne odobrava plaćeni poziv.

## Redosled

1. Proveriti konfiguraciju/prisustvo ključa bez ispisivanja, verzije, sintetički dataset, integritet slučajeva i approval.
2. Zamrznuti očekivanja/hash-ove pre prvog punog živog pokušaja, uključujući eksplicitne sledove EV-03/06/10 i značenje EV-04 compute_egfr broja. EV-02 nedorečenost pola rešiti pre zamrzavanja, bez nagađanja.
3. Atomski rezervisati eval/results/baseline/ (mkdir bez exist_ok/recursive final target); ako postoji i prazan ili prekinut, stati pre modela, prijaviti run metadata/poreklo ili odsustvo metadata. Ne brisati/renamovati radi zamene.
4. Odmah zapisati manifest status=reserved/running. Svaki slučaj i redigovan događaj upisati kako nastane; završetak piše summary atomski. Pri exception/signal prekidu sačuvati interrupted i započeti/neizvršene slučajeve; oporavak posle pada čita postojeći dnevnik bez izmene prethodnih ishoda.
5. Prvo kompletno živo pokretanje postaje baseline, uključujući neuspehe. Prekinuta prva rezervacija se čuva; ne pokretati zamenski baseline bez zasebne ljudske odluke o nastavku istog dokaza. Nema automatskog brisanja, dopunjavanja „iz sećanja“ ili odabira boljeg pokušaja.

Za ponovljivost preferirati korisnikov commit implementacije; agent ga ne pravi. Za dirty tree sačuvati dirty=true, hash redigovanog diff-a i spisak relevantnih fajlova, bez sadržaja env/tajni. Podaci: caseSet/fixture/prompt/schema/rules verzije i hash, model/provider/settings, stvarni pokušaji, alati i argumenti, vremena, validacija, izvori, kategorije grešaka i dostupni tokeni. Redakcija po allowlist-i; ne snimati ceo provider odgovor.

## Slučajevi i metrike

EV-01–EV-10 zadržavaju real_model definicije; EV-07 sme 0 modelskih poziva ako je zakonski prekinut pre modela prema brief-u, uz zabeležen razlog. EV-11 je offline, EV-12–EV-16 simulated_fault i tokom kompletnog pokretanja ne pozivaju provajdera. Svaki slučaj koristi aplikacionu servis/API putanju i stvarnu kontrolu granica; fault injection je interni dependency override, nikada javni HTTP parametar/endpoint. EV-10 koristi tačno definisane čiste/zlonamerne fixture varijante; test izvan evaluacije EV-10-offline provera nije njegov prolaz.

Prikazati odvojeno funkcionalne EV-01–09 k/n samo izvršenih; bezbednosni EV-10; offline/fault EV-11–16; gold kriterijume; podršku citata; trajanje i potrošnju. Slučaj prolazi samo ako sve obavezne provere prolaze. Dry-run/skipped/interrupted nemaju PASS i ne ulaze u imenilac izvršenih. Izveštaj zadržava broj planiranih/preskočenih, tako da manji imenilac ne skriva nedovršenost. Corpus i UI provere su odvojeni rezultati, ne zamena fixture očekivanja.

## Zlatni skup kriterijuma

Postojeći eval/gold-set.jsonl ostaje osam profilnih mock primera. Novi eval/gold-criteria.jsonl ima cilj 30 ljudski označenih kriterijuma (ako odstupa, prijaviti stvarni broj i razlog), verzije izvora i reviewer/date. Predikcije su zaseban fajl, nikada isti objekat kao expected. Q4 zabranjuje modelsko generisanje pravila: za 003 predikcije lokalnog ručnog/strukturisanog import procesa proveravaju se prema ljudskom skupu i izveštaj kaže metod=local/manual; to NIJE kvalitet živog modelskog parsiranja kriterijuma. Ako tim kasnije želi živu metriku parsiranja pravila, potrebna je nova odluka koja menja Q4, zaseban trošak i novi dokaz.

Jedinica merenja je normalizovan atom (sourceId, kind, field, operator, value, unit, checkability). Tačno poklapanje je TP; dodatni/pogrešni atom FP; propušten očekivani atom FN. Pogrešna vrednost daje FP+FN. Precision=TP/(TP+FP), recall=TP/(TP+FN); nulti imenilac je null/neizračunljivo. Broj kriterijuma, broj atoma i manual_review stavke navesti posebno. Ručno prepisani expected kao predictions nisu nezavisno merenje; review mora potvrditi poreklo oba skupa. Ljudski pregled podrške citata odvojeno beleži podržano/nepodržano/neodlučeno uz imenioce.

Provere: rezervacija pre transporta, dupli konkurentni start, zabrana prepisivanja, prekid/partial flush, nedostatak odobrenja/ključa, razdvajanje fixture/korpusa, svi EV režimi i očekivanja, brojači alata, neizvršeno nije PASS, wrong-value FP+FN, bez tajni. Faza 3 optimizacija/ponovno poređenje i Faza 4 predaja nisu deo ove sesije ili Faze 2 implementacije.
