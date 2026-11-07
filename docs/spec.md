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

| ID    | Očekivano ponašanje                                                                                   |
| ----- | ----------------------------------------------------------------------------------------------------- |
| AC-01 | Sintetički profil se poredi sa lokalnim studijama, a rezultat ne predstavlja odobrenje ili podobnost. |
| AC-02 | BMI/eGFR i podržane konverzije su deterministički, izvorno dokumentovani i testirani.                 |
| AC-03 | Odsutni podaci ostaju nepoznati; statusi su trovalentni.                                              |
| AC-04 | Izabere se najkorisnije jedno pitanje, uz stabilan tie-break.                                         |
| AC-05 | Zabranjena namera se odbija; nema odgovora o činjenicama van izvora.                                  |
| AC-06 | Tok ima validirane prelaze, dopunu i kontrolisane greške.                                             |
| AC-07 | Ulazi, strukturisani izlazi, citati i argumenti alata proveravaju se tokom izvršavanja.               |
| AC-08 | Citati se ograničavaju na stabilne ID-jeve i tekst iz tekuće provere.                                 |
| AC-09 | Tekst studije ne može menjati matcher niti dozvoljene alate.                                          |
| AC-10 | Resursi i ulazi su ograničeni; CI/testovi ne pozivaju plaćeni model.                                  |
| AC-12 | Statusi su tekstualni, a glavne kontrole dostupne tastaturom i sa vidljivim fokusom.                  |

AC-11 ostaje van osnovnog obima.
