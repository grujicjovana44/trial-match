# Kontrolna lista UX-a i pristupačnosti: Korisnički tok i interfejs TrialMatch (Uloga A)

**Namena**: Provera da li su zahtevi za korisničko iskustvo i pristupačnost potpuni, jasni, dosledni i merljivi pre implementacije, uz dizajnerske provere prihvatanja koje je zadao vlasnik Uloge A.
**Datum izrade**: 2026-11-10
**Pregled zahteva**: 2026-11-10; CHK001–CHK053 zadovoljavaju. CHK054–CHK064 čekaju implementaciju.
**Funkcionalnost**: [spec.md](../spec.md), [plan.md](../plan.md), [tasks.md](../tasks.md)

**Napomena**: Ovu listu je izradila komanda `$speckit-checklist` na osnovu konteksta funkcionalnosti.

**Vlasništvo pregleda**: Listu popunjava pregledač. Stavka se označava `[x]` tek kada pregledač utvrdi da je uslov ispunjen.

**Značenje oznake**: U odeljcima 1 do 9 `[x]` znači da je kvalitet zahteva pregledan i zadovoljava; ne znači da je implementacija gotova. Odeljak 10 je izuzetak, dodat na zahtev vlasnika Uloge A: te stavke se proveravaju na gotovoj implementaciji.

Oznake u zagradama: [Potpunost], [Jasnoća], [Doslednost], [Merljivost], [Pokrivenost], [Granični slučaj], [Praznina]. Upućivanja: „Spec“ je `spec.md`, „Plan“ je `plan.md`, „DM“ je `data-model.md`.

## 1. Potpunost zahteva

- [x] CHK001 Da li je za svako od 16 stanja prikaza zapisano šta korisnik vidi i koje kontrole su dostupne? [Potpunost, Spec „Stanje prikaza“, Plan §5.6]
- [x] CHK002 Da li je za svaku vrstu greške zapisan naslov, tekst i radnja koja se nudi? [Potpunost, Plan §6 `errors`, DM §2]
- [x] CHK003 Da li su zahtevi za prikaz porekla vrednosti (iz teksta, izračunato kodom, citat izvora) zapisani za karticu profila i za red kriterijuma? [Potpunost, Spec FR-001, FR-002, FR-004]
- [x] CHK004 Da li je zapisano šta se prikazuje kada vrednost nedostaje, na svakom mestu gde se vrednost prikazuje? [Potpunost, Spec priča 1 scenario 4, DM §4]
- [x] CHK005 Da li su svi tekstovi interfejsa ispisani doslovno, bez mesta gde bi implementacija morala da smisli tekst? [Potpunost, Plan §6]
- [x] CHK006 Da li je trajno medicinsko upozorenje zahtevano u svakom stanju, uključujući stanja greške? [Potpunost, Spec FR-013, SC-001]
- [x] CHK007 Da li su zahtevi za prikaz režima rada zapisani i za trenutak pre prvog odgovora servera? [Potpunost, Spec priča 4 scenario 4]

## 2. Jasnoća zahteva

- [x] CHK008 Da li je „čitljiva i brza lista“ za oko 50 studija izražena merljivim uslovom? [Jasnoća, Spec FR-026, SC-011]
- [x] CHK009 Da li je „vidljivo označen kao zastareo“ opisan konkretnim svojstvima (tekst trake, onemogućene kontrole)? [Jasnoća, Spec priča 6 scenario 3, Plan §5.5]
- [x] CHK010 Da li je za svaki status i ishod zapisana tačna srpska oznaka, bez sinonima na različitim mestima? [Jasnoća, Plan §5.3, §6]
- [x] CHK011 Da li je jasno razgraničeno koja greška nudi „Pokušaj ponovo“, koja „Počni iznova“, a koja samo uputstvo? [Jasnoća, DM §2, Plan §5.6]
- [x] CHK012 Da li je vreme čekanja kod prekoračenog broja zahteva određeno i kada server ne pošalje podatak o čekanju? [Jasnoća, Spec „Edge Cases“, Istraživanje R-08]
- [x] CHK013 Da li je „neutralan ton koji ne zvuči kao medicinska odluka“ potkrepljen primerima dozvoljenih i izbegnutih izraza? [Jasnoća, Spec FR-023]

## 3. Doslednost zahteva

