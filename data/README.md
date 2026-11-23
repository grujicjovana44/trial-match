# Podaci demonstracije

`fixtures/trials.json` sadrži isključivo sintetičke studije T-A, T-B i T-C za testove i DEMO režim. Nisu stvarne kliničke studije, a sintetički pragovi nisu medicinski saveti niti kliničke preporuke.

Poreklo, verzija, datum i ograničenja sintetičkog skupa navedeni su u [manifest.json](manifest.json). Taj manifest važi samo za fixture-e, ne za raw snimak.

## Dostavljeni raw snimak

`raw/studies_50_recruiting_2026-11-12.json` je lokalni fajl koji je korisnik dostavio; njegov sadržaj nije preuzet niti menjan u ovoj pripremi. U njemu je 50 zapisa sa 50 jedinstvenih NCT ID-jeva, svih 50 ima status `RECRUITING`, a top-level `nextPageToken` je prisutan. Polje tokena je zadržano u raw kopiji kao izvorni metapodatak; normalizovani TrialMatch podaci ne treba da ga tretiraju kao studiju.

Korisnik je potvrdio datum snimka kao 2026-11-12. Filesystem creation time je `2026-11-12T01:47:55.073688838+01:00` (Europe/Belgrade); ime fajla sadrži datum, ne tačan čas. SHA-256 raw fajla: `89893189d85eaf9ff0268748953d7d76ea4ecf10e27187d77e624eada942fd1a`.

Tačan endpoint/izvoz, upit i filteri, da li su povezane stranice preuzete, i uslovi korišćenja/licence nisu dokumentovani. Zato se ovaj fajl još ne predstavlja kao potpun ili odobren korpus. Pre uvoza i upotrebe, čovek potvrđuje te metapodatke i pregledava pravila studija. Sve pripremne komande moraju raditi lokalno nad eksplicitnim ulazom; ne preuzimaju niti skrejpuju podatke.

## ClinicalTrials.gov T2D skup od 20 studija (2026-11-16)

