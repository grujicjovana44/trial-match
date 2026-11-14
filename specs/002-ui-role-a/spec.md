# Specifikacija funkcionalnosti: Korisnički tok i interfejs TrialMatch (Uloga A)

**Oznaka funkcionalnosti**: `002-ui-role-a`

**Datum izrade**: 2026-11-09

**Status**: Nacrt

**Polazni zahtev**: Zadatak Uloge A (korisnički tok, interfejs i kriterijumi prihvatanja), zasnovan na `specs/001-trialmatch-core/spec.md`, `docs/project-brief.md` i dizajnersko uputstvo vlasnika Uloge A (sekcija „Design“ u zadatku za planiranje). Raniji mockup-i ekrana su odbačeni i nisu referenca za izgled.

**Izmena obima (2026-11-09)**: specifikacija je ažurirana za **finalni proizvod**, a ne samo za demo iz Faze 1. Dodati su priča 10, scenariji za stvarne studije, ograničenje broja zahteva, uske ekrane i otpornost na mrežne greške, kao i zahtevi FR-024–FR-034. Postojeći AC ID-jevi i FR brojevi su zadržani.

Ova funkcionalnost dorađuje postojeći korisnički interfejs iz Faze 1 u finalni proizvod koji radi sa stvarnim modelom i stvarnim snimkom studija, tako da jasno prikazuje poreklo svake vrednosti, nepoznanice i režim rada, i da svaki kriterijum prihvatanja AC-01–AC-13 ima vidljivo stanje u interfejsu i proverljiv dokaz. Ne menja pravila procene, matcher, izvedene vrednosti ni serverski workflow; oni ostaju u nadležnosti Uloga B i C. **Jezički model čita pravila i objašnjava rezultat. Odluku donosi deterministički kod.** Interfejs nikada ne predstavlja rezultat kao odluku o podobnosti; konačnu odluku donosi lekar.

## Obim

- **Stvarni režim je podrazumevan.** Interfejs se planira za rad sa stvarnim modelom i stvarnim snimkom registra ClinicalTrials.gov (oko 50 studija za dijabetes tip 2).
- **Demo (mock) režim postoji samo za testove i offline evaluaciju.** Svako stanje interfejsa mora biti proverljivo u oba režima.
- **Profili su isključivo sintetički** (konstitucija, princip VI). Rad sa stvarnim podacima pacijenata nije u obimu.
- **Van obima**: izmene zajedničkih šema, servera, promptova modela i evaluacionih izvršavanja. Potrebne izmene se upisuju kao zahtevi drugim ulogama u odeljku „Zavisnosti od drugih uloga“.

## Clarifications

### Session 2026-11-09

- Q: Da li će finalni proizvod biti javno dostupan ili se pokreće samo lokalno za odbranu? → A: Verovatno javno dostupan na platformi Vercel; projekat je nekomercijalan (bootcamp). Planira se za javnu adresu, uz mogućnost lokalnog pokretanja.
- Q: Da li se usvajaju tamnije boje teksta statusnih oznaka i tamniji indikator fokusa radi kontrasta WCAG 2.2 AA? → A: Da, odobreno. Pozadine oznaka, bočne linije i trake ostaju nepromenjene; menja se samo boja teksta oznaka i boja indikatora fokusa. Tačne vrednosti sa izmerenim odnosima upisuju se u plan.
- Q: Da li se citat kriterijuma uvek prikazuje u celini ili dugačak citat sme da se skrati uz kontrolu za prikaz celog teksta? → A: Uvek u celini, bez skraćivanja. Citat koji obuhvata ceo blok kriterijuma tretira se kao problem podataka i prijavljuje Ulozi C.
- Q: Kako se prikazuje lista od oko 50 studija: sve otvorene, deo skupljen ili podeljeno na stranice? → A: Sve studije su potpuno otvorene u redosledu servera, a na vrhu rezultata stoji sažet pregled studija (jedan red po studiji: identifikator, ishod, sažetak kriterijuma) sa vezama koje vode do svake studije na istoj stranici. Ništa se ne skuplja i ne deli na stranice.

### Session 2026-11-10

- Q: Da li se usvaja tamnija ivica polja za unos (kontrast 3,87 umesto 1,92) radi praga 3:1 za granice kontrola? → A: Da, odobreno.
- Q: Da li je tekst oznake stvarnog režima „STVARNI MODEL“ uz oznaku modela prihvatljiv? → A: Da.
- Q: Šta se dešava sa prethodnim rezultatom dok traje obrada dopune ili hipotetičke izmene? → A: Ostaje vidljiv, ali zatamnjen, onemogućen i označen kao prethodni. Nova provera iz polja za unos ga uklanja.

## Korisnički scenariji i provera

### Korisnička priča 1 - Pregled rezultata sa dokazima na prvi pogled (Prioritet: P1)

Lekar ili koordinator studije unese sintetički profil i želi da odmah vidi šta je sistem prepoznao iz unosa, koje vrednosti je izračunao kod, kakav je ishod po studiji i na kojoj vrednosti i kom odlomku izvora počiva status svakog kriterijuma.

**Zašto je ovo važno**: Ovo je glavna vrednost aplikacije. Ako korisnik ne vidi prepoznate vrednosti i uočenu vrednost po kriterijumu, ne može da proveri da li je sistem dobro razumeo unos, pa rezultat gubi proverljivost.

**Nezavisna provera**: Uneti profil iz scenarija 1 i bez ijedne druge radnje proveriti da su vidljivi prepoznati podaci, izvedene vrednosti označene kao izračunate kodom, sažetak po studiji i za svaki kriterijum status, vrednost i izvor sa citatom.

**Scenariji prihvatanja**:

