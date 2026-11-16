# Podaci demonstracije

`fixtures/trials.json` sadrži isključivo sintetičke studije T-A, T-B i T-C za testove i DEMO režim. Nisu stvarne kliničke studije, a sintetički pragovi nisu medicinski saveti niti kliničke preporuke.

Poreklo, verzija, datum i ograničenja sintetičkog skupa navedeni su u [manifest.json](manifest.json). Taj manifest važi samo za fixture-e, ne za raw snimak.

## Dostavljeni raw snimak

`raw/studies_50_recruiting_2026-11-12.json` je lokalni fajl koji je korisnik dostavio; njegov sadržaj nije preuzet niti menjan u ovoj pripremi. U njemu je 50 zapisa sa 50 jedinstvenih NCT ID-jeva, svih 50 ima status `RECRUITING`, a top-level `nextPageToken` je prisutan. Polje tokena je zadržano u raw kopiji kao izvorni metapodatak; normalizovani TrialMatch podaci ne treba da ga tretiraju kao studiju.

Korisnik je potvrdio datum snimka kao 2026-11-12. Filesystem creation time je `2026-11-12T01:47:55.073688838+01:00` (Europe/Belgrade); ime fajla sadrži datum, ne tačan čas. SHA-256 raw fajla: `89893189d85eaf9ff0268748953d7d76ea4ecf10e27187d77e624eada942fd1a`.

Tačan endpoint/izvoz, upit i filteri, da li su povezane stranice preuzete, i uslovi korišćenja/licence nisu dokumentovani. Zato se ovaj fajl još ne predstavlja kao potpun ili odobren korpus. Pre uvoza i upotrebe, čovek potvrđuje te metapodatke i pregledava pravila studija. Sve pripremne komande moraju raditi lokalno nad eksplicitnim ulazom; ne preuzimaju niti skrejpuju podatke.

## ClinicalTrials.gov T2D skup od 20 studija (2026-11-16)