Osamnaest dodatnih studija je pojedinačno preuzeto sa zvaničnog [ClinicalTrials.gov API v2](https://clinicaltrials.gov/api/v2/) endpoint-a 2026-11-16; dve ranije odobrene studije ostaju neizmenjene. [Manifest porekla](raw/studies_20_api_provenance_2026-11-16.json) evidentira svih 20 ID-jeva, zvanične URL-jeve, datum preuzimanja, status regrutacije, dostupne `statusVerifiedDate` i `lastUpdatePostDate`, SHA-256 i putanju sačuvanog zapisa. Originalni zapisi za 18 novih studija su `raw/study_<NCT>_2026-11-16.json`; njihova agregacija za postojeći importer je `raw/studies_18_ctg_api_records_2026-11-16.json`. Pravni pregled nije urađen; uslove korišćenja treba proveriti pre javnog objavljivanja. Ovaj dokument ne utvrđuje niti tvrdi licencu.

Novi import, split i pravila za ljudski rad su:

- `review_candidates/studies_20_2026-11-16/import/studies_18_api_import_2026-11-16.json`
- `review_candidates/studies_20_2026-11-16/review/studies_18_split_2026-11-16.json`
- `review_candidates/studies_20_2026-11-16/review/studies_18_rules_draft_2026-11-16.json`

Primenjene transformacije: originalni JSON je sačuvan zasebno po studiji; postojeći `data:prepare` normalizovao je naslove, uslove, sažetke, status i podržana strukturisana polja; `data:split` je sačuvao originalni eligibility tekst i doslovne citate uz postojeće `#unsplit-1`/`#inc-N`/`#exc-N` ID-jeve; `rules:draft` je napravio postojeći nacrt bez odobravanja. Nije menjana medicinska vrednost, izvorni tekst, prethodni odobreni paket, matcher, RAG algoritam ili indeks.

Napomena za tabelu: ona prikazuje stanje pre odobrenja matcher drafta 2026-11-18. Statusi „pending human review“ odnosili su se na semantičko odobrenje strukturisanih pravila, ne na vernost izvornog teksta. Novo stanje je u odeljku „Potvrda sadržaja i matcher draft“ ispod.

| NCT ID      | Status     |           Tekstualni kriterijumi/pravila | Strukturisana auto-proverljiva polja | Obrada                                                                        |
| ----------- | ---------- | ---------------------------------------: | -----------------------------------: | ----------------------------------------------------------------------------- |
| NCT05439226 | RECRUITING |                  17, svi `manual_review` |                                    2 | izvorni tekst ručno upoređen sa originalnom studijom; pravila `manual_review` |
| NCT05838287 | RECRUITING |                  21, svi `manual_review` |                                    2 | pending human review                                                          |
| NCT06118931 | RECRUITING |                  16, svi `manual_review` |                                    1 | pending human review                                                          |
| NCT06251323 | RECRUITING |                   5, svi `manual_review` |                                    1 | pending human review; eligibility je na nivou klinike                         |
| NCT06271382 | RECRUITING |                  11, svi `manual_review` |                                    1 | pending human review                                                          |
| NCT06296485 | RECRUITING |                  14, svi `manual_review` |                                    1 | pending human review                                                          |
| NCT06449833 | RECRUITING |                  16, svi `manual_review` |                                    2 | pending human review                                                          |
| NCT06852950 | RECRUITING |                  18, svi `manual_review` |                                    1 | pending human review; mešovita T1D/T2D populacija                             |
| NCT06862739 | RECRUITING |                  17, svi `manual_review` |                                    2 | pending human review                                                          |
| NCT06875193 | RECRUITING |                  29, svi `manual_review` |                                    1 | pending human review                                                          |
| NCT06888050 | RECRUITING |                  16, svi `manual_review` |                                    2 | pending human review                                                          |
| NCT07121504 | RECRUITING |                  18, svi `manual_review` |                                    1 | pending human review                                                          |
| NCT07350967 | RECRUITING |                  23, svi `manual_review` |                                    2 | pending human review                                                          |
| NCT07409714 | RECRUITING | 21 pravila: 17 `manual_review`, 4 `auto` |                                    — | postojeći odobreni paket; neizmenjen                                          |
| NCT07574138 | RECRUITING |                  13, svi `manual_review` |                                    0 | pending human review                                                          |
| NCT07676773 | RECRUITING |                  19, svi `manual_review` |                                    2 | pending human review                                                          |
| NCT07767331 | RECRUITING |                   3, svi `manual_review` |                                    1 | pending human review                                                          |
| NCT07775846 | RECRUITING |                  25, svi `manual_review` |                                    2 | pending human review                                                          |
| NCT07919236 | RECRUITING |                  19, svi `manual_review` |                                    2 | pending human review                                                          |
| NCT07924436 | RECRUITING |   9 pravila: 6 `manual_review`, 3 `auto` |                                    — | postojeći odobreni paket; neizmenjen                                          |

Sažetak obrade: 20 jedinstvenih stvarnih studija, 18 novih i 2 ranije odobrene. Vlasnik projekta je 2026-11-17 potvrdio da je Jelena ručno uporedila stvarne studije i kriterijume sa originalnim studijama; CSV potvrda izvornog teksta vodi se odvojeno od matcher odobrenja. Za dve ranije odobrene studije postoje i hash-povezani `review-report.json` zapisi. Jovana je 2026-11-19 odobrila prethodnu verziju sa 10 strukturisanih pravila. Jelena je pripremila i integrisala 17 novih auto mapiranja u commitu `74a9b2d`; formalni approval zapis za njih navodi Jovanu kao `reviewer`. Aktivni paket 18 studija sada sadrži 27 `auto` i 273 `manual_review` kriterijuma; aktuelni review hash odgovara `dataVersion` za svih 18 studija. `data:split` je obradio svih 18 bez tehničkih problema i bez `needs_manual_split`; citati su doslovni podnizovi originalnog eligibility teksta.

## Potvrda sadržaja i matcher pravila (2026-11-19)

CSV potvrde izvornog sadržaja i strukturisani draft sačuvani su u `review_candidates/studies_20_2026-11-16/review/`. CSV-ova potvrda od strane Jelene odnosi se na vernost izvornog sadržaja i ne odobrava matcher polja. Jovana je 2026-11-19 potvrdila 10 auto pravila prethodne verzije. Od 18 naknadno razmatranih kriterijuma, 17 je odobreno kao `auto`, a `NCT07775846#inc-5` je zadržan kao `manual_review` zbog nepotvrđene verzije CKD-EPI formule. Novi hash-povezani pregled je datiran 2026-11-23 i obuhvata aktuelni paket od 18 studija sa 27 `auto` i 273 `manual_review` kriterijuma.

Uslove korišćenja ClinicalTrials.gov treba proveriti pre javnog objavljivanja; tim nije obavio pravni pregled i ovde se ne donosi zaključak o licenci. Za 18 dodatnih zapisa poznati su search query, status filter i `pageSize=100`, ali nisu potvrđeni ukupan broj rezultata, stranice/token i izbor kohorte. Za dostavljeni snimak od 50 zapisa query/endpoint takođe čekaju potvrdu. Za primer, [zvanični NCT07409714 zapis](https://clinicaltrials.gov/study/NCT07409714) je primarni izvor koji treba koristiti pri proveri ažurnosti. Originalni tekst koji je Jelena proverila nije samim tim odobren matcher rule; proces per-kriterijumskog odobravanja je opisan u `eval/rag/proposal-review-guide.md`.

Prema korisničkoj dopuni od 2026-11-18, svih 18 pojedinačno preuzetih studija nalaze se i u ranijem snimku od 50. Za taj snimak je poznat endpoint `https://clinicaltrials.gov/api/v2/studies`, ali query i originalni filteri nisu sačuvani; `nextPageToken` postoji, a preuzimanje sledećih stranica nije potvrđeno. Za 18-study search URL beleži `query.cond=type 2 diabetes`, `filter.overallStatus=RECRUITING,NOT_YET_RECRUITING` i `pageSize=100`; manifest beleži 18 pojedinačnih API poziva. Nisu zabeleženi ukupan broj search rezultata, broj stranica ni pravilo izbora ovih 18. Zato je 20-study korpus namerno odabran demo uzorak, ne potpuni rezultat upita. Pravni pregled nije urađen; uslove korišćenja treba proveriti pre javnog objavljivanja, a ovde se ne tvrdi ništa o licenci.

Za eksplicitni demo izbor `DATASET_PROFILE=clinicaltrials-20`, `loadRagCorpus` spaja dva ranije odobrena zapisa sa paketom od 18 studija. Novi paket sadrži 27 odobrenih `auto` i 273 `manual_review` kriterijuma. Loader validira tačno 20 jedinstvenih NCT zapisa; RAG builder pravi 20 study dokumenata i 330 passage dokumenata. Regression test proverava broj studija/kriterijuma, stabilne ID-jeve i retrieval dostupnost. Demo koristi lokalni lexical MiniSearch; nema plaćenih embedding poziva niti tvrdnje da postoji persistentni vektorski indeks. Fixture režim ostaje podrazumevan. Preostala 273 ručna kriterijuma vraćaju `unknown` uz citate. Odobrenje mapiranja pravila nije potvrda podobnosti pacijenta.

Jelena je odvojeno potvrdila izvorni sadržaj u CSV-u, zatim pripremila i integrisala izmenu paketa sa 10/290 na 27/273 kriterijuma u commitu `74a9b2d`. Formalni review zapis navodi Jovanu kao `reviewer` za prethodnih 10 pravila i odgovarajuća nova mapiranja, uključujući granice numeričkih intervala; ne beleži odobrenje svih 300 kriterijuma za automatsku proveru. Sadašnji paket `rule_sets/studies_18_approved_REVIEWED/` ima 27 `auto` i 273 `manual_review` kriterijuma, a `review-report.json` odgovara aktuelnim hash-evima svih 18 studija. Novi pregled i draft su u `review_candidates/studies_20_2026-11-16/review/`, a nepromenljivi kompajlirani izlaz u `rule_sets/studies_18_approved_20261123_JOVANA/`. Jovanin istorijski review zapis iz 2026-11-19 sačuvan je i kao `rule_sets/studies_18_approved_REVIEWED/review-report_2026-11-19.json`. Jelenin raniji review i `PENDING` fajl ostaju sačuvani. Potvrda izvornog sadržaja nije potvrda mapiranja matcher polja. Za `NCT07350967#inc-2` projektna pretpostavka je da trenutna starost predstavlja starost pri pristanku; to nije verifikovan istorijski podatak.

## Faza 2: lokalni uvoz i ljudski pregled

`pnpm data:prepare data/raw/studies_50_recruiting_2026-11-12.json /tmp/trialmatch-003-import.json` validira CTG v2 oblik bez mrežnog pristupa. Izlaz sadrži normalizovane studije, izvorne odlomke, hash-eve, `needsManualSplit`, status stranice i problematične redove. Svaki kriterijum iz originalnog teksta ostaje `manual_review` dok čovek ne razdvoji i pregleda kriterijume. Uvoz ne dopunjava endpoint, query, paginaciju ni uslove korišćenja.

Odvojeni tok za pripremu kriterijuma iz originalnog eligibility teksta ostaje dostupan:

```sh
pnpm data:prepare <lokalni-ulaz> <import.json>
pnpm data:split --input <import.json> --output <split.json>
pnpm rules:draft --input <split.json> --output <rules-draft.json>
pnpm rules:review-template --input <import.json> --draft <rules-draft.json> --output <reviews.json>
```

`data:split` je preporučeni izvor izdvojenih tekstualnih kriterijuma. Direktan ulaz iz `data:prepare` prenosi samo kriterijume koji već postoje u importu; ne deli i ne tumači sačuvani originalni tekst.

Ista dva koraka `data:split` i `rules:draft` mogu se pokrenuti jednom komandom:

```sh
pnpm data:split-draft --input <raw-ctg-ili-import.json> --split-output <novi-split.json> --output <novi-rules-draft.json> [--limit N] [--selection first|random] [--seed S]
```

Komanda čuva oba odvojena izlaza: `--split-output` je `trialmatch-review-draft-v1`, a `--output` je nacrt pravila. Opcije izbora i validacija su iste kao za `data:split`; `--selection random` zahteva seed. Odbijaju se neispravni argumenti, ista putanja za oba izlaza i postojeće izlazne putanje. Odvojene komande ostaju dostupne.

`rules:draft` pravi običan JSON niz `{ trialId, criteria }` za ručni rad. Kriterijumu dodaje stvarna polja `field: ""`, `operator: ""`, `value: null` i `unit: ""` samo kada ih već nema; postojeća matcher polja se čuvaju. Čovek popunjava potrebne vrednosti, proverava doslovne citate i sređuje pravila u domenski oblik pre `rules:review-template`. Taj korak čita običan JSON i pravi zaseban JSON review fajl sa hash-evima, početnim statusom `pending_review`, praznim `reviewer` poljem i važećim ISO `reviewedAt` vremenom kreiranja fajla. Pre odobravanja čovek mora da unese stvarnog pregledavaoca i zameni vreme kreiranja stvarnim datumom (`YYYY-MM-DD`) ili datumom i vremenom pregleda. Posle svake izmene kriterijuma ponovo generišite review template jer `compile:rules` proverava rules hash. Nijedna pripremna komanda ne odobrava pravila.

Trenutni `data/trials/draft_2026-11-12.json` nosi oznaku `trialmatch-review-draft-v1`, ali ne prolazi strogi `ReviewDraftSchema`: deo `raw_extracted` kriterijuma sadrži dodatna matcher polja i `checkability` vrednosti koje ta šema ne dozvoljava. `rules:draft` ga odbija kao nevažeći ulaz; napravite novi `data:split` izlaz iz validiranog importa.

`compile:rules` zatim radi lokalno nad importom, ručno sređenim nacrtom i review izlazom:

```sh
pnpm compile:rules --input <import.json> --draft <rules-draft.json> --reviews <reviews.json> --output <novi-paket>
```

`compile:rules` čita običan JSON i strogo validira polja postojećim šemama. Samo `approved` pregled sa aktuelnim hash-evima, reviewer-om i stvarnim datumom ili datumom/vremenom pregleda može ući u paket. Vreme kreiranja u `reviewedAt` treba zameniti stvarnim datumom pregleda. Poreklo i statusi pregleda opisuju se odvojeno od pravnog pregleda; tim nije uradio pravni pregled, a uslove korišćenja treba proveriti pre javnog objavljivanja. Ne prepisujte postojeće pakete.

## Nacrt za ručni pregled teksta kriterijuma

`pnpm data:split` pravi lokalni `trialmatch-review-draft-v1` iz raw CTG v2 fajla ili postojećeg `trialmatch-import-v2` uvoza. `data:split-draft` poziva isti split i zatim postojeći `rules:draft`; obe komande rade offline, koriste iste Zod validacije i ne pozivaju mrežu, LLM ni API.

```sh
pnpm build
pnpm data:split --input data/raw/studies_50_recruiting_2026-11-12.json --output data/trials/review-draft.json --limit 10
pnpm data:split --input data/raw/studies_50_recruiting_2026-11-12.json --output data/trials/random-draft.json --limit 10 --selection random --seed 42
pnpm data:split-draft --input data/raw/studies_50_recruiting_2026-11-12.json --split-output data/trials/review-draft.json --output data/trials/rules-draft.json --limit 10
```

Bez `--limit` obrađuju se sve dostupne validirane studije. `--selection first` je podrazumevan i čuva redosled ulaza; `random` zahteva `--seed` i ponovljivo bira/uređuje iste studije za isti ulaz, limit i seed. Izveštaj razlikuje ukupan broj zapisa, broj validno dostupnih studija, odabrane i obrađene NCT ID-jeve, greške uvoza, nepodeljene studije i `nextPageToken`.

Izlaz nosi metapodatke bliske `TrialSchema`, originalni `eligibilityText`, jedan proverljiv izvor sa SHA-256 i izdvojene kriterijume sa stabilnim `#inc-N`/`#exc-N` ID-jevima. Izvor koristi postojeći importer ID `<NCT>#unsplit-1`, pa se citat može proveriti prema izlazu `data:prepare`. Citati su doslovni podnizovi izvornog teksta. Svaki izdvojeni kriterijum je `manual_review` sa poreklom `raw_extracted`; ne dodeljuju mu se matcher polja ili vrednosti. Svaki zapis ima `reviewStatus: pending_review`. Jasni engleski naslovi Inclusion/Exclusion i eksplicitne numerisane/označene stavke su potrebni za automatsku podelu. Uvodni tekst, neprepoznat podnaslov ili nedostatak jasnih oznaka čuva original i daje `needs_manual_split` sa razlogom; ljudski pregled je i dalje obavezan i kada je status podele `complete`.

Skripta odbija postojeći izlaz, ulaznu putanju kao izlaz, putanje unutar `data/raw/` i `data/fixtures/`, duplikate koji bi napravili nejasan rezultat, nevažeći limit i nasumičan izbor bez seed-a. Nacrt nije fixture, odobreni skup niti paket za matcher; `compile:rules` i postojeća approval provera ostaju odvojeni koraci. Ručni tok je `data:prepare` (ili raw ulaz), zatim `data:split` + `rules:draft` ili objedinjeni `data:split-draft`, ručno strukturiranje kriterijuma, `rules:review-template`, pa `compile:rules`. Samo `compile:rules` prihvata stvarno `approved` stanje uz non-empty `reviewer`, stvarni `reviewedAt` i aktuelne source/rules hash-eve; postojeći uslovi odobravanja se ne menjaju.