1. **Polazeći od** korisnik je uneo „Muškarac, 62 godine, dijabetes tip 2, HbA1c 8,1%, kreatinin 1,3 mg/dL, visina 178 cm, težina 92 kg, na metforminu“, **Kada** se prikaže rezultat, **Tada** iznad rezultata stoji kartica profila sa izvornim tekstom i oznakama prepoznatih vrednosti (na primer „starost 62“, „pol M“, „HbA1c 8,1%“, „kreatinin 1,3 mg/dL“), a izvedene vrednosti su posebno označene kao izračunate kodom (na primer „eGFR ≈ 62,11 mL/min/1.73 m²“ sa oznakom „izračunao kod“; vrednost i jedinica se prikazuju onako kako ih vrati server).
2. **Polazeći od** rezultat sadrži jednu ili više studija, **Kada** korisnik pregleda studiju, **Tada** vidi njen sažetak brojem kriterijuma po statusu (na primer „3 od 4 ispunjeno, 1 nepoznato“) i ishod studije srpskom tekstualnom oznakom umesto internog naziva.
3. **Polazeći od** kriterijum ima uočenu vrednost, **Kada** se kriterijum prikaže, **Tada** red kriterijuma sadrži opis uslova, uočenu vrednost sa jedinicom, oznaku da li je vrednost izračunata, identifikator izvora i citat.
4. **Polazeći od** kriterijum nema uočenu vrednost, **Kada** se kriterijum prikaže, **Tada** umesto vrednosti stoji „nije uneto“, a status je „nepoznato“; nijedna podrazumevana vrednost se ne prikazuje.
5. **Polazeći od** uočena vrednost je da/ne podatak (na primer upotreba insulina), **Kada** se prikaže, **Tada** prikazuje se kao reč na srpskom („da“ ili „ne“), a ne kao interna logička vrednost.
6. **Polazeći od** studija potiče iz stvarnog snimka registra i ima identifikator u formatu registra (NCT i osam cifara), **Kada** se studija prikaže, **Tada** vidljiv je njen identifikator i veza ka zvaničnoj stranici te studije na ClinicalTrials.gov, koja se otvara u novoj kartici i ne predaje novoj stranici pristup ovoj aplikaciji.
7. **Polazeći od** odgovor sadrži status regrutacije i fazu studije, **Kada** se studija prikaže, **Tada** oba podatka su vidljiva uz naslov; ako ih odgovor ne sadrži, ne prikazuje se ni prazno polje ni podrazumevana vrednost.
8. **Polazeći od** rezultat sadrži oko 50 studija sa dugačkim citatima na engleskom, **Kada** korisnik pregleda listu, **Tada** studije su u redosledu koji je odredio server i sve su potpuno otvorene: status, vrednost, izvor i ceo citat svakog kriterijuma vidljivi su bez ijedne dodatne radnje.
9. **Polazeći od** rezultat sadrži više od jedne studije, **Kada** se rezultat prikaže, **Tada** iznad liste stoji sažet pregled studija u istom redosledu, sa identifikatorom, ishodom i sažetkom kriterijuma za svaku, i svaki red vodi do te studije na istoj stranici, uz premeštanje fokusa na njen naslov.

---

### Korisnička priča 2 - Dopuna jednim klikom i nastavak iste provere (Prioritet: P1)

Kada sistem postavi pitanje za dopunu sa ponuđenim odgovorima, lekar želi da odgovori jednim klikom, da dobije potvrdu da je odgovor sačuvan i da se ista provera nastavila, i da u svakom trenutku može da počne iznova.

**Zašto je ovo važno**: Dopuna je ključni deo toka jer su podaci gotovo uvek nepotpuni. Ako odgovor traži više koraka ili korisnik nije siguran da se provera nastavila, tok deluje nepouzdano.

**Nezavisna provera**: Uneti profil bez podatka o insulinu, kliknuti „Ne“ na pitanje i proveriti da je odgovor poslat jednom radnjom, da je prikazana potvrda nastavka, da je identifikator provere ostao isti i da „Počni iznova“ vraća prazan početni ekran.

**Scenariji prihvatanja**:

1. **Polazeći od** rezultat je `needs_clarification` sa ponuđenim odgovorima (na primer „Da“ i „Ne“), **Kada** korisnik klikne ponuđeni odgovor, **Tada** odgovor se odmah šalje, bez dodatnog dugmeta za potvrdu.
2. **Polazeći od** pitanje nema ponuđene odgovore, **Kada** korisnik upiše odgovor i pošalje ga, **Tada** odgovor se šalje kao do sada, a prazan odgovor se ne može poslati.
3. **Polazeći od** odgovor je uspešno obrađen, **Kada** se prikaže novi rezultat, **Tada** iznad njega stoji potvrda „Odgovor je sačuvan · ista provera je nastavljena“, a ranije prepoznati podaci se ne traže ponovo.
4. **Polazeći od** prikazan je bilo koji rezultat ili greška, **Kada** korisnik izabere „Počni iznova“, **Tada** interfejs se vraća u početno stanje sa praznim poljem za unos, bez prethodnog rezultata, pitanja i poruka, a fokus je u polju za unos.
5. **Polazeći od** provera je završena, **Kada** korisnik pošalje hipotetičku izmenu („Šta ako?“), **Tada** novi rezultat je jasno označen kao rezultat hipotetičke izmene u istoj proveri, a polje za izmenu se prazni.

---

### Korisnička priča 3 - Jasni ishodi bez lažnog uspeha (Prioritet: P1)

Lekar želi da u svakom ishodu koji nije uspešna provera jasno razume šta se desilo i šta može dalje: da nema odgovarajuće studije, da tražena informacija nije u izvorima, da je zahtev van granica alata ili da je nastala tehnička greška koju može ponovo da pokuša.

**Zašto je ovo važno**: U medicinski osetljivom kontekstu lažan uspeh ili izmišljena preporuka su najopasnija greška. Korisnik mora da razlikuje „nema studije“ od „sistem nije uspeo“.

**Nezavisna provera**: Izazvati svaki ishod (bez poklapanja, van izvora, odbijen zahtev, greška servisa, prekid mreže, istek vremena) i proveriti da svaki ima svoju poruku, da nijedan ne prikazuje studiju kao podobnu i da se greška može ponovo pokušati jednom radnjom.

**Scenariji prihvatanja**:

1. **Polazeći od** ishod je `insufficient_evidence` sa razlogom `no_matching_trial`, **Kada** se prikaže, **Tada** poruka kaže da nijedna studija iz skupa ne ispunjava uslove i da sistem ne predlaže ništa izmišljeno; nijedna studija nije prikazana kao kandidat.
2. **Polazeći od** ishod je `insufficient_evidence` sa razlogom `not_in_sources`, **Kada** se prikaže, **Tada** poruka kaže da tražena informacija nije u dostupnim izvorima i ne prikazuje odgovor iz opšteg znanja.
3. **Polazeći od** ishod je `rejected`, **Kada** se prikaže, **Tada** poruka objašnjava granicu alata (bez dijagnoze, saveta o lečenju i odluke o uključivanju) i ne sadrži traženi medicinski odgovor.
4. **Polazeći od** ishod je `error` koji se može ponoviti, ili zahtev nije stigao do servera, **Kada** se prikaže greška, **Tada** uz razumljivu poruku stoji dugme „Pokušaj ponovo“ koje ponavlja poslednji zahtev jednom radnjom, bez ponovnog unosa.
5. **Polazeći od** greška je nastala zbog isteka vremena, **Kada** se prikaže, **Tada** poruka se razlikuje od ostalih grešaka i kaže da servis nije odgovorio na vreme.
6. **Polazeći od** greška se ne može ponoviti (na primer nevažeći unos ili istekla provera), **Kada** se prikaže, **Tada** umesto „Pokušaj ponovo“ korisnik dobija uputstvo šta da ispravi ili mogućnost „Počni iznova“.
7. **Polazeći od** server vrati odgovor koji ne odgovara dogovorenom formatu, **Kada** interfejs ga primi, **Tada** prikazuje kontrolisanu grešku, a ne delimičan ili neispravan rezultat.
8. **Polazeći od** naš server odbije zahtev jer je klijent prekoračio dozvoljen broj zahteva (20 u minuti), **Kada** se prikaže greška, **Tada** poruka kaže da je poslato previše zahteva i koliko treba sačekati, razlikuje se od grešaka modela i ne nudi trenutno ponavljanje pre isteka čekanja.
9. **Polazeći od** odgovor nije u očekivanom obliku za čitanje (na primer stranica greške posrednika umesto podataka) ili server nije dostupan, **Kada** interfejs ga primi, **Tada** prikazuje razumljivu poruku na srpskom sa „Pokušaj ponovo“; sirov tehnički tekst greške se ne prikazuje.
10. **Polazeći od** provera više ne postoji na serveru (na primer posle restarta servera), **Kada** korisnik pošalje odgovor ili hipotetičku izmenu, **Tada** poruka kaže da je provera istekla i nudi „Počni iznova“, bez „Pokušaj ponovo“.

