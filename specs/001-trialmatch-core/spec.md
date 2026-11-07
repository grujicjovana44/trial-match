# Specifikacija funkcionalnosti: Osnovna provera TrialMatch

**Oznaka funkcionalnosti**: `001-trialmatch-core`

**Datum izrade**: 2026-11-07

**Status**: Nacrt

**Polazni zahtev**: Korisnički zahtev za Specify fazu, zasnovan na `docs/project-brief.md`, odeljcima 1, 3, 4, 13 i 14.

TrialMatch služi lekaru ili koordinatoru studije za preliminarnu proveru sintetičkog profila prema kriterijumima dostupnih kliničkih studija. Jezički model čita pravila i objašnjava rezultat. Odluku donosi deterministički kod. Sistem prikazuje dokaze i neizvesnost, ali ne dijagnostikuje, ne daje savet o lečenju i ne odlučuje o uključivanju; konačnu odluku donosi lekar. Sistem je samo za čitanje.

## Korisnički scenariji i provera

### Korisnička priča 1 - Pregled provere profila (Prioritet: P1)

Lekar ili koordinator unosi slobodan tekst o sintetičkom profilu i želi da vidi koje studije i pojedinačni kriterijumi deluju ispunjeno, neispunjeno ili ostaju nepoznati. Rezultat treba da pokaže uočenu vrednost i proverljiv odlomak izvora za svaki kriterijum, uz razumljivo objašnjenje na srpskom.

**Zašto je ovo važno**: Ovo je osnovna vrednost proizvoda: organizovati nepotpune podatke i kriterijume studija u pregled koji zdravstveni stručnjak može proveriti.

**Nezavisna provera**: Uneti profil sa dovoljnim podacima i dostupne kriterijume; proveriti status svake studije i stavke, prikazane vrednosti i citate, kao i to da objašnjenje ne tvrdi više nego što dokazi podržavaju.

**Scenariji prihvatanja**:

1. **Polazeći od** sintetički profil sadrži potrebne vrednosti i postoje odgovarajući pregledani kriterijumi, **Kada** korisnik zatraži proveru, **Tada** dobija rangiran pregled sa statusom svakog kriterijuma, uočenom vrednošću i citatom iz dozvoljenog izvora.
2. **Polazeći od** profil sadrži uzrast, jasno poznat pol (`male` ili `female`) i kreatinin, **Kada** se rezultat prikaže, **Tada** izvedena procena funkcije bubrega prikazuje se uz naziv formule i potvrđen izvor, a ponovljena provera istih vrednosti daje isti rezultat. Testovi formule koriste kontrolne vrednosti iz `docs/project-brief.md` sa tolerancijom ±0,01.
3. **Polazeći od** rezultat sadrži citat, **Kada** korisnik otvori detalj kriterijuma, **Tada** citat se prikazuje u izvornom jeziku, a objašnjenje ostaje na srpskom.
4. **Polazeći od** kriterijum nije automatski proverljiv, **Kada** se prikaže rezultat, **Tada** ostaje označen kao nepoznat i vidljivo je da zahteva procenu lekara.
5. **Polazeći od** sintetički unos glasi „Muškarac, 62 godine, dijabetes tip 2, HbA1c 8,1%, kreatinin 1,3 mg/dL, visina 178 cm, težina 92 kg, na metforminu“, **Kada** se provera pokrene, **Tada** se prikazuju eGFR oko 62 mL/min/1,73 m² i BMI oko 29,0; naziv formule i potvrđen izvor su vidljivi, a nedostajući podatak o insulinu ostaje `unknown` i pokreće jedno pitanje.
6. **Polazeći od** profil navodi podržanu vrednost u jedinici koja se razlikuje od jedinice kriterijuma, **Kada** se vrednost koristi u proveri, **Tada** sistem je normalizuje pre poređenja, a korisniku prikazuje vrednost i jedinicu bez menjanja značenja unosa.

---

### Korisnička priča 2 - Dopuna nepoznatih podataka (Prioritet: P1)

