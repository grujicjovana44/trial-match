# Jelena — RAG predlozi za ručni pregled

Ovaj fajl beleži istorijske odluke za `rag-corpus-v0-dev` sa pet studija. Te oznake ostaju vezane za taj snapshot i ne predstavljaju adjudikaciju aktivnog `clinicaltrials-20` skupa. Jovana vodi nove retrieval relevance oznake; predlog osam novih slučajeva bez unapred popunjenih oznaka je u [review planu](./review-plan-jovana-v1.md). Jelenina potvrda izvornog sadržaja u CSV-u ostaje odvojena od retrieval oznaka i matcher odobrenja.

Status: odluke su upisane (vidi tabelu), ali **ovaj dokument i dalje nije gold skup**. Odluke postaju gold tek kada se upišu u novu verzionisanu adjudikaciju; `rag-retrieval-v2` se ne menja. Do tada ostaju isključene iz zvaničnih metrika.

Dozvoljene odluke: APPROVE, CORRECT, REJECT, UNCERTAIN.

## Zajednički postupak

Za svaki ranking slučaj proveriti relevantnost studije i svakog passage-a odvojeno, pretražiti ceo navedeni snapshot (ne samo rezultate koje je vratio sistem), otvoriti originalni ClinicalTrials.gov zapis i upisati potvrđene/corrected/rejected ID-jeve. Proveriti da citat odgovara izvoru; ne zaključivati nepostojeće podatke, npr. eGFR iz kreatinina. Za svaki slučaj upisati reviewer/inicijale, datum, razlog i URL. Ako je nalaz neizvestan, ostaviti ga nerešenim. Sačuvati odluku kao novu verzionisanu adjudikaciju; ne menjati `rag-retrieval-v2`.

Review podaci i predlozi: [`retrieval-proposals-v1.json`](./retrieval-proposals-v1.json). Pinned osnova: `rag-retrieval-v2` / `rag-corpus-v0-dev`; za P003 to znači samo pet studija iz tog snapshot-a, ne novi aktivni korpus od 20 studija. Predlozi P001–P004 nisu gold dok se ne evidentiraju u novoj verziji.

## Provera identiteta korpusa

Korpus `rag-corpus-v0-dev` čine dva fajla. SHA-256 vrednosti iz `baseline-v2.json` poklopljene su sa fajlovima na disku (uz normalizaciju završetaka redova CRLF→LF; sirovi `Get-FileHash` se razlikuje samo zbog završetaka redova), a `git status` ne prikazuje izmene u njima.

| Fajl | SHA-256 (baseline-v2 = izračunato) |
|---|---|
| `data/fixtures/trials.json` | `f368d13bff16dc5ad69636513281ed18ea8601978a83d6c3c000dd4b0cde4950` |
| `data/rule_sets/studies_2_approved_20261115_1539/trials.json` | `4b39b15a92b3ce20591c70ed54bb60e81a453c10b2c3a5dd2052b00ec3c8a2e5` |

Odluke ispod odnose se na ovaj snapshot.

## Slučajevi za odluku