---

### Korisnička priča 4 - Tačne informacije o režimu rada i podacima (Prioritet: P1)

Lekar i žiri žele da u svakom trenutku znaju da li aplikacija radi u demo režimu ili sa stvarnim modelom, koji skup podataka je korišćen i kog datuma je snimljen, bez obzira na to kada je interfejs napravljen.

**Zašto je ovo važno**: Finalni proizvod radi sa stvarnim modelom i stvarnim snimkom studija, pa je stvarni režim podrazumevan. Ako interfejs i dalje prikazuje fiksne tekstove iz Faze 1 („DEMO REŽIM“, „bez poziva stvarnom modelu“, „sintetičke studije“), prikazuje netačne informacije o poreklu rezultata, što je u suprotnosti sa principom „dokazi prethode tvrdnjama“.

**Nezavisna provera**: Pokrenuti proveru u stvarnom režimu i u demo režimu; proveriti da oznaka režima, oznaka modela, verzija skupa i datum snimka uvek odgovaraju podacima iz odgovora servera i da se nijedna tvrdnja o demo režimu ne pojavljuje u stvarnom režimu.

**Scenariji prihvatanja**:

1. **Polazeći od** odgovor servera označava demo režim, **Kada** se prikaže rezultat, **Tada** vidljiva je oznaka „DEMO REŽIM“ i napomena da nije bilo poziva stvarnom modelu.
2. **Polazeći od** odgovor servera označava rad sa stvarnim modelom, **Kada** se prikaže rezultat, **Tada** oznaka demo režima i napomena „bez poziva stvarnom modelu“ se ne prikazuju, a prikazuju se oznaka stvarnog režima i oznaka modela iz odgovora.
3. **Polazeći od** odgovor sadrži oznaku verzije skupa podataka, **Kada** se prikaže rezultat, **Tada** prikazana verzija skupa je ona iz odgovora, a ne vrednost upisana u interfejs.
4. **Polazeći od** još nije bilo nijednog odgovora servera, **Kada** se prikaže početni ekran, **Tada** interfejs ne tvrdi ništa o režimu ili verziji skupa što nije potvrdio server; trajno upozorenje o sintetičkim profilima i granicama upotrebe je i dalje vidljivo.
5. **Polazeći od** odgovor sadrži datum snimka skupa podataka, **Kada** se prikaže rezultat, **Tada** datum je prikazan uz verziju skupa; ako ga odgovor ne sadrži, prikazuje se samo verzija, bez datuma upisanog u interfejs.
6. **Polazeći od** aplikacija radi u stvarnom režimu, **Kada** se prikaže trajno upozorenje, **Tada** ono kaže da su profili sintetički i ne tvrdi da su studije sintetičke ili da je aplikacija demo.
7. **Polazeći od** dva uzastopna odgovora u istoj sesiji nose različit režim ili verziju skupa, **Kada** se prikaže noviji odgovor, **Tada** oznake prate poslednji odgovor.

---

### Korisnička priča 5 - Pristupačan i bezbedan prikaz (Prioritet: P2)

Lekar koji koristi samo tastaturu ili čitač ekrana želi da prođe ceo tok i da bude obavešten o svakoj promeni stanja. Svi korisnici moraju biti zaštićeni od toga da tekst modela ili studije izvrši sadržaj u pregledaču.

**Zašto je ovo važno**: Pristupačnost je deo kriterijuma AC-12, a tekst studija i objašnjenja modela su nepouzdan sadržaj koji ne sme da se izvrši.

**Nezavisna provera**: Proći ceo tok samo tastaturom uz čitač ekrana; zatim prikazati objašnjenje i citat koji sadrže HTML i skriptu i proveriti da su prikazani kao običan tekst.

**Scenariji prihvatanja**:

1. **Polazeći od** korisnik koristi samo tastaturu, **Kada** prolazi tok unos → pitanje → odgovor → „Šta ako?“ → „Počni iznova“, **Tada** svaka kontrola je dostupna logičnim redosledom, ima dostupan naziv i vidljiv indikator fokusa.
2. **Polazeći od** stanje se promeni (počela obrada, stiglo pitanje, stigao rezultat, nastala greška), **Kada** se promena desi, **Tada** čitač ekrana je najavljuje, a fokus se premešta na novo pitanje, naslov rezultata ili poruku o grešci.
3. **Polazeći od** status kriterijuma ili ishod studije se prikazuje bojom ili ikonom, **Kada** korisnik ne razlikuje boje, **Tada** isto značenje je dostupno i tekstom.
4. **Polazeći od** objašnjenje, naslov studije ili citat sadrže HTML oznake ili skriptu, **Kada** se prikažu, **Tada** prikazuju se doslovno kao tekst i ništa se ne izvršava.
5. **Polazeći od** tekst i statusne oznake su prikazani, **Kada** se proveri kontrast, **Tada** ispunjavaju nivo AA smernica WCAG 2.2 (najmanje 4,5:1 za običan tekst), a indikator fokusa ima kontrast od najmanje 3:1 prema pozadini.
6. **Polazeći od** ekran je širok 320 px, **Kada** korisnik prođe bilo koje stanje interfejsa, **Tada** sav sadržaj i sve kontrole su dostupni bez vodoravnog pomeranja; zaglavlja i naslovi studija se slažu jedno ispod drugog na ekranima užim od 560 px.
7. **Polazeći od** korisnik je u sistemu uključio smanjen pokret, **Kada** koristi aplikaciju, **Tada** vidi iste informacije kao i bez tog podešavanja.
8. **Polazeći od** bilo koje stanje interfejsa, **Kada** se pregleda prikazani tekst, **Tada** nigde se ne pojavljuje interni naziv statusa ni interna logička vrednost.

---