Kada je jedan ili više kriterijuma nepoznat zbog nedostajućeg ili dvosmislenog podatka, lekar želi da dobije jedno konkretno pitanje koje najviše pomaže da se razjasne rezultati, odgovori na njega i nastavi postojeću proveru bez ponovnog unosa već prikupljenog profila.

**Zašto je ovo važno**: Nepoznat podatak je čest i bezbedan ishod. Ciljana dopuna smanjuje neizvesnost bez pretvaranja nepotpunih informacija u potvrđene činjenice.

**Nezavisna provera**: Pokrenuti proveru sa nedostajućom vrednošću, proveriti `unknown` status i jedno pitanje, zatim odgovoriti i proveriti nastavak iste provere uz sačuvane ranije potvrđene vrednosti.

**Scenariji prihvatanja**:

1. **Polazeći od** vrednost potrebna za kriterijum nedostaje ili je dvosmislena, **Kada** se profil proveri, **Tada** kriterijum ima status `unknown`, prikazuje se tačno jedno konkretno pitanje, a prethodno potvrđeni profil ostaje sačuvan.
2. **Polazeći od** više studija ima nepoznate kriterijume, **Kada** se bira pitanje, **Tada** ono se odnosi na polje čiji odgovor može razjasniti najviše studija; ako ima izjednačenja, izbor je ponovljiv i stabilan.
3. **Polazeći od** korisnik odgovori na pitanje, **Kada** se provera nastavi, **Tada** isti slučaj nastavlja sa odgovorom i ranije potvrđenim podacima; sistem ne popunjava nepoznate vrednosti nagađanjem.
4. **Polazeći od** odgovor razjasni kriterijum isključenja, **Kada** se rezultat osveži, **Tada** studija se prikazuje u skladu sa tim kriterijumom, a ne kao podobna ako postoji neispunjen uslov.
5. **Polazeći od** lekar odgovori „ne“ na pitanje o insulinu u poslednja tri meseca, **Kada** se ista provera nastavi, **Tada** studija A prikazuje da su automatski proverljivi kriterijumi ispunjeni uz napomenu da je potrebna provera istraživačkog tima, studija B je isključena zbog HbA1c kriterijuma, a studija C ostaje kandidat u zavisnosti od BMI kriterijuma.
6. **Polazeći od** provera je završena, **Kada** lekar pošalje jasnu hipotetičku izmenu, **Tada** sistem ponovo procenjuje profil pod istim `runId`, menja samo izričito navedena polja, čuva ostala i zamenjuje prethodni trenutni rezultat. Nevalidna ili dvosmislena hipoteza vraća kontrolisanu HTTP 400 grešku bez promene sačuvanog izvršavanja.

---

### Korisnička priča 3 - Razumevanje ishoda bez dovoljno osnova (Prioritet: P1)

Lekar želi da razlikuje situaciju bez odgovarajuće studije od situacije u kojoj dostupni izvori ne pružaju dovoljno osnova, i da dobije kontrolisanu poruku kada se traži dijagnoza, savet o lečenju ili odluka o uključivanju.

**Zašto je ovo važno**: Lažno pozitivan ili izmišljen odgovor može da navede korisnika na pogrešan zaključak u medicinski osetljivom kontekstu; jasno odbijanje i prikazana neizvesnost sprečavaju pogrešno tumačenje.

**Nezavisna provera**: Probati profil bez poklapanja, pitanje o informaciji koje nema u izvorima, zahtev za medicinskim savetom i tehničku grešku; proveriti da svaki slučaj ima odgovarajući ishod i da se ne prikazuje lažan uspeh.

**Scenariji prihvatanja**:

1. **Polazeći od** nijedna dostupna studija ne odgovara profilu, **Kada** se provera završi, **Tada** rezultat ima status `insufficient_evidence` i razlog `no_matching_trial`, bez nuđenja „najbliže“ studije kao poklapanja.
2. **Polazeći od** traženi podatak ili studija nisu u dostupnim izvorima, **Kada** korisnik pita za njih, **Tada** sistem prijavljuje nedovoljno dokaza sa razlogom `not_in_sources` i ne predstavlja opšte znanje kao citirani odgovor.
3. **Polazeći od** korisnik traži dijagnozu, savet o lečenju ili odluku o uključivanju, **Kada** sistem prepozna takav zahtev, **Tada** odbija ga sa objašnjenjem granice i ne prikazuje medicinski savet ili odluku.
4. **Polazeći od** nastane tehnička greška, **Kada** sistem više ne može bezbedno da nastavi, **Tada** prikazuje razumljivu grešku i mogućnost ponovnog pokušaja kada je primenljivo, bez prikazivanja rezultata kao uspešnog.