| Case | Upit / predlog (nepotvrđeno) | Provere koje Jelena treba da obavi | Odluka / beleške |
|---|---|---|---|
| RAG-P001 | Srpski/ćirilični upit za T2D i gojaznost. Predložena studija `NCT07924436`; passage-i `NCT07924436#inc-3`, `#inc-5`. | U celom petostudijskom snapshot-u proveriti studiju i svaki passage prema RAG-001 pravilu. Otvoriti [ClinicalTrials.gov zapis](https://clinicaltrials.gov/study/NCT07924436) i potvrditi da citati pokrivaju upit. | **Odluka: APPROVE (content relevance)**<br>Reviewer: Jelena<br>Datum: 2026-11-18<br>Razlog/ispravke: `#inc-3` potvrđuje BMI ≥30 kg/m², `#inc-5` potvrđuje T2D grupu; zajedno pokrivaju oba pojma iz upita. Bez ispravki.<br>URL: https://clinicaltrials.gov/study/NCT07924436 |
| RAG-P002 | Profil: 20 godina, T2D, HbA1c 9.8%, kreatinin 2.1 mg/dL, renal function. Predložena `NCT07409714`; `#exc-4`, `#exc-5`. | Proveriti usklađenost numeričkog eGFR kriterijuma i albuminurije sa originalom i pravilom RAG-002. Kreatinin nije eGFR i sam po sebi ne dokazuje prag. Pregledati [ClinicalTrials.gov zapis](https://clinicaltrials.gov/study/NCT07409714). | **Odluka: APPROVE (content relevance)**<br>Reviewer: Jelena<br>Datum: 2026-11-18<br>Razlog/ispravke: `#exc-4` (eGFR <30) i `#exc-5` (odnos albumin/kreatinin >300 mg/g) odgovaraju originalu. Serum kreatinin pacijenta nije direktna potvrda ispunjenosti ovih kriterijuma. Bez ispravki.<br>URL: https://clinicaltrials.gov/study/NCT07409714 |
Odluka: APPROVE (negativni slučaj, samo petostudijski snapshot `rag-corpus-v0-dev`)
Reviewer: Jelena. Datum: 2026-11-18. Provereni study/passage ID-jevi: `NCT07924436`, `NCT07409714`, `T-A`, `T-B`, `T-C`. Razlog/ispravke: pregledano svih pet studija; nijedna ne obuhvata celijakiju prema sadržaju. Prazne `relevantTrialIds` i `relevantPassageIds` važe isključivo za ovaj snapshot, ne za aktivni korpus od 20 studija.
| RAG-P004 | Nepotpuni profil sa samo uzrastom 22; behavior-only, ne ulazi u ranking metrike. | Potvrditi stabilan fallback bez izvedene dijagnoze ili age-based filtriranja; kriterijumski status treba ostati `unknown` kada nema podataka. | **Odluka: APPROVE (behavior)**<br>Reviewer: Jelena<br>Datum: 2026-11-18<br>Razlog/ispravke: ručno izvršeno u aplikaciji sa unosom „22 godine.“ (aktivni real-20 profil, ne `rag-corpus-v0-dev`). Prepoznata samo starost; dijagnoza nije izvedena; sve studije prikazane bez filtriranja po uzrastu (prikazano 10 studija); svi kriterijumi `unknown` (0 ispunjeno). Isto ponašanje kao potvrđeni RAG-004.<br>Napomena: limit od 10 prikazanih studija treba potvrditi kao namerno podešen. |

Za P003, lista pet studija mora se prepisati iz tačnog `rag-corpus-v0-dev` manifesta/snapshot-a pri pregledu; nemoj je zameniti aktivnim korpusom od 20. Ako se želi negativna procena nad 20 studija, to je zaseban novi benchmark slučaj sa zasebnim snapshot ID/hash-om i zasebnom ljudskom adjudikacijom.

## Razdvajanje sadržaja od matcher pravila

Jelenina ranija potvrda poklapanja sadržaja studija sa originalnim zapisima dokumentuje validaciju izvornog sadržaja za dva odobrena zapisa (`NCT07924436`, `NCT07409714`); ona sama po sebi ne odobrava nove RAG gold oznake niti 300 novostrukturisanih matcher kriterijuma. Za kriterijum koji se koristi u automatizovanom poređenju treba zasebno pregledati tačan kriterijum ID, izvorni citat, operator, vrednost/jedinicu, polarity/populaciju, source hash i rules hash. Postojeći approval/compile tok odobrava kompletan skup pravila studije, ne nezavisne kriterijume: koristiti draft sa samo eksplicitno prihvaćenim pravilima, zabeležiti reviewer/date i hash, a sve ostalo ostaviti `manual_review`/`unknown`. Ne grupno odobravati 300 kriterijuma.