### Korisnička priča 6 - Obrada koja traje i sprečavanje duplog slanja (Prioritet: P2)

Sa stvarnim modelom provera može trajati 10–20 sekundi. Lekar želi da zna da obrada traje, da ne pošalje isti zahtev dva puta i da ne dobije pomešan prikaz starog i novog rezultata.

**Zašto je ovo važno**: Bez jasnog stanja obrade korisnik ponavlja slanje, što troši pozive modela i može prikazati zastarele rezultate.

**Nezavisna provera**: Simulirati sporu obradu i proveriti indikator, onemogućeno ponovno slanje i to da se stari rezultat ne prikazuje kao trenutni.

**Scenariji prihvatanja**:

1. **Polazeći od** zahtev je poslat, **Kada** obrada traje, **Tada** u roku od jedne sekunde prikazuje se tekstualni indikator obrade, a sve kontrole koje šalju zahtev su onemogućene.
2. **Polazeći od** obrada traje duže od 5 sekundi, **Kada** korisnik čeka, **Tada** poruka obrade kaže da provera sa stvarnim modelom može trajati do jednog minuta.
3. **Polazeći od** postoji prethodni rezultat, **Kada** krene nova obrada, **Tada** kod dopune i hipotetičke izmene prethodni rezultat ostaje vidljiv, ali zatamnjen, onemogućen i označen kao prethodni; kod nove provere iz polja za unos prethodni rezultat se uklanja. U oba slučaja ne može se zameniti za novi.

---

### Korisnička priča 7 - Usklađeni kriterijumi prihvatanja i mapa pokrivenosti (Prioritet: P2)

Tim i žiri žele da svaki kriterijum prihvatanja AC-01–AC-13 ima isto značenje u svim dokumentima i da za svaki postoji zapisano stanje interfejsa i dokaz (test, evaluacioni slučaj ili ručna provera).

**Zašto je ovo važno**: Konstitucija (princip VIII) zahteva stabilne AC ID-jeve i proverljiv dokaz. Sažeta tabela u `docs/spec.md` trenutno daje drugačija značenja za više ID-jeva nego `specs/001-trialmatch-core/spec.md` (na primer AC-05 i AC-06), što žiri može protumačiti kao grešku.

**Nezavisna provera**: Uporediti opis svakog AC ID-ja u oba dokumenta i proveriti da mapa pokrivenosti ima red za svaki ID.

**Scenariji prihvatanja**:

1. **Polazeći od** merodavni izvor značenja je `specs/001-trialmatch-core/spec.md` sa `docs/project-brief.md`, **Kada** se uporedi sažeta tabela u `docs/spec.md`, **Tada** AC-01–AC-12 imaju isto značenje, a nijedan ID nije preimenovan ni uklonjen.
2. **Polazeći od** mapa pokrivenosti postoji, **Kada** se pregleda, **Tada** svaki od AC-01–AC-13 ima stanje interfejsa koje ga prikazuje, dokaz koji ga proverava ili zapisano obrazloženje da je ponašanje isključivo serversko.
3. **Polazeći od** AC-11 je van osnovnog obima, **Kada** se pregleda mapa, **Tada** AC-11 je označen kao buduće proširenje bez obaveze u interfejsu.
4. **Polazeći od** AC-13 (glasovni unos, opciono) je uveden ovom specifikacijom, **Kada** se pregleda sažeta tabela u `docs/spec.md`, **Tada** AC-13 je naveden sa istim značenjem kao ovde i oznakom da je opcion.

---

### Korisnička priča 8 - Demonstracioni scenario (Prioritet: P3)

Tim želi pripremljen kratak scenario koji na odbrani pokazuje sve ključne ishode bez improvizacije.

**Zašto je ovo važno**: Žiri ocenjuje ponašanje koje vidi; scenario osigurava da se pokaže svaki važan ishod u ograničenom vremenu.

**Nezavisna provera**: Proći scenario po zapisanim koracima i izmeriti trajanje.

**Scenariji prihvatanja**:

1. **Polazeći od** scenario je zapisan sa tačnim sintetičkim unosima, **Kada** ga član tima izvede na aplikaciji u stvarnom režimu, **Tada** za najviše 3 minuta prikazuje: tipičan profil → pitanje za dopunu → „Šta ako?“ → bez odgovarajuće studije → odbijen zahtev → greška sa ponovnim pokušajem.
2. **Polazeći od** korak „greška sa ponovnim pokušajem“ ne sme da zavisi od slučajnog kvara, **Kada** se scenario izvodi, **Tada** zapisan je ponovljiv način da se greška izazove (na primer kratak prekid veze sa serverom) i šta se očekuje posle „Pokušaj ponovo“.

---

### Korisnička priča 9 - Glasovni unos uz potvrdu transkripta (Prioritet: P3, opciono)

Lekar želi da profil izgovori umesto da ga kuca, ali tako da pre slanja vidi i ispravi prepoznat tekst.

**Zašto je ovo važno**: Ubrzava unos, ali pogrešno prepoznat broj (na primer HbA1c) mogao bi dati pogrešan rezultat, pa potvrda transkripta mora biti obavezna.

**Nezavisna provera**: Izgovoriti profil, proveriti da se tekst pojavio u polju za unos i da ništa nije poslato pre potvrde; proveriti ponašanje u pregledaču koji ne podržava prepoznavanje govora.

**Scenariji prihvatanja**:

1. **Polazeći od** pregledač podržava prepoznavanje govora, **Kada** korisnik završi diktiranje, **Tada** prepoznat tekst se upisuje u polje za unos gde ga korisnik može izmeniti, i ništa se ne šalje dok korisnik sam ne pokrene proveru.
2. **Polazeći od** pregledač ne podržava prepoznavanje govora ili korisnik odbije pristup mikrofonu, **Kada** se prikaže ekran, **Tada** kontrola za glasovni unos je skrivena ili prikazuje razumljivu poruku, a unos tekstom radi normalno.
3. **Polazeći od** korisnik diktira, **Kada** pokrene proveru ili izabere „Počni iznova“, **Tada** diktat se prekida i tekst koji pregledač prepozna posle toga ne ulazi u polje za unos.

**Odluka (2026-11-09):** glasovni unos je u obimu kao opciona funkcionalnost najnižeg prioriteta, pod novim stabilnim ID-jem **AC-13** (konstitucija, princip VIII).

---

### Korisnička priča 10 - Rad iz izgrađene verzije aplikacije (Prioritet: P2)

Tim želi da na odbrani pokrene izgrađenu (produkcijsku) verziju aplikacije i da se ona ponaša isto kao razvojna verzija, bez podešavanja koja postoje samo na računaru jednog člana.

**Zašto je ovo važno**: Žiri i član D proveravaju čist checkout. Interfejs koji radi samo iz razvojnog servera ne može se pouzdano pokazati niti ponoviti.