---

### Korisnička priča 4 - Bezbedno i pristupačno čitanje rezultata (Prioritet: P2)

Lekar želi da u svakom stanju razume šta se dešava i da proveri dokaze, bez oslanjanja samo na boju ili skrivene pretpostavke. Neobičan ili zlonameran tekst u kriterijumima ne sme da promeni ishod provere.

**Zašto je ovo važno**: Preglednost i otpornost na nepouzdan tekst pomažu stručnjaku da rezultat pravilno protumači.

**Nezavisna provera**: Pregledati početno, obradu, uspešan ishod, dopunu, prazan rezultat, odbijanje i grešku; proveriti tekstualne oznake statusa, upozorenje i ponašanje nad kriterijumom sa ugrađenom instrukcijom.

**Scenariji prihvatanja**:

1. **Polazeći od** aplikacija prikazuje rezultat, **Kada** korisnik pregleda status kriterijuma, **Tada** status je opisan tekstom i nije saopšten samo bojom ili ikonom.
2. **Polazeći od** tekst kriterijuma sadrži instrukciju da se zanemare pravila ili pozove nepostojeća radnja, **Kada** se profil proveri, **Tada** ishod ostaje isti kao deterministička procena kriterijuma i ne izvršava se nepredviđena radnja.
3. **Polazeći od** sistem radi u demo režimu, **Kada** korisnik pregleda interfejs, **Tada** režim je jasno označen; upozorenje da su profili sintetički i da rezultat nije dijagnoza niti medicinski savet ostaje vidljivo.
4. **Polazeći od** je prikazan studijski citat, **Kada** korisnik proverava osnov za tvrdnju, **Tada** citat pripada dostupnom izvoru tekuće provere; nepostojeći ili nedostupan izvor se ne prikazuje kao dokaz.
5. **Polazeći od** korisnik koristi interfejs samo tastaturom ili čitačem ekrana, **Kada** prolazi kroz ključne kontrole, **Tada** kontrole su dostupne logičnim redosledom tastature, imaju programski dostupne oznake, a fokus je vidljiv.

### Edge Cases

- Polje nedostaje, navedeno je dvosmisleno ili se vrednosti međusobno ne slažu: pogođeni kriterijum ostaje `unknown`, a nerešena nedoumica ne postaje potvrđena činjenica.
- Slobodan tekst je na srpskom (latinicom ili ćirilicom) ili engleskom; brojevi mogu koristiti decimalni zarez ili tačku. Neuspešno razumevanje ne sme da proizvede izmišljenu vrednost.
- Vrednost je navedena u drugoj podržanoj jedinici: prikazana i upotrebljena vrednost mora da odgovara normalizovanoj jedinici; nepoznata ili nevažeća jedinica ne sme se tiho tumačiti.
- Nema odgovarajućih studija, ili nema dovoljno izvora za određenu tvrdnju: prikazati odgovarajući ishod `no_matching_trial` ili `not_in_sources`, bez izmišljene ponude ili citata.
- Jedan ili više kriterijuma zahtevaju procenu lekara: označiti ih kao `unknown`; taj status ne sme biti sakriven u ukupnom ishodu.
- Izvor nije dostupan u tekućoj proveri ili citat ne odgovara dostupnom odlomku: ne prikazivati ga kao dokaz.
- Strukturisani izlaz je nevažeći: sistem pokušava jednu ispravku; ako i dalje nije važeći, prikazuje kontrolisanu grešku i ne koristi taj sadržaj za procenu.
- Privremeni problem ili greška u alatu sprečavaju proveru: dozvoljeno je najviše 2 ponovna pokušaja posle prvog poziva; posle toga sledi kontrolisana greška, nikada lažan uspešan ishod.
- Unos prekoračuje dozvoljenu dužinu ili profilna vrednost je van dokumentovanih tehničkih granica unosa: sistem ga odbija pre procene; jedinice kreatinina normalizuju se pre poređenja. Ove granice nisu medicinski ili laboratorijski referentni opsezi.
- Zahtev opisuje radnju sa posledicama u stvarnom svetu (prijava u studiju, slanje poruke ili zakazivanje): van je obima; sistem je ne izvršava.
- Uslovni testovi X-01 do X-03 za radnje sa posledicama u stvarnom svetu nisu primenljivi jer aplikacija ne vrši takve radnje.

