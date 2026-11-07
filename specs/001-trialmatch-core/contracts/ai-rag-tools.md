# Ugovori AI, pronalaženja i determinističkih alata

Ovaj ugovor opisuje dozvoljene granice modela, RAG toka i alata. LLM nema ovlašćenje nad statusom podobnosti, korisničkim podacima izvan tekuće provere ili proizvoljnim sistemskim operacijama.

## AI adapter

### Strukturisano izdvajanje profila i namere

**Ulaz**: Korisnički tekst iz jedne provere i ugovoreni opis dozvoljenih polja.

**Izlaz**: Strukturisani kandidat profila sa samo podržanim poljima, poreklom i listom nejasnoća; klasifikacija namere kao provera podobnosti, izvorno pitanje ili zabranjeni zahtev, kada je prepoznata. Za `source_question` izlaz sadrži i eksplicitno pitanje koje se pretražuje; izvorni tekst profila se ne čuva. Izlaz se validira prema runtime šemi. Tip ili ispravan JSON tekst sam po sebi nije dokaz validnosti.

**Neuspeh i redosled**: Izdvajanje vraća nameru zajedno sa profilom. Za `diagnosis_request`, zahtev za savetom o lečenju ili odluku o uključivanju server postavlja `rejected` pre bilo kog alata i bez poziva matchera. Za izvorno pitanje o podatku koji nije dostupan u lokalnom skupu studija/odlomaka, server vraća `insufficient_evidence` sa `not_in_sources` bez odgovora iz opšteg znanja i bez poziva matchera. Primer iz brief-a je pitanje o neželjenim dejstvima leka, jer lokalni korpus sadrži kriterijume podobnosti, a ne neželjena dejstva. Svaki izlaz prolazi kroz jedinstveni `generateStructured` omotač. Nevažeći izlaz dobija najviše jednu popravku, koja se računa u `MAX_MODEL_CALLS_PER_RUN`; posle neuspeha sledi `error`, a matcher i alati ostaju nepozvani. Izlaz koji nije validiran nikada ne stiže do matchera. Nedostajuća polja ostaju odsutna.

### Hipotetička izmena profila

Ruta za hipotezu koristi zaseban strukturisani izlaz koji sadrži samo eksplicitno navedeni profilni patch i dvosmislenosti. Patch se validira pre spajanja sa profilom izvršavanja; polja koja nisu navedena ostaju nepromenjena, a poreklo izmenjenih polja postaje `hypothesis`. Izmena ne može da promeni nameru zahteva u dozvolu za dijagnozu, lečenje ili odluku o uključenju. Nevalidan, dvosmislen ili zabranjen patch vraća HTTP 400 kontrolisanu grešku pre alata/matchera, bez izmene sačuvanog izvršavanja. Poziv i eventualna popravka validnog strukturisanog izlaza troše isti ukupni budžet izvršavanja.

### Objašnjenje rezultata

**Ulaz**: Konačni serverski statusi/kriterijumi, već izračunate vrednosti i samo odlomci koji su izabrani i dostupni ovom izvršavanju. Odgovor na pitanje za dopunu parsira se deterministički i ne troši model poziv.

**Izlaz**: Objašnjenje na srpskom i reference na izvorne odlomke. Citati ostaju na izvornom jeziku. Brojevi u tekstu moraju se poklapati sa vrednostima iz rezultata.

**Neuspeh**: Nepostojeći ID izvora, citat van odlomka, broj koji nije u izračunatim vrednostima ili nedovoljno potkrepljena tvrdnja ne prikazuju se kao dokaz. Ako modelov izlaz ne prođe provere ili nema preostalog budžeta za model, sistem koristi odobreno serversko objašnjenje iz šablona; ne troši dodatni poziv i ne prikazuje nepotkrepljenu tvrdnju.

### Budžet modela i adapter