**Nezavisna provera**: Izgraditi aplikaciju po uputstvu, pokrenuti je bez razvojnog servera i proći ručnu proveru svih stanja interfejsa.

**Scenariji prihvatanja**:

1. **Polazeći od** aplikacija je izgrađena po dokumentovanom uputstvu, **Kada** se pokrene bez razvojnog servera, **Tada** svako stanje interfejsa iz entiteta „Stanje prikaza“ ponaša se isto kao u razvojnoj verziji.
2. **Polazeći od** interfejsu je potrebno podešavanje da bi pronašao server (na primer adresa servisa), **Kada** se pregleda dokumentacija, **Tada** to podešavanje je navedeno sa bezbednom primer-vrednošću, a ako zahteva izmenu servera, upisano je kao zahtev drugoj ulozi.
3. **Polazeći od** izgrađena verzija ne može da dođe do servera, **Kada** korisnik pošalje zahtev, **Tada** vidi istu razumljivu poruku o nedostupnom serveru kao u razvojnoj verziji.

### Edge Cases

- Odgovor servera ne odgovara dogovorenom formatu: prikazuje se kontrolisana greška, nikada delimičan rezultat.
- Server je nedostupan ili mreža prekine zahtev: prikazuje se greška sa „Pokušaj ponovo“; prethodni rezultat se ne prikazuje kao trenutni.
- Korisnik klikne ponuđeni odgovor ili „Pokušaj ponovo“ više puta zaredom: šalje se tačno jedan zahtev.
- Korisnik izabere „Počni iznova“ dok obrada traje: kontrola je onemogućena dok obrada ne završi, ili se rezultat koji kasnije stigne ne prikazuje.
- Provera više ne postoji na serveru (na primer posle restarta servera): poruka objašnjava da je provera istekla i nudi „Počni iznova“.
- Unos je prazan ili duži od 4000 znakova: slanje je onemogućeno uz vidljiv brojač znakova i razlog.
- Unos je ćirilicom ili na engleskom: prepoznate vrednosti i rezultat se prikazuju isto kao za unos latinicom.
- Citat je dugačak ili na engleskom: prikazuje se u izvornom jeziku i uvek u celini, prelomljen unutar okvira; ne skraćuje se i ne sakriva iza dodatne radnje. Citat koji obuhvata ceo blok kriterijuma umesto jedne rečenice prijavljuje se Ulozi C kao problem podataka.
- Rezultat sadrži mnogo studija (na primer 50): lista ostaje čitljiva, a redosled je onaj koji je odredio server.
- Studija nema nijedan prikazan kriterijum: prikazuje se poruka da kriterijumi nisu dostupni, a ne prazan okvir.
- Pitanje se ponavlja do granice od pet rundi: poruka greške `question_round_limit` objašnjava da je dostignut najveći broj dopuna.
- Odgovor sadrži izvedenu vrednost bez profila (na primer posle odbijanja): ne prikazuju se kartica profila ni izvedene vrednosti.
- Naš server vrati odbijanje zbog prekoračenog broja zahteva: poruka se razlikuje od greške modela i navodi vreme čekanja; ako server ne dostavi vreme čekanja, poruka navodi najduže moguće čekanje od jednog minuta.
- Odgovor servera nije čitljiv kao podaci (na primer stranica greške posrednika): prikazuje se razumljiva poruka, nikada sirov tehnički tekst ni delovi te stranice.
- Identifikator studije nije u formatu registra (na primer sintetička studija u demo režimu): prikazuje se identifikator bez veze ka ClinicalTrials.gov.
- Odgovor ne sadrži status regrutacije ili fazu studije: ti podaci se izostavljaju, bez praznog polja i bez podrazumevane vrednosti.
- Naslov studije ili citat je veoma dugačak ili sadrži dugačku reč bez razmaka: tekst se prelama unutar okvira i ne izaziva vodoravno pomeranje ni na 320 px.
- Oznaka modela u odgovoru je prazna ili veoma dugačka: oznaka režima ostaje čitljiva i ne lomi zaglavlje; prazna oznaka modela se ne prikazuje kao prazno polje.
- Rezultat sadrži oko 50 studija: postepeno pojavljivanje stavki je ograničeno tako da se poslednja studija ne pojavljuje primetno kasnije od prve, sa uključenim smanjenim pokretom ili bez njega.
- Korisnik odbije pristup mikrofonu ili prepoznavanje govora prestane usred diktiranja: do tada prepoznat tekst ostaje u polju za unos, prikazuje se razumljiva poruka i ništa se ne šalje.
- Ishod je `insufficient_evidence/no_matching_trial`: trenutni dogovoreni format odgovora ne sadrži studije u ovom ishodu. **Odluka (2026-11-09):** za sada se prikazuje samo poruka, bez detalja studija. Uloga B dobija zahtev da format odgovora uključi isključene studije sa razlozima isključenja; kada to bude dostupno, interfejs ih prikazuje kao isključene, nikada kao kandidate.

## Zahtevi

### Functional Requirements

Identifikatori FR-xxx u ovom dokumentu odnose se na funkcionalnost 002. Pozivanja na zahteve osnovne specifikacije pišu se kao `001/FR-xxx`.