Osamnaest dodatnih studija je pojedinačno preuzeto sa zvaničnog [ClinicalTrials.gov API v2](https://clinicaltrials.gov/api/v2/) endpoint-a; dve ranije odobrene studije ostaju neizmenjene. [Manifest porekla](raw/studies_20_api_provenance_2026-11-16.json) evidentira svih 20 ID-jeva, zvanične URL-jeve, datum preuzimanja, status regrutacije, dostupne `statusVerifiedDate` i `lastUpdatePostDate`, SHA-256 i putanju sačuvanog zapisa. Originalni zapisi za 18 novih studija su `raw/study_<NCT>_2026-11-16.json`; njihova agregacija za postojeći importer je `raw/studies_18_ctg_api_records_2026-11-16.json`. Licenca se ne pretpostavlja: pripisuje se ClinicalTrials.gov, napominju se moguća prava trećih strana i ne tvrdi se zasebna licenca.

Novi import, split i pravila za ljudski rad su:

- `review_candidates/studies_20_2026-11-16/import/studies_18_api_import_2026-11-16.json`
- `review_candidates/studies_20_2026-11-16/review/studies_18_split_2026-11-16.json`
- `review_candidates/studies_20_2026-11-16/review/studies_18_rules_draft_2026-11-16.json`

Primenjene transformacije: originalni JSON je sačuvan zasebno po studiji; postojeći `data:prepare` normalizovao je naslove, uslove, sažetke, status i podržana strukturisana polja; `data:split` je sačuvao originalni eligibility tekst i doslovne citate uz postojeće `#unsplit-1`/`#inc-N`/`#exc-N` ID-jeve; `rules:draft` je napravio postojeći nacrt bez odobravanja. Nije menjana medicinska vrednost, izvorni tekst, prethodni odobreni paket, matcher, RAG algoritam ili indeks.

| NCT ID | Status | Tekstualni kriterijumi/pravila | Strukturisana auto-proverljiva polja | Obrada |
| --- | --- | ---: | ---: | --- |
| NCT05439226 | RECRUITING | 17, svi `manual_review` | 2 | pending human review |
| NCT05838287 | RECRUITING | 21, svi `manual_review` | 2 | pending human review |
| NCT06118931 | RECRUITING | 16, svi `manual_review` | 1 | pending human review |
| NCT06251323 | RECRUITING | 5, svi `manual_review` | 1 | pending human review; eligibility je na nivou klinike |
| NCT06271382 | RECRUITING | 11, svi `manual_review` | 1 | pending human review |
| NCT06296485 | RECRUITING | 14, svi `manual_review` | 1 | pending human review |
| NCT06449833 | RECRUITING | 16, svi `manual_review` | 2 | pending human review |
| NCT06852950 | RECRUITING | 18, svi `manual_review` | 1 | pending human review; mešovita T1D/T2D populacija |
| NCT06862739 | RECRUITING | 17, svi `manual_review` | 2 | pending human review |
| NCT06875193 | RECRUITING | 29, svi `manual_review` | 1 | pending human review |
| NCT06888050 | RECRUITING | 16, svi `manual_review` | 2 | pending human review |
| NCT07121504 | RECRUITING | 18, svi `manual_review` | 1 | pending human review |
| NCT07350967 | RECRUITING | 23, svi `manual_review` | 2 | pending human review |
| NCT07409714 | RECRUITING | 21 pravila: 17 `manual_review`, 4 `auto` | — | postojeći odobreni paket; neizmenjen |
| NCT07574138 | RECRUITING | 13, svi `manual_review` | 0 | pending human review |
| NCT07676773 | RECRUITING | 19, svi `manual_review` | 2 | pending human review |
| NCT07767331 | RECRUITING | 3, svi `manual_review` | 1 | pending human review |
| NCT07775846 | RECRUITING | 25, svi `manual_review` | 2 | pending human review |
| NCT07919236 | RECRUITING | 19, svi `manual_review` | 2 | pending human review |
| NCT07924436 | RECRUITING | 9 pravila: 6 `manual_review`, 3 `auto` | — | postojeći odobreni paket; neizmenjen |

Sažetak obrade: 20 jedinstvenih stvarnih studija, 18 novih i 2 već odobrene; 300 novih tekstualnih kriterijuma čeka ljudski pregled, a 26 dodatnih strukturisanih polja može se deterministički proveriti bez ljudskog odobrenja. `data:split` je obradio svih 18 bez tehničkih problema i bez `needs_manual_split`; citati su doslovni podnizovi originalnog eligibility teksta. Dva postojeća paketa sadrže ukupno 30 odobrenih pravila, od kojih je 7 `auto`, a 23 ostaju `manual_review`.

Postojeći `loadRagCorpus` validaciono učitava 20 jedinstvenih studija kada se eksplicitno koriste koreni `rule_sets/studies_2_approved_20261115_1539/` i `review_candidates/studies_20_2026-11-16/import/`. Novi kandidati nisu dodati podrazumevanom `data/trials/` ili `DATA_DIR` toku, pa DEMO i matcher ostaju nepromenjeni. Ovo je provera kompatibilnosti loader-a, ne izgrađen ili evaluiran RAG indeks. Postojeći RAG dokument-builder ne koristi originalni `eligibilityText`/`sources`, pa novih 300 izdvojenih kriterijuma još nema u passage pretrazi. Puna kriterijumska pretraga i matcher upotreba čekaju podršku za pending passages i ljudski pregled/odobrenje.

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

`rules:draft` pravi običan JSON niz `{ trialId, criteria }` za ručni rad. Kriterijumu dodaje stvarna polja `field: ""`, `operator: ""`, `value: null` i `unit: ""` samo kada ih već nema; postojeća matcher polja se čuvaju. Čovek popunjava potrebne vrednosti, proverava doslovne citate i sređuje pravila u domenski oblik pre `rules:review-template`. Taj korak čita običan JSON i pravi zaseban JSON review fajl sa hash-evima, početnim statusom `pending_review`, praznim `reviewer` poljem i važećim ISO `reviewedAt` vremenom kreiranja fajla. Pre odobravanja čovek mora da unese stvarnog pregledavaoca i zameni vreme kreiranja stvarnim vremenom pregleda. Posle svake izmene kriterijuma ponovo generišite review template jer `compile:rules` proverava rules hash. Nijedna pripremna komanda ne odobrava pravila.

Trenutni `data/trials/draft_2026-11-12.json` nosi oznaku `trialmatch-review-draft-v1`, ali ne prolazi strogi `ReviewDraftSchema`: deo `raw_extracted` kriterijuma sadrži dodatna matcher polja i `checkability` vrednosti koje ta šema ne dozvoljava. `rules:draft` ga odbija kao nevažeći ulaz; napravite novi `data:split` izlaz iz validiranog importa.

`compile:rules` zatim radi lokalno nad importom, ručno sređenim nacrtom i review izlazom:

```sh
pnpm compile:rules --input <import.json> --draft <rules-draft.json> --reviews <reviews.json> --output <novi-paket>
```

`compile:rules` čita običan JSON i strogo validira polja postojećim šemama. Samo `approved` pregled sa aktuelnim hash-evima, reviewer i stvarnim vremenom pregleda može ući u paket. Vreme kreiranja u `reviewedAt` treba zameniti stvarnim vremenom pregleda. Nepotvrđeno poreklo/licenca ostaje otvoreno i server odbija takav realni korpus. Ne prepisujte postojeće pakete.

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
