# Brzi vodič za proveru dizajna

Ovaj vodič opisuje provere koje treba izvršiti kada implementacija postoji. Komande nisu pokretane u plan fazi. Korišćenje stvarnog modela i ručno preuzimanje studijskog snimka nisu deo ovih offline provera.

## Preduslovi

- Node.js `24.22.1` LTS i pnpm `12.16.1`; pre implementacije proveriti da su obe verzije dostupne lokalno.
- Lokalni checkout repozitorijuma.
- Sintetički fixture-i za offline tok. Oni ne zahtevaju pravi ClinicalTrials.gov snimak ni model ključ.
- Živi model je zasebna, naplatna evaluacija; ne uključuje se u testove ili CI.

## Instaliranje i lokalne provere

Nakon što manifest i lockfile postoje:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm build
pnpm test
pnpm smoke
pnpm eval:offline
```

Za poređenje dva sačuvana pokretanja koristi se `pnpm eval:compare <baseline> <final>` nakon što postoje oba direktorijuma rezultata.

Očekivani dokaz: komande završavaju bez greške; offline evaluacija koristi isti fiksni skup sintetičkih slučajeva, ne poziva naplatni model i prikazuje funkcionalne, bezbednosne i fault ishode odvojeno. Ako komanda nije implementirana, prijavljuje se kao nedostajuća, ne kao prolazna.

## Ručna provera korisničkog toka

1. Pokrenuti aplikaciju lokalno komandom `pnpm dev`.
2. U demo režimu uneti sintetički profil iz brief-a: „Muškarac, 62 godine, dijabetes tip 2, HbA1c 8,1%, kreatinin 1,3 mg/dL, visina 178 cm, težina 92 kg, na metforminu.“
3. Proveriti da prikaz sadrži izvor i datum snimka, DEMO oznaku, stalno medicinsko upozorenje i citate u jeziku izvora. Izvedene vrednosti prikazuju se uz izvor i formulu potvrđene u projektnom brief-u.
4. Pošto nedostaje podatak o insulinu, očekivati `needs_clarification`, status `unknown`, tačno jedno pitanje i sačuvan validiran profil.
5. Odgovoriti „ne“. Očekivati nastavak istog `runId`, rezultat studija iz demo fixture-a prema pravilima T-A/T-B/T-C i citate dostupne u tom izvršavanju.
6. Ponoviti sa odgovorom „da“ i proveriti da studija A ne bude prikazana kao kandidat; ako nijedna studija ne preostane, očekivati `insufficient_evidence` sa `no_matching_trial`.
7. Za EV-06, posle rezultata iz koraka 5 uneti „A šta ako je HbA1c 9,0%?“ u UI polje „Šta ako?“ (ili poslati preko `/api/runs/{runId}/hypothesis`). Očekivati isti `runId`, promenjen HbA1c, očuvane ostale validirane vrednosti i ponovnu procenu bez ponavljanja već rešenog pitanja.

Ovaj scenario koristi formule, konverzije i kontrolne vrednosti potvrđene u `docs/project-brief.md`. Opsezi unosa su tehnički sanity check, a ne medicinski/laboratorijski referentni opsezi. Svaka nova ili izmenjena medicinska formula/prag bez potvrde mora nositi oznaku „PROVERITI prema originalnoj publikaciji“.

## Ugovorni i negativni testovi

- Pozvati početni zahtev sa sintetičkim tekstom i potvrditi da odgovor odgovara ugovoru u [contracts/api.md](contracts/api.md).
- Poslati neispravan ili predugačak zahtev: očekivati validacionu grešku pre poziva modela.
- Nastaviti nepostojeći `runId`: očekivati bezbednu kontrolisanu grešku, bez novog izvršavanja sa podrazumevanim podacima.
- Koristiti fixture odlomak sa instrukcijom za `export_all`: očekivati isti deterministički rezultat i nijednu radnju van fiksnog registra.
- Simulirati nevalidan model izlaz, nedostupan citat i grešku alata; proveriti jedan pokušaj popravke za nevalidan strukturisani izlaz, granice pokušaja iz AC-10 i odsustvo lažno uspešnog rezultata.
- Proveriti da citat van `availableSourceIds` nikada nije prikazan i da su prikazani citati poređeni sa originalnim odlomkom.

## Priprema stvarnog snimka

Samo čovek preuzima snimak i postavlja ga u `data/raw/`. Ovaj vodič ne zahteva mrežni poziv. Nakon postavljanja fajla, `pnpm data:prepare` treba da radi offline, jasno prijavi neočekivanu strukturu i sačuva poreklo/manifest. Nepregledana pravila ne ulaze u automatski matcher. Uslove korišćenja i sirovu strukturu čovek proverava pre prihvatanja korpusa.

## Živa evaluacija

Živa evaluacija pokreće se odvojeno komandom `pnpm eval:live` uz eksplicitni potvrđujući flag koji odbija pokretanje bez saglasnosti za trošak. Tačan naziv flaga još nije definisan. Živi pozivi se ne pokreću ovim vodičem, testovima ili CI-jem. Prvi kompletan rezultat postaje nepromenljivi baseline; poređenje mora ponoviti isti fiksni skup.

## Strategija testiranja

| Nivo | Obuhvat | Dokaz |
|---|---|---|
| Jedinični | Parsiranje/validacija profila, normalizacija jedinica, izvedene vrednosti, matcher, pitanje, prelazi stanja, citati, numeričko uzemljenje, alati, offline priprema podataka. | Vitest; bez plaćenog modela. |
| Ugovorni | Zahtev/odgovor, statusi, odbijanje polja izvan šeme, citati dostupni po izvršavanju. | Provere zajedničke šeme i Fastify granice. |
| Integracioni/smoke | UI → server → mock adapter → alat → rezultat; dopuna nastavlja isti `runId`. | Lokalni API smoke i ručni tok iznad. |
| Bezbednosni/fault | Injection, nepoznati alat/argument, prevelik ulaz, nevažeći model izlaz, neispravan citat, timeout/429 i greška eGFR alata. | EV-10 do EV-16; nijedan slučaj ne sme dati lažan uspeh. |
| Evaluacija offline | EV-11 do EV-16 nad sintetičkim fixture-ima; EV-07–EV-09 su samo dry-run bez EV pass rezultata, a EV-10-offline provera se vodi odvojeno od EV-10. | Fiksni skup; rezultati i trace-i po ID-ju; baseline nepromenljiv. |
| Evaluacija uživo | EV slučajevi koji traže pravi model. | Odvojena potvrđena komanda; identifikator modela, verzije i trošak se beleže; nikad u CI. |

Detaljna raspodela očekivanih ishoda ostaje u izvornoj specifikaciji i brief-u; ovaj vodič ih ne menja.

## Izveštavanje i dokazivanje poboljšanja

Rezultati ne smeju da se sažmu u jednu metriku „AI tačnosti“. Izveštaj razdvaja:

- funkcionalni uspeh EV-01–EV-09 kao broj prolaza od ukupnog broja stvarno izvršenih slučajeva; EV-07–EV-09 dry-run se izostavlja iz broja prolaza i imenioca;
- bezbednosni ishod EV-10;
- determinističke i simulirane greške EV-11–EV-16;
- u Fazi 1 preciznost i odziv parsiranja prema 6–10 početnih primera; pun skup od oko 30 ručno obeleženih kriterijuma pripada Fazi 2;
- podršku citata, trajanje, broj poziva modela/alata i tokene kada ih provajder vraća.

Svako pokretanje beleži git commit, verziju skupa slučajeva, verziju podataka iz manifesta, prompt i šemu, identifikator modela i podešavanja. Trošak, ako se računa, navodi model, cenovnik i datum procene. Rezultati se čuvaju kao mašinski čitljiv zapis, sažetak i trace-i po slučaju. Baseline se nikada ne prepisuje. Poređenje posle izmene koristi iste case ID-jeve; prikazuju se svi ishodi, varijacije i regresije. Mali skup služi za razvoj i poređenje, ne kao statistički dokaz.

Proces poboljšanja beleži konkretan problem, pogođene slučajeve, postojeći baseline, nalaz u trace-u, hipotezu, ciljanu izmenu i commit, poređenje nad istim skupom, regresije i odluku o zadržavanju izmene. Ako nema funkcionalnog neuspeha, cilj može biti kašnjenje, cena ili jasnoća, ali se neuspeh ne izmišlja.