## Zahtevi

### Functional Requirements

- **FR-001**: Sistem mora da prihvati slobodan tekst sintetičkog profila ili pitanje o činjenici studije na srpskom (latinicom ili ćirilicom) ili engleskom, uz decimale zapisane zarezom ili tačkom. Izvorno pitanje se obrađuje samo prema dostupnim podacima; nedostajući odgovor daje `insufficient_evidence/not_in_sources`, ne odgovor iz opšteg znanja.
- **FR-002**: Sistem mora da iz korisničkog unosa izdvoji strukturisane vrednosti samo kada su potkrepljene unosom; nepomenute vrednosti ostaju odsutne, a dvosmislene vrednosti ostaju označene kao nerešene. `sex` prihvata samo `male` ili `female`; odsutan ili nejasan pol ostaje `unknown` i pokreće dopunu. Formula eGFR podržava samo ove dve vrednosti.
- **FR-003**: Sistem mora da prepozna i normalizuje navedene jedinice za kreatinin i HbA1c pre njihove upotrebe u proveri kriterijuma, koristeći formule i izvore potvrđene u projektnom brief-u.
- **FR-004**: Kada su dostupni starost, jasno poznat pol (`male` ili `female`) i kreatinin, sistem mora da prikaže izračunatu eGFR vrednost, naziv formule i izvor; kada su dostupni visina i težina, mora da prikaže BMI. Vrednosti koje zavise od nedostajućih podataka ne smeju se izmišljati.
- **FR-005**: Sistem mora da uporedi profil sa dostupnim kriterijumima studija i za svaki kriterijum prikaže jedan od statusa `met`, `not_met` ili `unknown`, uočenu vrednost kada postoji i odlomak izvora koji potkrepljuje kriterijum.
- **FR-006**: Sistem mora dosledno da primeni trivalentnu logiku: podatak koji nedostaje, nije jasan ili nema dovoljno dokaza ostaje `unknown`; nepoznat status se nikada ne prikazuje ili koristi kao `met` ili `not_met`.
- **FR-007**: Sistem mora da predstavi rangirane rezultate kao preliminarnu proveru kriterijuma, uz jasno razdvajanje kriterijuma koji deluju ispunjeno, nisu ispunjeni ili zahtevaju ljudsku procenu. Ne sme da proglasi pacijenta podobnim ili odobrenim za studiju.
- **FR-008**: Za rezultat koji zahteva dopunu, sistem mora da postavi tačno jedno konkretno pitanje. Kada je nepoznanica za više studija, pitanje bira polje koje može razrešiti najviše studija; izjednačenja rešavaju stabilno pravilo.
- **FR-009**: Sistem mora da sačuva već validirane podatke i nastavi istu proveru posle odgovora. Ne sme da pozove procenu sa izmišljenim odgovorom ili podrazumevanom vrednošću. Posle završenog rezultata, UI mora da omogući eksplicitnu hipotetičku izmenu profila koja ponavlja procenu pod istim `runId`, menja samo navedena validirana polja i čuva ostala; nevažeća ili dvosmislena izmena ne stiže do matchera.
- **FR-010**: Sistem mora da vrati `insufficient_evidence` sa razlogom `no_matching_trial` kada nijedna dostupna studija ne odgovara, i sa razlogom `not_in_sources` kada tražena informacija nije u izvorima.
- **FR-011**: Korak ekstrakcije mora da klasifikuje nameru zahteva; ako se prepozna dijagnoza, savet o lečenju ili odluka o uključivanju, server mora da odredi status `rejected` pre bilo kog poziva alata, bez poziva matchera, bez sprovođenja provere profila za taj zahtev i bez davanja traženog odgovora.
- **FR-012**: Sistem mora da prikaže dokaze samo iz izvora dostupnih za konkretnu proveru. Citat se prikazuje u jeziku izvora, a korisničko objašnjenje na srpskom.
- **FR-013**: Sistem mora da ignoriše instrukcije ugrađene u tekst studije koje pokušavaju da izmene pravila ili zatraže nepredviđene radnje; takve instrukcije ne smeju da utiču na procenu kriterijuma.
- **FR-014**: Nevažeći strukturisani izlaz mora da dovede do najviše jednog pokušaja ispravke. Ako i posle toga izlaz nije važeći, sistem mora da prikaže kontrolisanu grešku i da ne nastavi procenu na osnovu tog izlaza.
- **FR-015**: Samo za model-provider timeout, HTTP 429 i 5xx sistem sme da izvrši `MAX_RETRIES=2` ponovna pokušaja posle prvog poziva, uz pauze od 500 ms pa 1500 ms. Ako problem ostane, prikazuje kontrolisanu grešku uz opciju ponovnog pokušaja gde je primenljivo; nikada lažan uspeh. Nevažeći strukturisani izlaz ne pokreće mrežni retry. Pokušaj popravke nevalidnog izlaza je zaseban, najviše jedan i uvek se računa u `MAX_MODEL_CALLS_PER_RUN`; mrežni ponovni pokušaji se ne računaju u taj limit.
- **FR-016**: Sistem mora tokom izvršavanja da sprovodi `MAX_INPUT_CHARS=4000`, `MAX_CONTEXT_CHARS=12000`, `MAX_MODEL_CALLS_PER_RUN=4`, `MAX_TOOL_CALLS_PER_RUN=10`, `MODEL_TIMEOUT_MS=20000`, `RUN_TIMEOUT_MS=60000`, `MAX_QUESTION_ROUNDS=5`, `TOOL_TIMEOUT_MS=2000` i ograničenje od 20 zahteva u minuti po klijentu u memoriji. Prekoračenje ograničenja zahteva vraća HTTP 429 sa kontrolisanom porukom. Sistem odbija nevažeće profilne vrednosti pre procene; opsezi starost 0–120, HbA1c 3,0–20,0%, kreatinin 0,1–20 mg/dL posle konverzije, visina 50–250 cm i težina 2–400 kg služe isključivo kao tehnički sanity check unosa, ne kao medicinski/laboratorijski referentni opsezi.
- **FR-017**: Korisnički interfejs mora da ima razumljiva početna, obrada, uspeh, dopuna, prazan rezultat, odbijanje i greška stanja; tokom obrade sprečava ponovno slanje istog zahteva.
- **FR-018**: Korisnički interfejs mora trajno da prikazuje upozorenje da se koriste sintetički podaci i da rezultat nije dijagnoza niti medicinski savet. Mora da prikaže i izvor podataka i datum snimka. Demo režim mora biti vidljivo označen kada je aktivan.
- **FR-019**: Status kriterijuma mora da bude razumljiv tekstualnom oznakom i ne sme da se prenosi samo bojom ili ikonom. Ključne kontrole moraju biti označene i dostupne putem tastature.
- **FR-020**: Sistem je samo za čitanje i ne sme da prijavljuje pacijenta u studiju, šalje poruke, zakazuje posete ili izvršava drugu radnju sa posledicama u stvarnom svetu.