- **FR-001**: Interfejs mora da prikaže karticu profila sa izvornim unosom i po jednom oznakom za svaku prepoznatu vrednost profila, sa jedinicom (001/FR-002).
- **FR-002**: Interfejs mora da prikaže izvedene vrednosti sa oznakom da ih je izračunao kod, nazivom formule i izvorom, odvojeno od vrednosti iz unosa (001/FR-004).
- **FR-003**: Interfejs mora da za svaku studiju prikaže srpsku tekstualnu oznaku ishoda i sažetak broja kriterijuma po statusu „ispunjeno“, „nije ispunjeno“ i „nepoznato“.
- **FR-004**: Interfejs mora da za svaki kriterijum prikaže status tekstom, uočenu vrednost (ili „nije uneto“), identifikator izvora i citat (001/FR-005, 001/FR-012).
- **FR-005**: Interfejs mora da odgovor sa ponuđenim opcijama pošalje jednim klikom, a slobodan odgovor uz eksplicitno slanje (001/FR-008, 001/FR-009).
- **FR-006**: Interfejs mora da posle uspešno obrađenog odgovora prikaže potvrdu da je odgovor sačuvan i da je ista provera nastavljena.
- **FR-007**: Interfejs mora da omogući „Počni iznova“ iz svakog stanja posle prvog odgovora servera, sa vraćanjem u početno stanje.
- **FR-008**: Interfejs mora da za svaki ishod `ok`, `needs_clarification`, `insufficient_evidence/no_matching_trial`, `insufficient_evidence/not_in_sources`, `rejected` i `error` prikaže zasebnu, razumljivu poruku (001/FR-017).
- **FR-009**: Interfejs mora da za grešku koja se može ponoviti i za mrežnu grešku ponudi „Pokušaj ponovo“, koji ponavlja poslednji zahtev bez ponovnog unosa; za grešku koja se ne može ponoviti nudi uputstvo ili „Počni iznova“ (001/FR-015).
- **FR-010**: Interfejs mora da istek vremena prikaže porukom različitom od ostalih grešaka.
- **FR-011**: Interfejs mora da odbaci odgovor servera koji ne odgovara dogovorenom formatu i da umesto njega prikaže kontrolisanu grešku.
- **FR-012**: Interfejs mora da oznaku režima rada, oznaku modela, verziju skupa podataka i datum snimka prikazuje isključivo na osnovu odgovora servera; nijedna od tih informacija ne sme biti upisana u interfejs kao stalna vrednost. Oznaka „DEMO REŽIM“ i napomena „bez poziva stvarnom modelu“ prikazuju se samo kada odgovor označava demo režim; u suprotnom se prikazuju oznaka stvarnog režima i oznaka modela. Pre prvog odgovora interfejs ne tvrdi ništa o režimu (001/FR-018).
- **FR-013**: Interfejs mora trajno da prikazuje upozorenje da se koriste sintetički profili i da rezultat nije dijagnoza, savet o lečenju niti odluka o uključivanju. Upozorenje ne sme da tvrdi da su studije sintetičke niti da je aplikacija demo kada to odgovor servera nije potvrdio. Pošto je aplikacija javno dostupna, uz polje za unos stoji izričita napomena da se ne unose stvarni podaci pacijenata (001/FR-007, 001/FR-018).
- **FR-014**: Interfejs mora da tokom obrade prikaže tekstualni indikator, onemogući sve kontrole koje šalju zahtev i ne prikazuje prethodni rezultat kao trenutni (001/FR-017).
- **FR-015**: Interfejs mora da najavi svaku promenu stanja tehnologijama za pomoć i da premesti fokus na novo pitanje, naslov rezultata ili poruku o grešci (001/FR-019).
- **FR-016**: Svaka ključna kontrola mora biti dostupna tastaturom logičnim redosledom, imati dostupan naziv i vidljiv indikator fokusa; tekst i statusne oznake moraju ispuniti nivo kontrasta AA smernica WCAG 2.2 (001/FR-019).
- **FR-017**: Interfejs mora da sav tekst iz odgovora servera (objašnjenja, naslove, citate, pitanja, poruke grešaka) prikazuje kao običan tekst, bez tumačenja HTML-a ili izvršavanja skripti.
- **FR-018**: Interfejs mora da posle hipotetičke izmene jasno označi da je prikazani rezultat rezultat izmene u istoj proveri (001/FR-009).
- **FR-019**: Sažeta tabela kriterijuma prihvatanja u `docs/spec.md` mora imati isto značenje za svaki AC ID kao `specs/001-trialmatch-core/spec.md`; AC ID-jevi se ne preimenuju i ne uklanjaju.
- **FR-020**: Mora postojati mapa pokrivenosti koja za svaki AC-01–AC-13 navodi stanje interfejsa, dokaz ili obrazloženje da je ponašanje isključivo serversko.
- **FR-021**: Mora postojati zapisan demonstracioni scenario sa tačnim sintetičkim unosima koji pokriva ishode iz priče 8.
- **FR-022** *(opciono, AC-13)*: Interfejs može da ponudi glasovni unos koji samo popunjava polje za unos; slanje uvek zahteva eksplicitnu radnju korisnika, a bez podrške pregledača unos tekstom radi nepromenjeno.
- **FR-023**: Sav tekst namenjen korisniku piše se na srpskom, latinicom, neutralnim tonom koji ne zvuči kao medicinska odluka; tehnički identifikatori i izvorni citati mogu ostati u originalu.
- **FR-024**: Interfejs mora da za svaku studiju prikaže njen identifikator, a za identifikator u formatu registra (NCT i osam cifara) i vezu ka zvaničnoj stranici studije na ClinicalTrials.gov, sastavljenu isključivo iz tog identifikatora. Veza se otvara u novoj kartici i ne predaje novoj stranici pristup aplikaciji niti podatke o tome odakle je korisnik došao.
- **FR-025**: Interfejs mora da prikaže status regrutacije i fazu studije kada ih odgovor sadrži, srpskim tekstom; kada ih nema, izostavlja ih bez praznog polja i bez podrazumevane vrednosti.
- **FR-026**: Lista rezultata mora ostati čitljiva i brza sa oko 50 studija: redosled je onaj koji je odredio server, sve studije su potpuno otvorene, citati se prikazuju u celini i prelamaju unutar okvira, a dokazi po kriterijumu (status, vrednost, izvor, citat) vidljivi su bez dodatne radnje. Kada rezultat ima više od jedne studije, iznad liste stoji sažet pregled studija (identifikator, ishod i sažetak kriterijuma) čiji redovi vode do svake studije na istoj stranici. Lista se ne deli na stranice i nijedna studija se ne skuplja.
- **FR-027**: Interfejs mora da odbijanje našeg servera zbog prekoračenog broja zahteva prikaže zasebnom porukom sa vremenom čekanja, različitom od grešaka modela (001/FR-016).
- **FR-028**: Interfejs mora da nedostupan server, odgovor koji nije čitljiv kao podaci i odgovor koji ne prolazi proveru formata prikaže razumljivom porukom na srpskom; sirov tehnički tekst greške se nikada ne prikazuje korisniku (dopunjuje FR-009 i FR-011).
- **FR-029**: Interfejs mora biti upotrebljiv od širine ekrana 320 px naviše, bez vodoravnog pomeranja u bilo kom stanju (001/FR-019).
- **FR-030**: Interfejs mora da radi iz izgrađene (produkcijske) verzije isto kao iz razvojne; svako potrebno podešavanje je dokumentovano, a podešavanje koje zahteva izmenu servera upisuje se kao zahtev drugoj ulozi.
- **FR-031**: Svako stanje interfejsa mora biti proverljivo i u stvarnom i u demo režimu; demo režim se koristi samo za testove i offline evaluaciju i ne poziva plaćeni model.
- **FR-032**: Interfejs ne sme da prikaže interni naziv statusa, ishoda ili kategorije greške, niti internu logičku vrednost; svaka takva vrednost ima srpsku tekstualnu oznaku (dopunjuje FR-003 i FR-023).
- **FR-033**: Pokret u interfejsu služi samo da objasni promenu stanja, ne odlaže prikaz rezultata i ne naglašava ishod studije; uz uključen smanjen pokret prikazane informacije su iste (001/FR-019).
- **FR-034**: Izgrađeni interfejs ne sme da sadrži tajne ni ključeve; sva komunikacija sa modelom ide preko servera. Interfejs mora da radi i kada su interfejs i server na istoj adresi i kada su na različitim adresama, uz jedno dokumentovano podešavanje adrese servisa (dopunjuje FR-030).