- `MAX_MODEL_CALLS_PER_RUN=4` naplativa poziva po izvršavanju; pokušaj popravke se računa. Mrežni retries za timeout/429/5xx su najviše 2 posle prvog pokušaja, sa pauzama 500 ms i 1500 ms, i ne računaju se u ovaj budžet. `MODEL_TIMEOUT_MS=20000`, `RUN_TIMEOUT_MS=60000`. Broj naplativih poziva i broj mrežnih pokušaja beleže se odvojeno.
- Hipotetička izmena profila nije runda odgovora na pitanje; svaka dopuna koju zatraži ponovna procena ulazi u `MAX_QUESTION_ROUNDS`.
- Provajder i model nisu izabrani; mock adapter pokriva offline/demo tok. Živa integracija ostaje posebna faza.
- Model i verzija prompta beleže se u metapodacima/tragu, uz izostavljanje tajni i unutrašnjeg lanca rezonovanja.
- Model ne bira status, ne procenjuje pravila, ne računa jedinice/eGFR/BMI, ne bira sledeće pitanje i ne odobrava alat.

## Deterministički registar alata

Sva imena i ulazi prolaze runtime validaciju. Poslovna pravila i dozvoljeni opseg proveravaju se pre pristupa podacima. Efekat svih dole navedenih alata je lokalni izračun ili samo čitanje. Izvršilac odbija nepoznato ime ili argument izvan dozvoljenog opsega. Najviše 10 poziva alata po izvršavanju; svaki poziv ima `TOOL_TIMEOUT_MS=2000` i podleže ukupnom `RUN_TIMEOUT_MS=60000`. Lokalna greška determinističkog alata odmah završava kontrolisanim `error`; mrežni retry se ne primenjuje na alate.

| Naziv | Svrha i ulaz | Izlaz | Ograničenja, efekti i greške |
|---|---|---|---|
| `compute_egfr` | Validirani starost, `sex=male|female` i kreatinin sa jedinicom. | Broj, jedinica, naziv CKD-EPI 2021 formule i izvor. | Deterministički, bez mreže i upisa. Odbija odsutne ili tehnički nevažeće vrednosti; eGFR se ne računa dok pol nije jasan. Formula NIDDK/CKD-EPI 2021, izvorna publikacija i kontrolne vrednosti navedeni su u brief-u; test tolerancija je ±0,01. |
| `compute_bmi` | Validirani visina i težina sa jedinicama. | BMI, jedinica i referenca formule. | Deterministički, bez mreže i upisa. Odbija nedostajuće ili tehnički nevažeće vrednosti. CDC formula i kontrolna vrednost navedeni su u brief-u; test tolerancija je ±0,01. |
| `evaluate_criteria` | Validirani profil, pravila koja su dozvoljena za automatsku procenu i njihovi izvori. | Status `met`, `not_met` ili `unknown` za svaki kriterijum, opažena vrednost i ID/odlomak izvora. | Deterministički, samo za čitanje. Nedostajuće, nejasno, nedostupno ili `manual_review` ostaje `unknown`; pravilo koje nije pregledano ne ocenjuje se. Greška ne daje uspešan rezultat. |
| `select_next_question` | Neisključene studije i nepoznati kriterijumi po polju. | Jedno pitanje, polje i broj studija koje bi odgovor razrešio. | Deterministički. Maksimizuje broj studija sa nepoznatim kriterijumom na polju; izjednačenje: broj studija gde je to jedina nepoznanica, pa naziv polja abecedno. Ne izmišlja vrednost. |

### Ugovor alata — obavezna polja

Pre implementacije za svaki alat beležiti: ime, svrhu, Zod ulaz i izlaz, dozvoljeni skup podataka, efekte (nema ili samo čitanje), kategorije grešaka i timeout. Za izvršioca alata važi potvrđeni `TOOL_TIMEOUT_MS=2000`.

## RAG / pronalaženje

### Ulaz i izlaz internog toka

**Ulaz**: Validirani sintetički profil, samo pregledane studije/pravila iz aktivnog korpusa i verzija manifesta. Ako vrednost nedostaje, pretraga je ne sme tretirati kao potvrđen filter.

**Izlaz**: Kandidat-studije i odabrani izvorni odlomci sa stabilnim `sourceId`, `trialId`, vrstom `inclusion | exclusion`, originalnim tekstom i metapodacima. Ovaj tok je serverski servis; nije proizvoljan mrežni ili SQL alat dostupan modelu.