### Mapiranje kriterijuma prihvatanja

Postojeći AC-01–AC-11 zadržavaju ID-jeve i značenje iz projektnog brief-a. AC-12 je dodatno stabilno merilo za proveru pristupačnosti ključnih kontrola.

### Veza funkcionalnih zahteva sa kriterijumima prihvatanja i uspeha

| Zahtev | Povezani AC | Povezani SC | Provera / napomena |
|---|---|---|---|
| FR-001 | AC-01, AC-03 | — | EV-01/EV-02 i mock/unit testovi pokrivaju srpski/engleski unos i decimalni zarez/tačku. |
| FR-002 | AC-01, AC-02, AC-03 | SC-001, SC-003 | Odsutne i dvosmislene vrednosti ostaju odsutne/nepoznate; dopuna čuva već validirane podatke. |
| FR-003 | AC-02 | SC-004 | Normalizacija jedinica proverava se prema korisnički potvrđenim formulama i izvorima; nepoznate jedinice se odbijaju. |
| FR-004 | AC-02 | SC-004 | Izvedene vrednosti imaju kontrolne primere, jedinice, formulu i izvor. |
| FR-005 | AC-01 | SC-001, SC-002 | Statusi su zasebni po kriterijumu, uz dostupne citate. |
| FR-006 | AC-03 | SC-001, SC-003 | Nepoznata vrednost ostaje nepoznata i pokreće ciljanu dopunu. |
| FR-007 | AC-01, AC-05 | SC-005 | Rezultati su preliminarni i ne predstavljaju odluku o podobnosti. |
| FR-008 | AC-03, AC-04 | SC-003 | Tačno jedno pitanje bira se ponovljivo prema broju studija koje može razjasniti. |
| FR-009 | AC-03, AC-10 | SC-003 | Dopuna i hipotetička izmena čuvaju ista izvršavanja i nepomenuta polja; nevažeća izmena ne menja stanje. |
| FR-010 | AC-05 | SC-005 | Razlikuju se odsustvo poklapanja i podatak van izvora. |
| FR-011 | AC-06 | SC-007 | Zabranjeni zahtev odbija se pre alata i matchera. |
| FR-012 | AC-01, AC-08 | SC-002 | Citati se ograničavaju na izvore dostupne u tekućoj proveri. |
| FR-013 | AC-09 | SC-006 | Instrukcija u tekstu studije ne menja ishod niti pokreće radnju. |
| FR-014 | AC-07 | SC-008 | Nevažeći strukturisani izlaz dobija najviše jedan pokušaj ispravke. |
| FR-015 | AC-10 | SC-008 | Dozvoljeni retry-i i kontrolisana greška proveravaju se u fault testovima. |
| FR-016 | AC-10 | — | Limiti konfiguracije, ulaza, poziva i vremena proveravaju se offline testovima; nema zasebnog SC za svaki limit. |
| FR-017 | AC-01, AC-03, AC-05, AC-06, AC-07, AC-10 | SC-005 | UI razlikuje uspeh, dopunu, nedovoljne dokaze, odbijanje i grešku. |
| FR-018 | AC-01, AC-03, AC-05, AC-06, AC-07, AC-08, AC-10 | SC-009 | Upozorenja, DEMO oznaka i poreklo/datum podataka prikazuju se u relevantnim UI stanjima. |
| FR-019 | AC-01, AC-12 | SC-009, SC-010 | Statusi imaju tekstualne oznake; ključne kontrole su dostupne tastaturom i imaju dostupne nazive i vidljiv fokus. |
| FR-020 | AC-06, AC-09 | SC-006, SC-007 | API i dozvoljeni alati ne izvršavaju radnje sa posledicama u stvarnom svetu. |