### Veza zahteva sa kriterijumima prihvatanja

| Zahtev | Povezani AC | Napomena |
|---|---|---|
| FR-001, FR-002 | AC-01, AC-02 | Prepoznate i izvedene vrednosti vidljive i odvojene. |
| FR-003, FR-004 | AC-01, AC-03, AC-08 | Status, vrednost ili „nije uneto“, izvor i citat po kriterijumu. |
| FR-005, FR-006, FR-018 | AC-03, AC-04 | Jedno pitanje, odgovor jednim klikom, nastavak iste provere. |
| FR-007 | AC-03 | Povratak u početno stanje bez mešanja provera. |
| FR-008 | AC-01, AC-05, AC-06, AC-10 | Svaki ishod ima zasebnu poruku. |
| FR-009, FR-010, FR-011 | AC-07, AC-10 | Kontrolisana greška, ponovni pokušaj, nikada lažan uspeh. |
| FR-012, FR-013 | AC-01, AC-05, AC-10 | Tačne informacije o režimu i podacima; trajno upozorenje. |
| FR-014 | AC-10 | Ograničeno slanje tokom obrade. |
| FR-015, FR-016 | AC-12 | Pristupačnost. |
| FR-017 | AC-08, AC-09 | Nepouzdan tekst se prikazuje bezbedno. |
| FR-019, FR-020 | AC-01–AC-13 | Doslednost i sledljivost kriterijuma. |
| FR-021 | AC-01, AC-03, AC-05, AC-06, AC-10 | Demonstracija ključnih ishoda. |
| FR-022 | AC-13 | Opciono, najniži prioritet. |
| FR-024, FR-025, FR-026 | AC-01, AC-08 | Stvarne studije: identifikator, zvanična veza, status i faza, čitljiva lista. |
| FR-027, FR-028 | AC-07, AC-10 | Ograničenje broja zahteva i mrežne greške su kontrolisane, nikada lažan uspeh. |
| FR-029, FR-033 | AC-12 | Uski ekrani i smanjen pokret. |
| FR-030, FR-031, FR-034 | AC-01, AC-10 | Ista ponašanja u izgrađenoj verziji i u oba režima; bez tajni u interfejsu; testovi ne pozivaju plaćeni model. |
| FR-032 | AC-01, AC-12 | Statusi su reči, nikada interne oznake. |

## Ključni entiteti

- **Stanje prikaza**: trenutno stanje interfejsa; određuje koje poruke i kontrole su vidljive. Postoji 16 stanja: (1) početno, (2) greška validacije unosa (prazan ili predugačak), (3) obrada, (4) rezultat `ok` sa rangiranim studijama, (5) pitanje za dopunu, (6) potvrda nastavka posle odgovora, (7) `no_matching_trial`, (8) `not_in_sources`, (9) odbijen zahtev sa objašnjenjem granice, (10) serverska greška koja se može ponoviti, (11) istek vremena, (12) prekoračen broj zahteva, (13) greška koja se ne može ponoviti, (14) mrežna ili HTTP greška, (15) rezultat hipotetičke izmene u istoj proveri, (16) povratak u početno stanje posle „Počni iznova“. Brojevi 1–9 su nepromenjeni u odnosu na prethodnu verziju specifikacije.
- **Oznaka prepoznate vrednosti**: jedna vrednost profila prepoznata iz unosa, sa nazivom, vrednošću, jedinicom i informacijom da li je izračunata kodom.
- **Sažetak studije**: naslov, identifikator, veza ka zvaničnoj stranici (kada je identifikator u formatu registra), status regrutacije i faza (kada ih odgovor sadrži), srpska oznaka ishoda i broj kriterijuma po statusu.
- **Pregled studija**: sažeta lista iznad rezultata, u redosledu servera; jedan red po studiji sa identifikatorom, ishodom, sažetkom kriterijuma i vezom do te studije na stranici.
- **Red kriterijuma**: opis uslova, status, uočena vrednost ili „nije uneto“, identifikator izvora i citat.
- **Pitanje za dopunu**: tekst pitanja, opcioni ponuđeni odgovori i polje na koje se odnosi.
- **Informacije o izvršavanju**: režim rada, oznaka modela, verzija skupa podataka i datum snimka, kako ih je vratio server.
- **Poslednji zahtev**: zahtev koji se ponavlja izborom „Pokušaj ponovo“ (početna provera, odgovor ili hipotetička izmena).
- **Mapa pokrivenosti AC**: tabela AC ID → stanje interfejsa → dokaz ili obrazloženje.

## Kriterijumi uspeha

### Merljivi ishodi

- **SC-001**: U svih 16 stanja navedenih u ključnom entitetu „Stanje prikaza“, i u stvarnom i u demo režimu, korisnik vidi tekstualnu oznaku stanja i trajno upozorenje o sintetičkim profilima i granicama upotrebe.
- **SC-002**: U svakom prikazanom rezultatu 100% kriterijuma ima status tekstom, uočenu vrednost ili „nije uneto“, identifikator izvora i citat.
- **SC-003**: Odgovor na pitanje sa ponuđenim odgovorima zahteva tačno jednu radnju korisnika; ponovljeni klik ne šalje drugi zahtev.
- **SC-004**: Ceo tok unos → pitanje → odgovor → „Šta ako?“ → „Počni iznova“ može se završiti samo tastaturom, bez ijedne kontrole do koje se ne može doći ili iz koje se ne može izaći.
- **SC-005**: U svim testiranim greškama (serverska, mrežna, istek vremena, prekoračen broj zahteva, nečitljiv odgovor, neispravan odgovor) nijedna ne prikazuje studiju kao kandidata niti sirov tehnički tekst, a svaka greška koja se može ponoviti ponavlja se jednom radnjom.
- **SC-006**: U 100% testiranih odgovora prikazani režim rada, oznaka modela, verzija skupa i datum snimka odgovaraju podacima iz odgovora servera; u stvarnom režimu se nijednom ne pojavljuje tvrdnja o demo režimu.
- **SC-007**: Svih 13 AC ID-jeva ima isto značenje u oba dokumenta i red u mapi pokrivenosti (13/13).
- **SC-008**: Indikator obrade postaje vidljiv u roku od 1 sekunde od slanja, a tokom obrade se ne može poslati drugi zahtev.
- **SC-009**: Tekst iz odgovora koji sadrži HTML oznake ili skriptu prikazuje se doslovno u 100% testiranih slučajeva, bez izvršavanja.
- **SC-010**: Demonstracioni scenario prikazuje šest ishoda iz priče 8 za najviše 3 minuta, na aplikaciji u stvarnom režimu.
- **SC-011**: Sa rezultatom od 50 studija, svih 50 je prikazano u redosledu servera, a lista postaje upotrebljiva (može se pomerati i čitati) u roku od 1 sekunde od prijema odgovora.
- **SC-012**: Na širini od 320 px nijedno od 16 stanja nema vodoravno pomeranje stranice.
- **SC-013**: Sav tekst i statusne oznake imaju kontrast od najmanje 4,5:1, a indikator fokusa najmanje 3:1 (WCAG 2.2 AA), u 100% proverenih kombinacija boja.
- **SC-014**: Izgrađena verzija aplikacije prolazi istu ručnu proveru svih 16 stanja kao razvojna verzija.
- **SC-015**: U 100% prikazanih stanja nema nijednog internog naziva statusa, ishoda ili kategorije greške, niti interne logičke vrednosti.
- **SC-016**: Svaka studija sa identifikatorom u formatu registra ima vezu koja vodi na zvaničnu stranicu baš te studije (100% proverenih).

