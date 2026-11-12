# Podaci demonstracije

`fixtures/trials.json` sadrži isključivo sintetičke studije T-A, T-B i T-C za testove i DEMO režim. Nisu stvarne kliničke studije, a sintetički pragovi nisu medicinski saveti niti kliničke preporuke.

Poreklo, verzija, datum i ograničenja sintetičkog skupa navedeni su u [manifest.json](manifest.json). Taj manifest važi samo za fixture-e, ne za raw snimak.

## Dostavljeni raw snimak

`raw/studies_50_recruiting_2026-11-12.json` je lokalni fajl koji je korisnik dostavio; njegov sadržaj nije preuzet niti menjan u ovoj pripremi. U njemu je 50 zapisa sa 50 jedinstvenih NCT ID-jeva, svih 50 ima status `RECRUITING`, a top-level `nextPageToken` je prisutan. Polje tokena je zadržano u raw kopiji kao izvorni metapodatak; normalizovani TrialMatch podaci ne treba da ga tretiraju kao studiju.

Korisnik je potvrdio datum snimka kao 2026-11-12. Filesystem creation time je `2026-11-12T01:47:55.073688838+01:00` (Europe/Belgrade); ime fajla sadrži datum, ne tačan čas. SHA-256 raw fajla: `89893189d85eaf9ff0268748953d7d76ea4ecf10e27187d77e624eada942fd1a`.

Tačan endpoint/izvoz, upit i filteri, da li su povezane stranice preuzete, i uslovi korišćenja/licence nisu dokumentovani. Zato se ovaj fajl još ne predstavlja kao potpun ili odobren korpus. Pre uvoza i upotrebe, čovek potvrđuje te metapodatke i pregledava pravila studija. Sve pripremne komande moraju raditi lokalno nad eksplicitnim ulazom; ne preuzimaju niti skrejpuju podatke.
