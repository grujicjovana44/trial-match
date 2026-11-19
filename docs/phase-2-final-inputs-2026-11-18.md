# Završni ulazi za Fazu 2

Matcher odobrenje, compile i 20-study integracija su završeni. Ovaj obrazac je popunjen iz fajlova projekta i vlasničke potvrde u razgovoru od 2026-11-18. Polja koja nisu eksplicitno nađena označena su `NIJE ZABELEŽENO`; nisu dopunjavana pretpostavkom.

## 1. Poreklo snimaka i izbor studija

### 1A. Dostavljeni snimak od 50 studija

Dokazi: `data/raw/studies_50_recruiting_2026-11-12.json` sadrži niz `studies` sa 50 zapisa (50 jedinstvenih NCT ID-jeva), svaki sa `overallStatus=RECRUITING`, i top-level `nextPageToken`. `data/README.md` beleži datum 2026-11-12 i SHA-256 raw fajla; `specs/003-phase-2-live-integration/research.md` beleži statički pregled i vreme kreiranja fajla, ali ne i izvorni zahtev.

- API endpoint i način izvoza: `NIJE ZABELEŽENO` u sačuvanom raw fajlu, provenance dokumentima ili Git istoriji ovog fajla. Projekat sadrži API URL primere za druge zadatke; oni nisu dokaz izvornog zahteva za ovaj snimak.
- Tačan query i filteri: `NIJE ZABELEŽENO`. Status `RECRUITING` za svih 50 zapisa dokazuje sadržaj, ne koji je API filter korišćen.
- API `totalCount`: `NIJE ZABELEŽENO`; raw fajl nema to polje.
- Broj preuzetih stranica: `NIJE ZABELEŽENO`.
- Paginacija: `nextPageToken` je prisutan u raw fajlu. Nema sačuvanog odgovora naredne stranice, zahteva sa `pageToken`, niti loga koji potvrđuje da li je token korišćen.
- Potpunost: `NIJE POTVRĐENA`. Prisustvo tokena pokazuje da je odgovor nudio nastavak; samo po sebi ne dokazuje da je nastavak pokušan ili da je snimak nepotpun.
- Izvor za navedene činjenice: `data/raw/studies_50_recruiting_2026-11-12.json`, `data/README.md`, `specs/003-phase-2-live-integration/research.md`; relevantni Git log počinje dodavanjem raw snimka u `57b1581` i ne sadrži spremljeni API zahtev/odgovor o paginaciji.

### 1B. 18 dodatnih studija u 20-study demo korpusu

Dokazi: `data/raw/studies_20_api_provenance_2026-11-16.json` beleži `selection.searchUrl` sa `query.cond=type 2 diabetes`, `filter.overallStatus=RECRUITING,NOT_YET_RECRUITING`, `pageSize=100` i `format=json`, kao i 18 zapisa sa pojedinačnim URL-ovima, datumima i hash-evima od 2026-11-16. `data/review_candidates/studies_20_2026-11-16/import/studies_18_api_import_2026-11-16.json` kaže da su zapisi preuzeti pojedinačno i navodi `downloadedCount=18`; importerov `report.total=18` i `hasNextPage=false` odnose se na lokalni uvoz, ne na search odgovor. Poređenje NCT ID-jeva iz provenance fajla i raw snimka od 50 potvrđuje da se svih 18 zapisa sa datumom preuzimanja 2026-11-16 nalazi u snimku od 50. Dve preostale studije u 20-study skupu su iz ranijeg skupa i evidentirane su odvojeno u provenance fajlu kao preuzete 2026-11-15.

- Dokumentovani search URL i parametri: URL iz `data/raw/studies_20_api_provenance_2026-11-16.json` navodi navedene query/filter parametre. Nije sačuvan search response ili log koji nezavisno potvrđuje da je taj URL izvršen; provenance i import manifest kažu da je stvarno obavljeno 18 pojedinačnih preuzimanja.
- Search odgovor i njegov `totalCount`: `NIJE ZABELEŽENO`; search response nije sačuvan.
- Broj stranica search odgovora i njegovo `nextPageToken`: `NIJE ZABELEŽENO`.
- Da li je search paginacija nastavljena do kraja: `NIJE ZABELEŽENO`. `hasNextPage=false` u import izveštaju odnosi se na lokalni import ulaz, ne dokazuje stanje API search paginacije.
- Dokazani broj preuzetih dodatnih zapisa: 18 pojedinačnih API zapisa, potvrđeno pojedinačnim stavkama u `data/raw/studies_20_api_provenance_2026-11-16.json`, `downloadedCount=18` u import manifestu i 18 raw fajlova navedenih u provenance manifestu. Ovo nije dokaz da search je vratio ukupno 18 rezultata.
- Presek sa snimkom od 50: svih 18 NCT ID-jeva iz pojedinačnih zapisa preuzetih 2026-11-16 prisutno je u `studies_50_recruiting_2026-11-12.json`; dokaz se može ponoviti poređenjem identifikatora u ta dva fajla.
- Zašto su izabrani baš ti zapisi: `NIJE ZABELEŽENO` osim utvrđenog preseka sa ranijim snimkom. Nema evidentiranog dodatnog kriterijuma izbora.
- Korpus od 20 studija: namerno odabran demo uzorak (18 zapisa od 2026-11-16 plus dve ranije odobrene studije), a ne dokazano potpun API rezultat; vidi provenance/import manifeste.

