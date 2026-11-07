<!--
Sync Impact Report
Version change: početni nacrt → 1.0.0
Modified principles: nema prethodnih usvojenih principa; usvojeno devet principa TrialMatch-a.
Added sections: Ograničenja projekta; Razvojni tok.
Removed sections: nijedna usvojena sekcija.
Follow-up TODO: potvrditi datum ratifikacije.
-->

# Konstitucija projekta TrialMatch

## Osnovni principi

### I. Jezički model objašnjava, deterministički kod odlučuje
Jezički model sme da parsira pravila i da na srpskom objasni rezultat uz dokaze. Status kriterijuma, rangiranje studija, izvedene vrednosti i prelazi workflow-a određuju se proverljivim determinističkim kodom. Model ne sme samostalno da proglasi pacijenta podobnim niti da zameni rezultat alata.

### II. Nepoznato je ravnopravan rezultat
Svaki kriterijum ima status `met`, `not_met` ili `unknown`. Nedostajući, dvosmislen ili nedovoljno potkrepljen podatak ostaje `unknown`; nijedna komponenta ne sme ga prevesti u „da“ ili „ne“ radi pogodnosti. Nepoznanica može pokrenuti jedno ciljano pitanje, a matcher nikada ne dobija izmišljenu vrednost.

### III. Granice medicinske bezbednosti
TrialMatch nije alat za dijagnostiku, lečenje ni doziranje. Ne daje medicinski savet i ne odlučuje da li pacijent sme da uđe u studiju. Prikazuje samo procenu ispunjenosti kriterijuma uz izvore, a konačnu odluku donosi lekar. Medicinske formule i pragovi moraju imati izvor u kodu i dokumentaciji i oznaku „PROVERITI prema originalnoj publikaciji“ dok ih čovek ne potvrdi.

### IV. Validacija na svakoj granici
Ulazi korisnika, odgovori modela, citati, argumenti alata, podaci iz fajlova i izlazi API-ja moraju se validirati tokom izvršavanja. Statički TypeScript tipovi ili tvrdnje tipa `as Result` nisu zamena za runtime proveru. Nevalidan ili nepouzdan podatak ne sme stići do determinističkog matchera niti biti prikazan kao dokaz.

### V. Dokazi prethode tvrdnjama
Tvrdnje o kvalitetu sistema moraju biti potkrepljene unapred definisanim evaluacionim skupom i sačuvanim rezultatima. Baseline prve kompletne evaluacije čuva se neizmenjen i nikada se ne izmišlja ili naknadno rekonstruiše. Poređenja koriste iste slučajeve po stabilnom ID-ju; ne biraju se najbolji pokušaji, a regresije i neuspehi se prijavljuju. Funkcionalni, bezbednosni i fault rezultati prikazuju se odvojeno.

### VI. Tajne i podaci pacijenata ostaju van repozitorijuma
Repozitorijum ne sme sadržati tajne ni stvarne podatke pacijenata. Profili i evaluacioni primeri su sintetički. Tajne se konfigurišu samo na serveru; `.env.example` sadrži nazive i bezbedne primer-vrednosti. Testovi ne pozivaju plaćene API-je modela. Pravi snimak studija čovek ručno postavlja u `data/raw/`; bez izričitog korisničkog zahteva nema mrežnog pristupa, preuzimanja ni skrejpovanja.

### VII. Jednostavnost pre broja funkcionalnosti
Obim ograničava se na jezgro opisano u brief-u. Opcione mogućnosti, dodatni agenti, vektorske baze, deployment i druge proširbe ne dodaju se bez jasne potrebe. Prednost imaju razumljive, pregledive komponente i proverljivi dokazi nad brojem funkcionalnosti.