| Kriterijum | Povezane priče | Zahtevi i primarna provera |
|---|---|---|
| AC-01 | Priča 1 | FR-001–FR-002, FR-005, FR-007, FR-012; dovoljno podataka daje `ok` sa rangiranim studijama, statusom i dostupnim izvorom za svaki kriterijum. |
| AC-02 | Priča 1 | FR-003–FR-004; uzrast, pol i kreatinin daju ponovljivu eGFR vrednost sa nazivom formule i izvorom. |
| AC-03 | Priča 2 | FR-001–FR-003, FR-006, FR-008, FR-009; nedostajuća vrednost ostaje `unknown`, prikazuje se jedno pitanje, profil se čuva i ista provera nastavlja bez izmišljene vrednosti. |
| AC-04 | Priča 2 | FR-008; među više nepoznanica bira se pitanje koje razrešava najviše studija, uz stabilno razrešavanje izjednačenja. |
| AC-05 | Priča 3 | FR-010; bez podudaranja sledi `insufficient_evidence/no_matching_trial`, a izričito pitanje o činjenici van izvora `insufficient_evidence/not_in_sources`; nema izmišljene ponude ili odgovora iz opšteg znanja. |
| AC-06 | Priča 3 | FR-011; klasifikacija namere u koraku ekstrakcije prepoznaje dijagnozu, savet o lečenju ili odluku o uključivanju; server određuje `rejected` pre bilo kog poziva alata, bez poziva matchera i bez davanja traženog odgovora. |
| AC-07 | Priča 3 | FR-014; nevažeći strukturisani izlaz ima jedan pokušaj ispravke, zatim kontrolisanu grešku; taj izlaz ne stiže do procene kriterijuma. |
| AC-08 | Priča 1, 4 | FR-012; izvor koji nije bio dostupan u tekućoj proveri ne prikazuje se kao dokaz. |
| AC-09 | Priča 4 | FR-013; zlonamerna instrukcija u tekstu studije ne menja ishod niti pokreće nepredviđenu radnju. |
| AC-10 | Priča 3 | FR-015, FR-016; timeout, HTTP 429 i 5xx modela imaju najviše 2 ponovna pokušaja posle prvog poziva uz propisane pauze; greška alata ne podrazumeva automatski retry. Ulaz, pozivi i ukupno vreme su ograničeni; nikada lažan uspeh. |
| AC-11 | Proširenje van osnovnog obima | Nije obuhvaćen funkcionalnim zahtevima osnovne verzije. Samo je zabeleženo kao buduće proširenje: nepotkrepljena navedena dijagnoza označava se „zahteva potvrdu lekara“ i ne tretira se kao potvrđena pri uparivanju. |
| AC-12 | Priča 4 | FR-019; ključne kontrole imaju programski dostupne oznake, dostupne su tastaturom logičnim redosledom, a indikator fokusa je vidljiv. Provera obuhvata automatizovane testove dostupnih naziva i tastaturne navigacije, kao i proveru stila fokusa. |