- [x] CHK014 Da li se broj stanja prikaza (16) poklapa u specifikaciji, modelu podataka, planu i vodiču za proveru? [Doslednost, Spec, DM §1, Plan §5.6]
- [x] CHK015 Da li AC-01–AC-12 zadržavaju značenje iz specifikacije 001 u planiranoj tabeli i mapi pokrivenosti, uz jasno izdvojen opcion AC-13 definisan u specifikaciji 002? [Doslednost, Spec FR-019]
- [x] CHK016 Da li su nazivi kontrola koje testovi koriste isti u specifikaciji, planu i zadacima? [Doslednost, Plan §5.8]
- [x] CHK017 Da li se pravilo za prethodni rezultat posle greške poklapa u specifikaciji, istraživanju i modelu podataka? [Doslednost, Spec „Clarifications“ 2026-11-10, Istraživanje R-05, DM §1]
- [x] CHK018 Da li je odluka „citati uvek u celini“ dosledna sa zahtevom za čitljivost na 320 px? [Doslednost, Spec FR-026, FR-029]
- [x] CHK019 Da li se vrednosti tokena boja u planu poklapaju sa izmerenim odnosima kontrasta u istraživanju? [Doslednost, Plan §5.2–§5.3, R-12]

## 4. Kvalitet kriterijuma prihvatanja

- [x] CHK020 Da li svaki kriterijum uspeha SC-001–SC-016 može da se proveri testom ili zapisanom ručnom proverom? [Merljivost, Spec „Kriterijumi uspeha“]
- [x] CHK021 Da li je za svaki AC naveden dokaz ili obrazloženje da je ponašanje isključivo serversko? [Merljivost, Plan §11]
- [x] CHK022 Da li su pragovi kontrasta izraženi brojevima za tekst (4,5:1), indikator fokusa (3:1) i ne-tekstualne elemente (3:1)? [Merljivost, Spec SC-013, Plan §5.3]
- [x] CHK023 Da li je trajanje demonstracionog scenarija merljivo po koraku, a ne samo ukupno? [Merljivost, Plan §12]

## 5. Pokrivenost scenarija

- [x] CHK024 Da li su zahtevi zapisani za tok samo tastaturom kroz ceo niz unos → pitanje → odgovor → „Šta ako?“ → „Počni iznova“? [Pokrivenost, Spec priča 5 scenario 1, SC-004]
- [x] CHK025 Da li je zapisano gde se fokus nalazi posle svakog koraka toka? [Pokrivenost, Plan §5.8, DM §1]
- [x] CHK026 Da li je zapisano šta čitač ekrana najavljuje pri početku obrade, rezultatu, potvrdi dopune i grešci? [Pokrivenost, Spec priča 5 scenario 2, Plan §5.8]
- [x] CHK027 Da li su zahtevi za rezultat hipotetičke izmene dovoljni da se on razlikuje od izvornog rezultata bez oslanjanja na boju? [Pokrivenost, Spec FR-018, Plan §5.6 stanje 15]
- [x] CHK028 Da li je svako stanje pokriveno i za stvarni i za demo režim? [Pokrivenost, Spec FR-031]
- [x] CHK029 Da li je raspored za telefon i za desktop zapisan za svako stanje? [Pokrivenost, Plan §5.6]

## 6. Granični slučajevi

- [x] CHK030 Da li je zapisano ponašanje za unos duži od 4000 znakova tako da se tekst ne skraćuje neprimetno? [Granični slučaj, DM §3]
- [x] CHK031 Da li je zapisano ponašanje kada studija nema nijedan kriterijum? [Granični slučaj, Spec „Edge Cases“]
- [x] CHK032 Da li je zapisano ponašanje za veoma dugačak naslov, citat, identifikator ili oznaku modela na 320 px? [Granični slučaj, Spec „Edge Cases“, Plan §5.4]
- [x] CHK033 Da li je zapisano ponašanje kada identifikator studije nije u formatu registra? [Granični slučaj, Spec FR-024]
- [x] CHK034 Da li je zapisano ponašanje kada pitanje ima prazan spisak ponuđenih odgovora? [Granični slučaj, Istraživanje R-02]
- [x] CHK035 Da li je zapisano ponašanje za više brzih klikova na ponuđeni odgovor ili na „Pokušaj ponovo“? [Granični slučaj, Spec „Edge Cases“, SC-003]
- [x] CHK036 Da li je zapisano ponašanje „Počni iznova“ dok obrada traje? [Granični slučaj, Spec „Edge Cases“, DM §1]
- [x] CHK037 Da li je zapisano ponašanje kada provera više ne postoji na serveru? [Granični slučaj, Spec priča 3 scenario 10]
- [x] CHK038 Da li je zapisano ponašanje za kategoriju greške koju interfejs ne poznaje? [Granični slučaj, DM §2]

## 7. Nefunkcionalni zahtevi: pristupačnost, pokret, bezbednost prikaza