### Redosled faza

1. Filtriranje metapodataka po stanju, statusu regrutacije i poljima iz strukturisanog izvora. Starost je tvrdi filter samo ako je poznata.
2. Pretraga MiniSearch-a preko polja sa težinama: `title=2`, `conditions=1`, `criteria=1`; zadržati najviše 10 kandidata i do 5 odlomaka ukupno. Korpus sadrži pregledane studije iz `data/trials/`; sintetičke fixture studije dolaze iz `data/fixtures/` u evaluaciji.
3. Rerangiranje kandidata preko zamenljivog sučelja: prvo broj automatski proverljivih kriterijuma sa dostupnim vrednostima, zatim broj kriterijuma koji mogu biti razjašnjeni dopunom, pa ID studije. Ovo bira kontekst i ne utiče na matcher presudu. Redosled konačnog prikaza rezultata je zasebno po presudi (`candidate`, `pending`, `excluded`), opadajućem udelu kriterijuma `met`, pa NCT ID-ju normalizovanom na velika slova i sortiranom rastuće leksikografski.
4. Ograničavanje konteksta po `MAX_CONTEXT_CHARS=12000` i predaja samo izabranih odlomaka, jasno obeleženih kao nepouzdan sadržaj.
5. Provera svakog citiranog `sourceId` prema skupu za tekući `runId` i poređenje `quote` sa tačnim izvornim tekstom.

### Rezervni tok

- Bez kandidata: kontrolisani `insufficient_evidence` sa `no_matching_trial`.
- Ako korisnik u `profileText` pita za činjenicu koja nije u lokalnim izvorima (na primer neželjena dejstva leka kada korpus sadrži samo kriterijume podobnosti), vratiti `insufficient_evidence` sa `not_in_sources`; ne odgovarati iz opšteg znanja. Ovo je ograničen negativni tok, ne opšta Q&A funkcionalnost.
- Nedovoljno odlomaka za objašnjenje: nema citirane tvrdnje; odgovor se sužava na ono što je podržano ili završava kontrolisanim nedovoljnim dokazom.
- ID izmišljenog ili nedostupnog izvora: citat se odbacuje i nikada se ne prikazuje.

### Granica provere potkrepljenosti

Provera `sourceId`-ja i tačnog izvornog teksta može deterministički da utvrdi poreklo citata, ali ne i semantičku istinitost proizvoljne parafraze. Server ne prikazuje nedostupan citat ili broj koji nije u rezultatima; ako objašnjenje ne prođe ove provere, koristi se serverski šablon. Semantička podrška citata proverava se pregledom evaluacionih primera, bez tvrdnje da je automatski dokazana.

## Prompt injection i granica poverenja

- Korisnički tekst i tekst studije su nepouzdani podaci, ne instrukcije. Obeležavaju se kao takvi u modelskom kontekstu.
- Prompt može tražiti ignorisanje instrukcija unutar teksta, ali se bezbednost ne oslanja na tu rečenicu: server sprovodi fiksni registar, runtime validaciju, poslovna pravila i opseg argumenata.
- Model dobija samo izabrane odlomke i nema proizvoljan pristup fajl-sistemu, shell-u, SQL-u, mrežnim adresama, tajnama ili drugim izvršavanjima.
- Tvrdnje i citati prolaze proveru porekla; brojevi moraju odgovarati determinističkim vrednostima.
- EV-10 ostaje real_model. Odvojena `EV-10-offline provera` poredi izlaz matchera za isti profil sa čistom i zlonamernom probnom studijom i proverava odbijanje poziva van allowlist-a; ne računa se kao izvršen EV-10. Nijedan mali test ne dokazuje otpornost na sve napade.
- U trace se ne upisuju ključevi, nepotrebni podaci profila ni skriveni lanac rezonovanja.

## Offline pravila

`compile:rules` je lokalni pripremni tok za pretvaranje kriterijuma u predlog pravila. Izlaz nije dozvoljen matcher ulaz dok čovek ne pregleda i potvrdi pravilo, poreklo i citat. U osnovnoj fazi fixture pravila su ručno pripremljena. Ova skripta nije runtime alat dostupan iz korisničke provere.