## Pretpostavke

- Primarni korisnik je lekar ili koordinator studije; pacijent koristi aplikaciju samo uz lekara. Profili su isključivo sintetički; studije u stvarnom režimu potiču iz ručno postavljenog snimka javnog registra ClinicalTrials.gov (oko 50 studija za dijabetes tip 2).
- Stvarni režim je podrazumevan; demo režim se koristi samo za testove i offline evaluaciju.
- Finalni proizvod će verovatno biti javno dostupan na platformi Vercel i nije komercijalan. Zato se interfejs planira za javnu adresu: ne sadrži tajne, ne prikazuje tehničke detalje grešaka i izričito traži da se ne unose stvarni podaci pacijenata. Lokalno pokretanje ostaje podržano.
- Na javnoj platformi server može da izgubi sačuvanu proveru između dva zahteva češće nego lokalno, pa stanje „provera je istekla“ nije redak izuzetak i mora biti jednako razumljivo kao ostale greške.
- Glasovni unos (AC-13) koristi prepoznavanje govora ugrađeno u pregledač, koje zvuk može obrađivati na servisu proizvođača pregledača; to je prihvatljivo samo zato što su profili sintetički, i korisnik o tome dobija kratku napomenu uz kontrolu.
- Zvanična stranica studije na ClinicalTrials.gov može se sastaviti iz samog identifikatora studije; interfejs ne preuzima podatke sa te stranice, samo nudi vezu.
- Naš server ograničava klijenta na 20 zahteva u minuti. Odbijanje trenutno ne sadrži vreme čekanja; dok ga Uloga B ne doda, poruka navodi najduže čekanje od jednog minuta.
- Biblioteka za pokret je već dodata u radnu kopiju, ali njeno odobrenje nije zabeleženo u `docs/decisions.md`; odobrenje tima je otvorena stavka.
- Tamnije boje teksta statusnih oznaka i tamniji indikator fokusa (radi kontrasta AA) odobrio je vlasnik Uloge A 2026-11-09; tačne vrednosti su u planu.
- Merodavan izvor značenja AC ID-jeva je `specs/001-trialmatch-core/spec.md` zajedno sa `docs/project-brief.md`; `docs/spec.md` se usklađuje prema njima.
- Odgovor servera već sadrži oznaku demo režima, oznaku modela i verziju skupa podataka. Datum snimka skupa trenutno nije deo odgovora; dok Uloga B ne doda to polje, interfejs prikazuje samo verziju skupa.
- Kategorija greške i informacija da li se greška može ponoviti već su deo odgovora o grešci; istek vremena modela ima zasebnu kategoriju. Konačnu listu kategorija potvrđuje Uloga B.
- „Počni iznova“ ne briše proveru na serveru; prethodna provera ostaje dok se server ne restartuje, što je u skladu sa dokumentovanim ponašanjem skladišta izvršavanja.
- Vizuelni stil (boje, tipografija, razmaci, komponente) određuje se u fazi plana na osnovu dizajnerskog uputstva vlasnika Uloge A (raniji mockup-i su odbačeni); ova specifikacija opisuje samo ponašanje i sadržaj.
- Ova funkcionalnost ne menja zajedničke šeme, server, model ni evaluaciju. Svaka potrebna izmena formata odgovora upisuje se kao zahtev Ulozi B.

## Zavisnosti od drugih uloga

- **Uloga B**:
  1. Polje sa datumom snimka skupa podataka u informacijama o izvršavanju.
  2. Potvrđena konačna lista kategorija grešaka. U kodu su trenutno, pored poznatih (`model_timeout`, `model_call_limit`, `tool_call_limit`, `tool_error`, `unknown_tool`, `question_round_limit`, `input_too_large`, `run_not_found`, `internal_error`), i `rate_limit_exceeded`, `invalid_request`, `invalid_profile`, `invalid_hypothesis`, `invalid_transition`, `invalid_tool_arguments` i `internal_contract_violation`.
  3. Proširenje formata da ishod `no_matching_trial` uključi isključene studije sa razlozima (zahtev za kasnije; do tada interfejs prikazuje samo poruku).
  4. Vreme čekanja u odbijanju zbog prekoračenog broja zahteva (trenutno ga odgovor ne sadrži).
  5. Stvarni režim na serveru: oznaka demo režima i verzija skupa u odgovoru moraju odražavati stvarno stanje (trenutno su stalne vrednosti u serveru).
  6. Status regrutacije i faza studije u rezultatu po studiji (trenutno postoje u podacima o studiji, ali ne u rezultatu koji stiže do interfejsa).
  7. Po kriterijumu: jedinica uočene vrednosti i informacija da li je vrednost izračunata kodom (trenutno rezultat po kriterijumu sadrži samo vrednost).
  8. Način na koji se izgrađena verzija interfejsa služi zajedno sa serverom, i svako podešavanje adrese servisa koje to zahteva.
  9. Isporuka na platformi Vercel: čuvanje provere između zahteva (trenutno je u memoriji servera), ograničenje broja zahteva po klijentu iza posrednika i dozvola pristupa sa adrese interfejsa ako su interfejs i server na različitim adresama.
- **Uloga C**: (1) rad sa stvarnim modelom potreban za proveru tokova EV-01, EV-02, EV-05, EV-06, EV-07, EV-08 i EV-09 kroz interfejs; (2) stvarni snimak studija sa identifikatorima registra, statusom regrutacije i fazom; (3) citat po kriterijumu je rečenica na koju se kriterijum odnosi, a ne ceo blok kriterijuma studije.
- **Uloga D**: (1) korišćenje mape pokrivenosti AC u mapi dokaza i evaluaciji; (2) uputstvo za pokretanje izgrađene verzije u README i provera čistog checkout-a; (3) bezbednosna provera javne isporuke, uključujući zaštitu od troška poziva modela na javnoj adresi.
- **Tim**: odobrenje biblioteke za pokret koja je dodata u radnu kopiju (konstitucija, „Razvojni tok“: nove biblioteke traže obrazloženje).