### VIII. Ponašanje ima stabilan AC ID i proveru
Svako prihvaćeno ponašanje povezano je sa stabilnim identifikatorom kriterijuma prihvatanja (`AC-01` i dalje) i proverljivim dokazom, kao što su test, evaluacioni slučaj ili dokumentovana ručna provera. Identifikatori se zadržavaju kroz specifikaciju, zadatke, testove i mapu dokaza; Uklanjanje ili promena značenja AC ID-ja mora biti obrazložena i dokumentovana, uz očuvanje sledljivosti kroz specifikacije, testove i evidenciju. Izmena Constitution-a potrebna je samo ako promena utiče na neki od njenih principa ili pravila.

### IX. Specifikacija i dokumentacija prate ponašanje
Promena ponašanja se isporučuje zajedno sa ažuriranom specifikacijom i relevantnom dokumentacijom. Specifikacija opisuje šta i zašto; arhitektonski plan opisuje kako. Nepoznate činjenice se ne izmišljaju: najjednostavnija pretpostavka se beleži u `docs/decisions.md`, a neodređeno ponašanje se jasno označava kao TODO.

## Ograničenja projekta

- Podržani su isključivo sintetički profili. Sistem je samo za čitanje i ne upisuje podatke u spoljne sisteme.
- Studije se pripremaju oflajn iz lokalnog, ručno postavljenog snimka; citati moraju upućivati na stabilne izvore dostupne u tekućem izvršavanju.
- Model dobija ograničen kontekst i može pozvati samo serverski dozvoljene alate sa validiranim argumentima. Ne dobija proizvoljan kod, shell, SQL ili mrežne adrese.
- Unosi, kontekst, broj poziva i trajanje imaju ograničenja; ponovni pokušaji su ograničeni. Tehnički neuspeh nikada ne sme biti prikazan kao uspešna podobnost.
- Svi tekstovi namenjeni ljudima pišu se na srpskom, latinicom; tehnički identifikatori i izvorni citati mogu ostati u originalu.
- Testovi i offline evaluacije moraju biti ponovljivi i ne smeju trošiti novac na pozive modela.

## Razvojni tok

- Razvoj prati Spec Kit tok: konstitucija, specifikacija, razjašnjenje, plan, zadaci, analiza i implementacija. Ne preskačite korak koji je korisnik zadržao za sebe.
- Pre prihvatanja izmene proveriti njenu usklađenost sa principima, stabilne AC ID-jeve, validaciju i ažuriranost specifikacije i dokumentacije.
- Za izmene koje utiču na kod pokrenuti relevantne offline provere (tipove, lint, build, testove ili offline evaluaciju) i navesti stvarno izvršene komande i rezultate. Ne tvrditi da provera prolazi ako nije pokrenuta.
- Za promenu rezultata evaluacije sačuvati trace i porediti iste slučajeve sa nepromenjenim baseline-om; zabeležiti hipotezu, izmenu, regresije i odluku u skladu sa `docs/evaluation.md`.
- Ne uvoditi nove biblioteke ili opcione mogućnosti bez opravdanja u planu i pregledu uticaja na bezbednost, pouzdanost i ponovljivost.

## Upravljanje

Ova konstitucija je merodavna za projektne principe i ima prednost nad suprotnim praksama u specifikacijama i kodu. Izmena zahteva obrazloženje, ažuriranje Sync Impact Report-a i verzije, kao i usklađivanje pogođenih specifikacija, šablona i mape dokaza. Promene principa ili pravila koje menjaju kompatibilnost zahtevaju MAJOR verziju; dodavanje principa ili značajno proširenje zahteva MINOR; pojašnjenja i ispravke bez promene značenja zahtevaju PATCH.

Svaki pregled izmene proverava usklađenost sa ovom konstitucijom, primenljivim AC kriterijumima i odgovarajućim dokazima. Neslaganje se rešava izmenom koda/dokumentacije ili formalnom izmenom konstitucije, a ne tihim izuzetkom. `AGENTS.md` daje kratka operativna uputstva; detaljni zahtevi su u `docs/project-brief.md` i `specs/`.

**Verzija**: 1.0.0 | **Ratifikovano**: TODO(datum ratifikacije) | **Poslednja izmena**: 2026-11-07