### Proširenje van osnovnog obima

**AC-11 — provera doslednosti profila** je buduće proširenje (van osnovnog obima; out of core scope / future enhancement). Osnovna verzija ne mora da procenjuje da li podaci potkrepljuju navedenu dijagnozu. Kada se ovo proširenje bude razmatralo, nepotkrepljena navedena dijagnoza moraće da bude označena „zahteva potvrdu lekara“ i neće smeti da se tretira kao potvrđena pri uparivanju. Ovaj opis ne dodaje novu obavezu za osnovnu verziju.

### Zahtevi za proširenje u korisničkom interfejsu

- Jedan ekran omogućava unos slobodnog teksta, slanje i nastavak provere odgovorom na pitanje.
- Posle završenog rezultata, jedno polje „Šta ako?“ šalje hipotetičku izmenu pod istim `runId`.
- Stanje obrade saopštava se korisniku i sprečava duplo slanje.
- Rezultat po studiji prikazuje sažet ishod i kriterijume sa statusom, uočenom vrednošću, ID-jem izvora i proširivim citatom.
- Za `insufficient_evidence`, `rejected` i `error` prikazuje se jasno objašnjenje bez izmišljene ponude.

## Ključni entiteti

- **Sintetički profil**: strukturisani podaci o profilu koji potiču iz unosa; svako polje može biti potvrđeno, odsutno ili dvosmisleno.
- **Studija**: opis studije i njen skup kriterijuma koji se koriste u preliminarnoj proveri.
- **Kriterijum**: uslov studije, njegov status (`met`, `not_met`, `unknown`), uočena vrednost i izvorni dokaz.
- **Izvorni odlomak**: deo dostupnog teksta studije koji podržava konkretan kriterijum i koji korisnik može da proveri.
- **Pitanje za dopunu**: jedno konkretno pitanje vezano za nepoznato polje čiji odgovor može razjasniti rezultat jedne ili više studija.
- **Provera**: jedan tok analize profila i studija, koji može zatražiti dopunu, završiti rezultatom, nedovoljno dokaza, odbijanjem ili greškom.

## Kriterijumi uspeha

