# Pregled specifikacije

## Korisnici i problem

Primarni korisnik je lekar ili koordinator studije koji preliminarno poredi sintetički profil sa kriterijumima podobnosti. Nedostajući i dvosmisleni podaci ostaju nepoznati i mogu pokrenuti jedno ciljano pitanje.

## Tok

1. Korisnik unosi sintetički opis ili pitanje o dostupnim studijama.
2. Server validira zahtev, a mock adapter u Fazi 1 izdvaja nameru i eksplicitne vrednosti.
3. Lokalna pretraga vraća ograničene sintetičke studije; deterministički matcher ocenjuje svaki kriterijum kao `met`, `not_met` ili `unknown`.
4. Ako se odgovorom može razjasniti nepoznanica, UI postavlja jedno pitanje i nastavlja isti `runId`.
5. UI prikazuje status, ograničenja, izvore i odlomke. Posle završenog rezultata korisnik može poslati hipotetičku izmenu istog profila.
6. Zabranjena medicinska namera se odbija; pitanje van lokalnih izvora dobija `insufficient_evidence/not_in_sources`; greške ne postaju uspešan rezultat.

## AI granica i Faza 1

**Jezički model čita pravila i objašnjava rezultat. Odluku donosi deterministički kod.** U ovoj fazi stvarni model nije priključen. Mock adapter proverava granice i tok, ali ne ispunjava zahtev stvarnog modelskog poziva iz CAP-02.

Matcher, eGFR/BMI, jedinice, izbor pitanja, statusi, rangiranje, validacija citata i workflow ostaju deterministički. Aplikacija je samo za čitanje; nema prijave u studiju, poruka ni zakazivanja. Uslovni testovi X-01–X-03 nisu primenljivi jer nema radnji sa posledicama u stvarnom svetu.

## Kriterijumi prihvatanja

| ID    | Očekivano ponašanje                                                                                                                                                                                           |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | Dovoljno podataka daje `ok` sa rangiranim studijama; svaki kriterijum ima status i izvor iz dozvoljenog skupa; rezultat nije odluka o podobnosti.                                                             |
| AC-02 | Kada postoje kreatinin, starost i pol, server deterministički računa eGFR; vrednost nosi naziv formule i izvor; isti ulaz daje isti izlaz.                                                                    |
| AC-03 | Nedostajuća vrednost ostaje `unknown`; postavlja se tačno jedno pitanje; profil se čuva i ista provera se nastavlja bez izmišljene vrednosti; hipotetička izmena menja samo navedena polja pod istim `runId`. |
| AC-04 | Među više nepoznanica bira se pitanje koje razrešava najviše studija, uz stabilno razrešavanje izjednačenja.                                                                                                  |
| AC-05 | Bez podudaranja sledi `insufficient_evidence/no_matching_trial`; pitanje o činjenici van izvora daje `insufficient_evidence/not_in_sources`; nema izmišljene ponude ni odgovora iz opšteg znanja.             |
| AC-06 | Zahtev za dijagnozu, savet o lečenju ili odluku o uključivanju odbija se (`rejected`) pre bilo kog poziva alata ili matchera.                                                                                 |
| AC-07 | Nevažeći strukturisani izlaz modela ima jedan pokušaj ispravke, zatim kontrolisanu grešku; ne stiže do procene kriterijuma.                                                                                   |
| AC-08 | Izvor koji nije bio dostupan u tekućoj proveri ne prikazuje se kao dokaz.                                                                                                                                     |
| AC-09 | Instrukcija u tekstu studije ne menja ishod; izvršavaju se samo dozvoljene funkcije.                                                                                                                          |
| AC-10 | Istek vremena, HTTP 429 i 5xx modela imaju najviše 2 ponovna pokušaja, zatim kontrolisanu grešku sa opcijom ponovnog pokušaja; ulaz, pozivi i trajanje su ograničeni; nikada lažan uspeh.                     |
| AC-11 | Buduće proširenje, van osnovnog obima: nepotkrepljena navedena dijagnoza označava se „zahteva potvrdu lekara“.                                                                                                |
| AC-12 | Ključne kontrole imaju dostupne nazive, dostupne su tastaturom logičnim redosledom i imaju vidljiv indikator fokusa; statusi su tekstualni.                                                                   |
| AC-13 | Opciono: glasovni unos popunjava polje za unos; ništa se ne šalje dok korisnik ne potvrdi tekst; bez podrške pregledača unos tekstom radi nepromenjeno.                                                       |

AC-11 ostaje van osnovnog obima. AC-13 je opcion i definisan u `specs/002-ui-role-a/spec.md`.
