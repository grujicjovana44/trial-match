# Lokalna priprema i ljudski pregled pravila

Q4 je potvrđen: samo lokalno, bez modelskog generisanja kriterijuma. Importer, `data:split`, priprema `rules:draft`, review-template i `compile:rules` CLI su implementirani. Ekstrakcija profila i pokušaj objašnjenja koriste izabrani stvarni model; presude i izvedene vrednosti ostaju deterministički kod.

## `data:prepare`

Komanda prima eksplicitne lokalne ulaznu i novu izlaznu putanju. Normalizovani `Trial[]` fixture-i se validiraju; CTG v2 `studies` snapshot dobija strogi manifest nacrt, normalizovane studije, izvorne odlomke, hash-eve, row problems, stabilne NCT/source ID-jeve, nepoznate metadata putanje i `hasNextPage`. Izlaz se piše atomskim hard-link korakom i odbija postojeću putanju.

Za raw snapshot originalni eligibility tekst ostaje u source zapisu `unsplit` i ne ulazi u matcher. Podržane strukturisane godine i pol mogu postati pravila bez modela; nepodržana vrednost je `manual_review`. Datum snapshot-a je 2026-11-12; endpoint/izvoz, query/filteri, paginacija i licenca ostaju nepotvrđeni. Lokalna provera ove sesije je prihvatila 50 redova bez row problems; svih 50 zahteva ljudski split, a `nextPageToken` je prisutan. Ovo nije odobren korpus.

Nepoznati metadata ključevi se beleže po putanji i ne prenose u domen objekat. Nepravilni zapisi se prijavljuju po index-u; dupli NCT ID se prijavljuje i ne uključuje. Nema mrežnog preuzimanja.

## `data:split` — AC-14

Komanda zahteva `--input` i novi `--output`; prihvata raw CTG v2 ili strogo validiran `trialmatch-import-v2`. Opcioni `--limit` je pozitivan bezbedan ceo broj. `--selection` je `first` (podrazumevano) ili `random`; random zahteva ne-prazan `--seed`. Izbor random metodom koristi seed i determinističko mešanje; kod limita većeg od broja validnih studija obrađuju se sve dostupne studije. U raw režimu postojeći `prepareRaw` obrađuje ceo snimak, pa se i problemi redova koji nisu u izabranom podskupu prenose u izveštaj. Duplikat NCT ID-ja odbija izlaz.

Izlaz je zaseban `trialmatch-review-draft-v1`, ne `Trial[]` fixture ni rezultat `compile:rules`. Studije nose TrialSchema metapodatke, originalni `eligibilityText`, `dataVersion`, izvor celog eligibility teksta i kriterijume sa `checkability: manual_review`, `origin: raw_extracted`, stabilnim `<NCT>#inc-N`/`<NCT>#exc-N` ID-jem i doslovnim `sourceQuote`. Izvorni `sourceId` je postojeći `<NCT>#unsplit-1`, pa se citati mogu potvrditi nad izvozom `data:prepare`. Status je `pending_review`; nijedan matcher `field`/`operator`/`value` se ne generiše. `splitStatus` je `complete` samo ako su svi neprazni delovi teksta pod jasnim naslovom i jasnim numerisanim/označenim stavkama. Uvod, nepoznat podnaslov, odsustvo stavki ili teksta van odeljaka označava `needs_manual_split`; izvorni tekst ostaje netaknut, a razlog ulazi u izveštaj.

Oblik pregleda prati ID-jeve iz postojećeg importera i SHA-256 proveru izvora koju koriste `rules:review-template` i `compile:rules`. Izlaz se stvara bez prepisivanja; putanje unutar `data/raw/` i `data/fixtures/` nisu dozvoljene. Skripta je offline i ne poziva model, mrežu ni API. Primeri i ograničenja su u [data/README.md](../../../data/README.md).

Odvojena komanda `data:split` ostaje podržana. `data:split-draft` je objedinjena alternativa koja poziva postojeći split, pa zatim `rules:draft`, sa istim izborom, validacijom, izveštavanjem i odbijanjem prepisivanja:

```sh
pnpm data:split-draft --input <raw-ctg-ili-import.json> --split-output <novi-split.json> --output <novi-rules-draft.json> [--limit N] [--selection first|random] [--seed S]
```

Komanda upisuje oba fajla na različite nove putanje: `--split-output` sadrži `trialmatch-review-draft-v1`, a `--output` sadrži običan JSON niz `{ trialId, criteria }` iz `rules:draft`. `--input`, `--split-output` i `--output` su obavezni; ostali argumenti imaju ista pravila kao `data:split`. Odbijaju se duplirani/nepoznati/neispravni argumenti, ista izlazna putanja i postojeći izlazi. `data:split` i `rules:draft` i dalje mogu zasebno da se pokrenu.

## `rules:draft` — AC-15

Komanda pretvara kriterijume iz jednog od dva eksplicitno podržana formata u niz `{ trialId, criteria }` zapisa koji očekuje `rules:review-template`:

```sh
pnpm rules:draft --input <data-prepare-ili-data-split.json> --output <novi-rules-draft.json>
```

Format se bira po `format` polju i validira runtime Zod šemom `ImportSchema` ili `ReviewDraftSchema`. Preporučeni izvor kriterijuma izdvojenih iz originalnog eligibility teksta je `data:split` (`trialmatch-review-draft-v1`), jer `data:prepare` čuva taj tekst kao nerazdvojen izvor. Direktan `trialmatch-import-v2` ulaz prenosi samo kriterijume koji već postoje u uvozu; komanda ne deli niti tumači tekst.