- [x] CHK039 Da li svaki status kriterijuma ima tekstualnu oznaku i znak, a svaki ishod studije tekstualnu oznaku, tako da značenje nikada ne zavisi samo od boje? [Potpunost, Spec priča 5 scenario 3, Plan §5.3]
- [x] CHK040 Da li je zahtevano da prikazane informacije budu iste uz uključen smanjen pokret? [Potpunost, Spec FR-033]
- [x] CHK041 Da li je za svaku animaciju zapisan razlog i najduže trajanje? [Jasnoća, Plan §5.7]
- [x] CHK042 Da li je zapisano ograničenje kašnjenja pojavljivanja za dugačku listu studija? [Jasnoća, Plan §5.7, R-09]
- [x] CHK043 Da li je zahtevano da sav tekst iz odgovora servera bude prikazan kao običan tekst, sa navedenim poljima na koja se to odnosi? [Potpunost, Spec FR-017]
- [x] CHK044 Da li je zapisano da veza ka spoljnoj stranici ne predaje pristup aplikaciji i da se sastavlja samo iz proverenog identifikatora? [Potpunost, Spec FR-024, Plan R-10]
- [x] CHK045 Da li je zahtevano da interfejs ne sadrži tajne i da uz polje stoji napomena o stvarnim podacima pacijenata? [Potpunost, Spec FR-013, FR-034]
- [x] CHK046 Da li je najmanja podržana širina ekrana zapisana brojem, uz pravilo da nema vodoravnog pomeranja? [Merljivost, Spec FR-029, SC-012]

## 8. Zavisnosti i pretpostavke

- [x] CHK047 Da li je za svaki deo interfejsa koji zavisi od druge uloge zapisano šta se prikazuje dok zahtev ne bude isporučen? [Potpunost, Plan §13, DM §5]
- [x] CHK048 Da li svaki zahtev drugoj ulozi ima identifikator, opis potrebe i deo interfejsa koji čeka? [Potpunost, `contracts/cross-team-requests.md`]
- [x] CHK049 Da li je zapisano da „Pokušaj ponovo“ posle greške u dopuni danas ne može da nastavi istu proveru i šta korisnik tada vidi? [Jasnoća, Istraživanje R-07, REQ-B10]
- [x] CHK050 Da li je pretpostavka o javnoj isporuci praćena posledicama za poruke o greškama i podešavanja? [Doslednost, Spec „Pretpostavke“, FR-034]

## 9. Nejasnoće i neslaganja

- [x] CHK051 Da li su neslaganja sa veštinom `taste` zapisana kao predlozi, a ne ugrađena u plan? [Doslednost, Plan §5.1]
- [x] CHK052 Da li je odobrenje tima za biblioteku `motion` 14.6.0 zabeleženo sa datumom, uz zadatak za prenos odluke u `docs/decisions.md`? [Jasnoća, REQ-T1]
- [x] CHK053 Da li su neproverene činjenice jasno navedene, uz odgovornu ulogu, ručnu proveru ili unapred definisano rešenje koje ne zavisi od njih? [Jasnoća, Istraživanje R-10, R-14; Plan §6]

## 10. Dizajnerske provere prihvatanja (proverava se na gotovoj implementaciji)

Ove stavke je zadao vlasnik Uloge A. Proveravaju se posle implementacije, testovima i ručno prema [quickstart.md](../quickstart.md).

- [ ] CHK054 Svaki AC iz `specs/002-ui-role-a` ima vidljivo stanje interfejsa (mapa u `docs/ac-coverage.md`; AC-04 i AC-11 imaju zapisano obrazloženje).
- [ ] CHK055 Uz uključen smanjen pokret ekran prikazuje iste informacije (quickstart §7, provera 5).
- [ ] CHK056 Nijedan interni naziv ni logička vrednost se ne pojavljuje u interfejsu (`apps/web/test/accessibility.test.tsx`, `apps/web/test/unit/copy.test.ts`).
- [ ] CHK057 Izračunate vrednosti se na prvi pogled razlikuju od prepoznatih: isprekidan okvir i sufiks „izračunao kod“ (quickstart §5, stanje 4).
- [ ] CHK058 Sav tekst i sve oznake ispunjavaju WCAG 2.2 AA, a indikator fokusa 3:1 (`apps/web/test/unit/contrast.test.ts`).
- [ ] CHK059 `pnpm test` prolazi, a dostupni nazivi „Opis profila ili pitanje“, „Proveri kriterijume“, „Pošalji dopunu“, „Ponovi proveru“ i dugmad ponuđenih odgovora su nepromenjeni.
- [ ] CHK060 Svaki status kriterijuma i ishod studije ima tekstualnu oznaku; boja nije jedini signal (quickstart §7, provera 6).
- [ ] CHK061 Ceo tok se može proći samo tastaturom, uz vidljiv indikator fokusa na svakoj kontroli (quickstart §7, provera 1).
- [ ] CHK062 Na širini 320 px nijedno stanje nema vodoravno pomeranje (quickstart §7, provera 4).
- [ ] CHK063 Upozorenje je vidljivo u svakom stanju i ne može se skupiti.
- [ ] CHK064 Nijedan rezultat nije predstavljen kao odluka o podobnosti; nema slavljeničkih efekata.

