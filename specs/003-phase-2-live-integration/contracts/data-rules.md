# Lokalna priprema i ljudski pregled pravila

Potvrđeno Q4: samo lokalno, bez modelskog generisanja. `compile:rules` je nova planirana komanda, danas ne postoji. Ne praviti compile_criteria modelski prompt ni mrežnog generatora u 003; to je izričito suženje opšteg predloga iz brief-a/prompta. Ekstrakcija profila i objašnjenje ostaju stvarni model.

## data:prepare

Postojeća komanda prima pozicione ulaz/izlaz putanje i danas validira TrialSchema[]. Planirana nadogradnja zadržava eksplicitne lokalne putanje, prepoznaje režim normalizovanih fixture-a odvojeno od raw snimka i validira format pre upisa. Nije dozvoljeno tiho prepoznati stvarni raw kao fixture. Čovek je dostavio `data/raw/studies_50_recruiting_2026-11-12.json`: statički pregled pokazuje 50 zapisa, 50 jedinstvenih NCT ID-jeva i `nextPageToken`; datum/vreme je korisnik potvrdio i upisan u ime. Tačan endpoint, upit, status drugih stranica i uslovi korišćenja još nisu dokumentovani. T317 proverava stvarnu strukturu kroz importer; čovek potvrđuje preostale metapodatke u T319. Sintetički v2 uzorak ostaje nezavisan test fixture.

Izlazi: normalizovani zapisi, izvorni odlomci, manifest nacrt i import report (ulazni hash, ukupan broj, prihvaćeni/problematični ID-jevi, lokacija i razlog greške, needs_manual_split). Originalni tekst i sve kriterijume sačuvati; nema tihog odbacivanja. Neprepoznato kritično polje je greška zapisa; nepoznate raw metapodatke evidentirati, ne prosleđivati u stroge domenske šeme. Izlaz objaviti atomski tek po validaciji; postojeći izlaz ne prepisivati bez izričite lokalne naredbe čoveka.

Starost/pol iz strukturisanih polja pretvoriti deterministički u pravila, sa referencom originalne vrednosti i normalizacije jedinice starosti. Odsutan minimum/maksimum ne izmišlja se. Pouzdani odlomci dobijaju stabilne inc/exc ID-jeve; nejasna podela zahteva ručni split. Različite verzije teksta pod istim ID imaju novi hash. Tačan status/faze preneti, bez pretpostavljene enumeracije ili pretvaranja nepoznatog u „RECRUITING“.

## compile:rules — planirani CLI

Budući oblik: `pnpm compile:rules --input <normalizovani-json> --draft <rucna-pravila-json> --reviews <pregledi-json> --output <novi-paket-dir>`. Svi argumenti su obavezni lokalni fajlovi; CLI nema API key, provider ili network flag. Postojeći output odbija se. Exit 0 samo ako je paket validan; neispravan ulaz/izvor/review daje nenulti izlaz i izveštaj bez publikovanja paketa.

Čovek piše/pregleda nacrt. Komanda validira strict šeme, sourceId/trialId pripadnost, tačan sourceQuote, jedinice/operators, review sourceHash/rulesHash i potpunost kriterijuma. Samo approved studije ulaze u objavljeni korpus; ostale ostaju u report-u sa razlogom. Nepodržani kriterijumi su manual_review/unknown, ne brišu se. Approved status ne nastaje automatski na osnovu prolaska validacije. Promena izvora/pravila invalidira odobrenje; reviewer/date nisu agentove izmišljene vrednosti.

Manifest razdvaja 50–100 preuzetih od 15–20 uključenih; sadrži datum/upit/poreklo/transformacije/ograničenja i status pregleda uslova korišćenja. Nepotvrđeni uslovi ostaju TODO. Fixture evaluacija koristi svoj manifest i ne učitava ovaj korpus.

Provere: nevalidan raw, duplikati, izgubljeni kriterijum, nejasan split, više faza, missing status, nepoznata jedinica/operator, izvor koji ne postoji, izmenjen hash posle odobrenja, nepregledana studija u matcher-u, deterministički ponovljen rezultat, odbijanje prepisivanja i mrežnog parametra. Zavisnosti: T303 šeme, T317 importer, T318 compile; T319/T320 ljudski metapodaci i pregled, T321 manifest/import evidencija.