Izlaz čuva redosled studija i kriterijuma i njihova polja, proverava jedinstvenost `trialId`, pripadnost kriterijuma studiji, `sourceId` i doslovni podniz `sourceQuote` kada postoje izvori. Studije bez kriterijuma se izostavljaju uz broj i ID-jeve u izveštaju; ako nijedna nema kriterijume, komanda ne pravi izlaz i prijavljuje grešku. JSON je deterministički formatiran, izlazni direktorijumi se prave po potrebi, postojeći izlaz se odbija. Kriterijumima bez matcher polja dodaju se stvarne vrednosti `field: ""`, `operator: ""`, `value: null`, `unit: ""` radi ručnog popunjavanja; postojeća polja ostaju netaknuta, a vrednosti se dodaju samo za polja koja nedostaju. Placeholderi su stvarna JSON polja i ulaze u hash; posle ručnog strukturiranja ponovo se pravi review template. Nema modela, mrežnih poziva, klasifikacije ili automatskog zaključivanja matcher polja.

Kompletan lokalni tok:

```sh
pnpm data:prepare <lokalni-ulaz> <import.json>
pnpm data:split --input <import.json> --output <split.json>
pnpm rules:draft --input <split.json> --output <rules-draft.json>
pnpm rules:review-template --input <import.json> --draft <rules-draft.json> --output <reviews.json>
```

Umesto dve srednje komande može se koristiti `data:split-draft` sa istim `--input` i opcijama, uz obavezna `--split-output` i `--output`; oba fajla ostaju zasebni izlazi. `data:prepare` proizvodi strogo validiran import JSON sa normalizovanim studijama i izvornim tekstom. `data:split` izdvoji moguće kriterijume iz teksta (ili može primiti raw ulaz) u `trialmatch-review-draft-v1`; `rules:draft` prenese kriterijume u običan JSON `{ trialId, criteria }` fajl sa praznim matcher poljima za ručno popunjavanje. Čovek proverava izvore i popunjava stvarna JSON polja pre `rules:review-template`. Taj korak prima import i uređeni nacrt i pravi poseban JSON hash pregledni fajl sa početnim statusom `pending_review`, praznim `reviewer` poljem i ISO `reviewedAt` vremenom kreiranja fajla. Vreme kreiranja je validno po formatu, ali nije vreme ljudskog pregleda; čovek ga menja pre odobravanja. Kod kriterijuma `raw_extracted`, review-template može validirati kriterijum bez dodatnih polja ili sa kompletno popunjenim matcher poljima radi pravljenja pending šablona, ali `compile:rules` i dalje zahteva kriterijume u domenskoj šemi pre pakovanja. Nijedna pripremna komanda ne odobrava pravila.

## Review šablon i `compile:rules`

Napravi draft pravila iz izvornih odlomaka, pa generiši neodobren hash šablon:

```sh
pnpm rules:review-template --input <uvoz.json> --draft <ručna-pravila.json> --output <novi-pregledi.json>
```

Šablon je običan JSON sa početnim statusom `pending_review`, `reviewer: ""` i `reviewedAt` postavljenim na validno ISO 8601 vreme kreiranja fajla sa vremenskom zonom. Dozvoljene vrednosti statusa su `draft`, `needs_manual_split`, `pending_review`, `approved` i `rejected`; početni status ostaje `pending_review`. Vreme kreiranja olakšava editovanje, ali nije stvarno vreme pregleda: čovek mora da ga zameni stvarnim datumom/vremenom i unese svoj `reviewer` pre odobravanja. Čovek proverava citate/pravila i popunjava prazne matcher vrednosti. Posle bilo kakve izmene kriterijuma ponovo generiše `rules:review-template` radi ponovnog izračuna hasha. `compile:rules` čita običan JSON i validira vrednosti postojećim strict šemama. CLI ne odobrava pravila.

```sh
pnpm compile:rules --input <uvoz.json> --draft <pravila.json> --reviews <pregledi.json> --output <novi-paket-dir>
```

Compiler validira strict šeme, trial/source pripadnost, tačan citat i SHA-256 izvora, rules hash, odobrenje/reviewer/datum, kanonske jedinice/operators i manifest. Samo `approved` zapis sa trenutno identičnim source/rules hash-evima ulazi u paket. Ostali se beleže kao isključeni; nema kriterijuma ili prazna pravila ne mogu napraviti kandidata. I output i lokalna lock putanja sprečavaju paralelno/nenamerno prepisivanje.

Tačan tok je: lokalni `data:prepare` import ili raw ulaz → `data:split` pa `rules:draft` (ili objedinjeni `data:split-draft`) → ljudsko popunjavanje matcher polja → `rules:review-template` → ručni status/pregled i stvarni reviewer/vreme → `compile:rules`. Pri izmeni kriterijuma review template se ponovo generiše zbog `rulesHash` provere. Nema pripremne komande koja postavlja `approved`, a status, non-empty reviewer/datum i podudaranje izvora/pravila ostaju postojeći obavezni approval uslovi.

Manifest čuva import poreklo/licencu i ograničenja; server odbija realni skup sa nepotvrđenom licencom ili studijom bez pravila. `includedCount` ne prelazi `downloadedCount`. Nepotvrđeno poreklo/licenca i ljudski pregled ostaju blokatori aktiviranja paketa. Ne izmišljati provenance ili reviewer.

Gold anotacije/predikcije su odvojene: `gold:criteria` prima samo lokalni `manual` ili `structured` metod sa matching source/dataset/annotation verzijama. Ovaj rezultat nije modelska metrika parsera kriterijuma.