## Napomene

- Pitanja za razjašnjenje pre izrade liste nisu postavljena: namena (UX i pristupačnost), publika (pregledač pre implementacije i vlasnik Uloge A posle nje) i dubina (kapija pre implementacije) bili su jednoznačni u zadatku.
- Stavke se označavaju `[x]` kada su pregledane i zadovoljene; nalazi se upisuju uz stavku.
- Stavke 1 do 9 ne proveravaju da li kod radi, već da li su zahtevi dovoljno dobri da se po njima radi.

## Zapis pregleda 2026-11-10

Pregled je zatražio vlasnik Uloge A. Pregledani su specifikacija 002, kanonski AC iz specifikacije 001, plan, istraživanje, model podataka, zadaci, ugovori i vodič za ručnu proveru. Ocena se odnosi na kvalitet planiranih zahteva; nije potvrda da je aplikacija implementirana niti da testovi prolaze.

| Stavke | Osnov za oznaku zadovoljava |
|---|---|
| CHK001–CHK007 | Plan §5.5–§5.8 i §6 određuje sadržaj svih stanja, tekstove, upozorenje, izvore i režim; DM §4 određuje nedostajuće vrednosti. |
| CHK008–CHK013 | SC-011 i T219 imaju prag 1 s za 50 studija; Plan §5.5–§5.6, DM §2 i Istraživanje R-08 određuju zastarelost, radnje, čekanje i neutralne tekstove. |
| CHK014–CHK019 | Usklađeno je 16 stanja; AC-01–AC-12 su stabilni, AC-11 ostaje van obima, AC-13 je opcion dodatak iz 002. Plan §10–§11 predstavlja budući sadržaj dokumenata, a T239 i T240 tek treba da ga prenesu. Prethodni rezultat i puni citati imaju određeno ponašanje; tokeni odgovaraju Istraživanju R-12. |
| CHK020–CHK023 | SC-001–SC-016 imaju automatizovanu ili zapisanu ručnu proveru; T219 meri vreme renderovanja kao približnu automatsku proveru SC-011, a quickstart §9 proverava stvarno pomeranje i čitanje u pregledaču. Plan §11 navodi dokaz ili izuzetak za svaki AC, §12 raspodeljuje 180 s po koracima. |
| CHK024–CHK029 | Plan §5.6 i §5.8, DM §1 i quickstart §5–§7 određuju raspored, fokus i najave; provera stvarnog modela je eksplicitno odložena do REQ-B5 i REQ-C1. |
| CHK030–CHK038 | DM §2–§4, Plan §5.4–§5.6 i zadaci T209, T215–T217, T222–T228 određuju validaciju, prazne kriterijume i opcije, duge tekstove, veze, ponavljanje i isteklu proveru. |
| CHK039–CHK046 | Plan §5.3, §5.7 i §5.8 određuje tekstualne signale, smanjen pokret, trajanja i kontrast; FR-017, FR-024, FR-029 i FR-034 određuju običan tekst, bezbedne veze, širinu i odsustvo tajni. |
| CHK047–CHK050 | Plan §13, DM §5 i ugovori određuju izostavljene podatke do isporuke drugih uloga; Istraživanje R-07 beleži ograničenje nastavka neuspele provere. |
| CHK051–CHK053 | Predlozi dizajnerske veštine nisu usvojeni mimo ograničenja vlasnika. Tim je odobrio `motion` 14.6.0 (potvrda vlasnika 2026-11-10, Istraživanje R-16); T246 beleži odluku u zajedničkim dokumentima. Nepoznate vrednosti i ručne provere nisu predstavljene kao proverene činjenice. |

**Zaključak pregleda**: 53/53 stavke kvaliteta zahteva zadovoljavaju; 11 provera gotove implementacije ostaje neoznačeno. Nema otvorene stavke kvaliteta zahteva koja blokira prvu grupu. Poznate neoznačene stavke CHK054–CHK064 ne zahtevaju ponovno odobrenje za prvu grupu: vlasnik je zatražio pripremu predaje za početak implementacije, a ove provere po definiciji slede posle nje. One ostaju obavezne za završnu proveru proizvoda.