### Merljivi ishodi

- **SC-001**: U svakom uspešnom rezultatu svaki prikazani kriterijum ima tačno jedan status iz skupa `met`, `not_met`, `unknown`; nepoznate vrednosti se ne prikazuju kao potvrđene.
- **SC-002**: Za svaki prikazani kriterijum koji zahteva dokaz dostupan je izvorni ID i citat iz izvora dozvoljenog u tekućoj proveri; citat iz nedostupnog izvora se ne prikazuje ni u jednom slučaju.
- **SC-003**: U svakom slučaju koji zahteva dopunu prikazano je tačno jedno pitanje; odgovor nastavlja istu proveru i čuva ranije validirane podatke.
- **SC-004**: Za profil sa starošću, polom i kreatininom, i za profil sa visinom i težinom, odgovarajuće izvedene vrednosti su ponovljive za identične ulaze i prikazuju se sa jedinicom i potvrđenim izvorom/formulom. Kontrolne vrednosti eGFR i BMI prolaze u toleranciji ±0,01.
- **SC-005**: Svaki od ishoda `ok`, `needs_clarification`, `insufficient_evidence`, `rejected` i `error` može da se razlikuje u korisničkom prikazu; nijedan odbijeni ili neuspeli slučaj se ne prikazuje kao uspešna podobnost.
- **SC-006**: Svi ugrađeni negativni slučajevi u kojima tekst studije pokušava da promeni pravila zadržavaju isti ishod kao procena kriterijuma bez te instrukcije i ne izazivaju nepredviđenu radnju.
- **SC-007**: U svim zahtevima za zabranjenu dijagnozu, lečenje ili odluku o uključivanju sistem vraća odbijanje pre bilo kog poziva alata; matcher nije pozvan i traženi medicinski odgovor se ne daje.
- **SC-008**: Posle iscrpljenja najviše dva mrežna ponovna pokušaja (timeout/429/5xx modela), ili neuspešne jedne popravke nevalidnog izlaza, sistem prikazuje kontrolisanu grešku i nikada ne tvrdi da je provera uspela.
- **SC-009**: U svim stanjima prikazani su tekstualna oznaka statusa, upozorenje o sintetičkim podacima i granicama medicinske upotrebe, kao i izvor podataka i datum snimka; boja nije jedini nosilac značenja.
- **SC-010**: Sve ključne kontrole mogu se dosegnuti i koristiti tastaturom logičnim redosledom, imaju programski dostupne oznake, a fokusirana kontrola ima vidljiv indikator fokusa.

## Pretpostavke

- Primarni korisnik je lekar ili koordinator studije; pacijent može koristiti sistem samo zajedno sa lekarom.
- Korisnički profili i demonstracioni primeri su sintetički; sistem ne prima stvarne podatke pacijenata.
- Studijski kriterijumi koji se koriste za automatsku proveru dostupni su i potkrepljeni izvorom. Kriterijum koji nema dovoljnu potporu ne proglašava se ispunjenim ili neispunjenim.
- Rezultat koji ispunjava sve automatski proverljive kriterijume i dalje zahteva ljudsku procenu i nije odluka o podobnosti.
- Korisnik je dostavio i potvrdio izvore, formule, konverzije i kontrolne vrednosti navedene u `docs/project-brief.md` i `docs/decisions.md`. Navedeni opsezi profila su isključivo tehničke granice unosa, ne medicinski/laboratorijski referentni opsezi.
- Redosled studija je određen presudom, udelom kriterijuma `met` i NCT ID-jem; NCT ID se pretvara u velika slova i sortira rastuće leksikografski.
- Jedna runda dopune je jedan validno oblikovan odgovor na trenutno pitanje, uključujući dvosmislen odgovor; posle pet rundi novo pitanje završava izvršavanje kontrolisanom greškom `question_round_limit`. Hipoteza nije runda odgovora, ali dopuna nakon nje jeste.

## Pitanja za razjašnjenje

- Koji će provajder/model i uslovi korišćenja stvarnog snimka biti odobreni za kasniju Fazu 2? Ove odluke nisu blokatori sintetičke Faze 1.