## 2. Odluka o pravima korišćenja

Već evidentirano: ClinicalTrials.gov Terms and Conditions; atribucija izvora; mogu važiti prava trećih strana; posebna licenca se ne tvrdi.

- Pregledalac/odobrilac: `NIJE ZABELEŽENO` — u projektu nije nađen nezavisni pravni reviewer.
- Datum pregleda: `NIJE ZABELEŽENO`.
- Odluka za predviđenu upotrebu TrialMatch demo aplikacije: `PREGLED NIJE SPROVEDEN` (nema zasebnog nezavisnog pregleda prava korišćenja u dokumentaciji).
- Obuhvat: CT.gov uslovi su navedeni za sadržaj snimka od 50 i 20-study demo korpusa, ali pravni review obuhvata nije potvrđen.
- Uslovi/ograničenja dokumentovani u projektu: atribucija ClinicalTrials.gov, datum preuzimanja i opis izmena; mogu važiti prava trećih strana; ne tvrdi se posebna licenca.
- Osnova/reference: `https://clinicaltrials.gov/terms-conditions`; v2 API terms snapshot u `data/raw/studies_20_api_provenance_2026-11-16.json`, SHA-256 `66ba04e716eacfbd0601c980c442969da345a33403ec67c077e993a22710c74a`.

Napomena: dokumentovani uslovi korišćenja nisu formalno pravno odobrenje. Moguća prava trećih strana ostaju otvoreno ograničenje.

## 3. Reranker dokaz

Aktuelno stanje (2026-11-19): Cohere `rerank-v5.0-fast` je integrisan, a živi poziv je potvrđen smoke testom 2026-11-18. Kvalitet rerankera nije evaluiran; **RAG-T402 ostaje otvoren**. Ranije navedeni fake/hash offline rezultati su istorijski pilot podaci i ne menjaju ovu procenu kvaliteta.

Status kvaliteta: nije evaluiran. Živi smoke potvrđuje poziv/integraciju, ne kvalitet rangiranja. Ranija potvrda odobrenja izvornog sadržaja studija i kriterijuma ne menja ovaj status.

## 4. Kriterijumski gold skup (T323)

### Zahtev i trenutno stanje

F2-13 u `specs/003-phase-2-live-integration/spec.md` i CAP-05 u `docs/evidence-map.md` opisuju kriterijumsku evaluaciju. Odluka tima za demo fazu: nema eligibility-text parsera, a gold skup bez nezavisnih oznaka/predikcija bio bi kružan.

T322 metrička funkcija i CLI postoje u `eval/runner/gold-criteria.ts` i `eval/runner/gold-criteria-cli.ts`; dodati su testovi u `eval/runner/gold-criteria.test.ts`. Testovi proveravaju TP/FP/FN, pogrešnu vrednost kao FP+FN, null denominatore, `manual_review`, hash-eve, duplikate, verzije i reviewer/date validaciju. To potvrđuje metriku/evaluator ugovor, ne predstavlja izvršenu T323 evaluaciju. Postojeći `eval/gold-set.jsonl` je odvojeni sintetički profilni parser razvojni skup i ne zamenjuje ručno adjudikovanih ~30 kriterijuma.

T323 priprema se nalazi u `eval/gold-criteria/t323-v1/`: 30 uzoraka iz 300 kriterijuma, annotation proposals, odvojene provisional predictions i manifest sa source ID/hash-evima. Sampling je stratifikovan 10/10/10: strukturisani numerički, složeni `manual_review` i tekstualni `manual_review`. Predictions su projekcija postojećih odobrenih matcher pravila, a ne nezavisni eligibility parser output; nijedna metrika nad ovim fajlovima nije izračunata.

Status: **T323 je ODLOŽEN / VAN OBIMA DEMO FAZE, nije završen.** Postojeći T323 fajlovi ostaju pripremni materijal: proposal anotacije nisu ljudski potvrđen gold, a predictions su projekcija matcher pravila, ne rezultat parsera i ne nezavisni gold. Ne računaju se metrike.

### Odluka za demo fazu

- [x] T323 nije uslov za ovu demo fazu; zatvaramo je bez tvrdnje o parser kvalitetu.
- [ ] Izvršiti kriterijumsku parser evaluaciju u ovoj fazi.

Obrazloženje: sistem nema eligibility-text parser; pravila pregledava čovek, a `compile:rules` ih samo validira i kompajlira. Matcher testovi nad sintetičkim profilima ne mere parsiranje kriterijumskog teksta. Nezavisna adjudikacija bez parser predikcija ne bi bila validna evaluacija. T323 je zato odložen / van obima demo faze, nije označen kao završen. Njegovo buduće izvršenje zahteva parser i nezavisnu adjudikaciju.

## Odgovor

Obrazac je popunjen iz postojećih dokumenata i korisničkih potvrda. Vrednosti označene `NIJE ZABELEŽENO` ostaju eksplicitna poreklo/benchmark ograničenja; nisu predstavljene kao činjenice ili pravna nezavisna potvrda. Potvrda izvornog sadržaja studija/kriterijuma ne zatvara RAG benchmark odluku niti T323.
