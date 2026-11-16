# Zahtev za ljudsku adjudikaciju — RAG skup v2

**Status:** četiri postojeća slučaja adjudikovana; planirani corpus-v1 obrasci još nemaju slučajeve  
**Skup:** `rag-retrieval-v2`  
**Korpus:** `rag-corpus-v0-dev`  
**Obim:** 2 slučaja za rangiranje, 2 slučaja ponašanja, 5 studija i 40 kriterijumskih odlomaka  
**Bezbednosna napomena:** ovo je pregled relevantnosti retrieval-a, ne procena podobnosti, dijagnoza ili medicinski savet.

## Primljeni pregled — JG, 2026-11-15

- **RAG-001:** pravilo izmenjeno prema recenziji. `NCT07924436` je relevantna; `T-A`, `T-B`, `T-C` nisu. Recenzent je ostavio `NCT07409714` uslovno; pregled zamrznutog snapshot-a pokazuje da nema summary, navodi samo T2D u title/conditions, a BMI `<40` je prag podobnosti, ne obesity ciljna populacija. Po datom pravilu nije relevantna. `NCT07924436#inc-1` (pol) je uklonjen; `NCT07924436#inc-3` (BMI `>=30`) i `NCT07924436#inc-5` su potvrđeni kao relevantni. Slučaj je `confirmed`.
- **RAG-002:** pravilo izmenjeno i potvrđeno. `NCT07409714` je relevantna; ostale četiri studije nisu. `NCT07409714#inc-1` (uzrast) i `NCT07409714#inc-3` (tekst ne kaže eksplicitno T2D) su uklonjeni; `NCT07409714#exc-4` (eGFR) i `NCT07409714#exc-5` (albuminurija) su relevantni.
- **RAG-003:** očekivanje potvrđeno za ovaj snapshot: izabrati svih pet ako `RAG_MAX_CANDIDATES >= 5`; redosled se ne boduje.
- **RAG-004:** očekivanje potvrđeno: bez pretraživog koncepta vratiti do limita u stabilnom ID redosledu `NCT07409714`, `NCT07924436`, `T-A`, `T-B`, `T-C`; ne filtrirati po uzrastu/polu niti pozivati embeddings.
- **Dodatna odluka:** JG je potvrdio `NCT07924436#inc-3` kao relevantan (BMI prag u ovoj studiji definiše gojaznost).
- **Pregledavaoc/datum:** `JG`, `2026-11-15`. Sva četiri postojeća slučaja su adjudikovana. Dataset zadržava ukupni status `pending_human_review` jer planned patterns još nemaju konkretne slučajeve/oznake.

## Šta treba da vratite

Za svaki rangirajući slučaj:

1. Pregledajte da li je pravilo relevantnosti ispod jasno i odgovara zadatku. Ako nije, predložite precizniju formulaciju pre označavanja.
2. Za svaku od pet studija označite `relevant`, `not_relevant` ili `uncertain` za dati upit.
3. Navedite tačne ID-jeve svih relevantnih odlomaka iz liste. Odlomak je relevantan ako neposredno pomaže da se pronađe studija za upit; ne označavajte ga relevantnim samo zato što je kriterijum uključenja/isključenja ili zato što profil ispunjava kriterijum.
4. Dodajte kratko obrazloženje za svaku `uncertain` odluku ili neslaganje sa predloženom oznakom.

Za slučajeve ponašanja `RAG-003` i `RAG-004` potvrdite ili ispravite očekivanje; nemojte im dodeljivati rangirajuće oznake.

Vratite popunjene odeljke ispod ili pošaljite odgovor u ovom obliku:

```text
Reviewer: [ime ili inicijali]
Reviewed at: YYYY-MM-DD

RAG-001 rule: accept / revise -> [nova formulacija ako treba]
RAG-001 studies: T-A=..., T-B=..., T-C=..., NCT07409714=..., NCT07924436=...
RAG-001 relevant passage IDs: [...]
RAG-001 notes: ...

RAG-002 rule: accept / revise -> [nova formulacija ako treba]
RAG-002 studies: T-A=..., T-B=..., T-C=..., NCT07409714=..., NCT07924436=...
RAG-002 relevant passage IDs: [...]
RAG-002 notes: ...

RAG-003 expectation: accept / revise -> ...
RAG-004 expectation: accept / revise -> ...
```

`uncertain` je prihvatljiv odgovor i ne treba ga pretvarati u relevantno/nerelevantno bez dodatnog dogovora.

## Pravila za rangirajuće oznake

Pravila ispod su nacrt iz skupa; proverite ih pre oznaka. Ako se menjaju, vratite novu preciznu formulaciju. Rangiranje ne znači da je osoba podobna za studiju.

### RAG-001 — srpski upit: gojaznost i dijabetes tipa 2

**Profil:** 52 godine, ženski pol, navedene dijagnoze: gojaznost i dijabetes tipa 2.  
**Predložena studija:** `NCT07924436`  
**Predloženi odlomci:** `NCT07924436#inc-1`, `NCT07924436#inc-3`, `NCT07924436#inc-5`

**Nacrt pravila:** studija je relevantna ako njen opis obuhvata dijabetes tipa 2 i profilni koncept gojaznosti; relevantan odlomak neposredno opisuje jedan od tih ciljnih koncepata.

**Razjašnjenje potrebno:** odlučite da li studija mora pokrivati oba koncepta ili je dovoljan jedan; da li BMI raspon/vrednost bez eksplicitnog termina „gojaznost“ predstavlja relevantan odlomak; i da li je pol odlomak relevantan za ovaj upit. Predloženi `inc-1` opisuje pol, a ne jedan od dva navedena koncepta, pa proverite da li treba ostati u oznaci.

### RAG-002 — engleski upit: dijabetes tipa 2 i bubrežno zdravlje

**Profil:** 20 godina; navedeni pojmovi: type 2 diabetes i renal health.  
**Predložena studija:** `NCT07409714`  
**Predloženi odlomci:** `NCT07409714#inc-1`, `NCT07409714#inc-3`, `NCT07409714#exc-4`

**Nacrt pravila:** naslov, stanja ili sažetak studije obuhvata dijabetes tipa 2 kod adolescenata/mladih odraslih i bubrežni kontekst; relevantan odlomak neposredno navodi uzrast, dijabetes ili bubrežnu funkciju.

**Razjašnjenje potrebno:** odlučite da li su potrebni oba koncepta na nivou studije ili je dovoljan jedan; da li je svaki odlomak koji pominje uzrast/dijabetes relevantan i kada ne pominje bubrežni kontekst; i da li bubrežni kriterijum treba da bude uključen bez obzira na inclusion/exclusion vrstu.

## Korpus za pregled

Ovo je kompletan skup pet studija u snapshot-u; tačan tekst i metapodaci ostaju u navedenim lokalnim fajlovima. Kratki opisi ispod služe samo za navigaciju, nisu anotacije.

| Study ID      | Kratki opis za navigaciju                                                                        | Izvor                                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `T-A`         | Sintetička T2D studija; kriterijumi uključuju uzrast, HbA1c, eGFR i insulin.                     | [`data/fixtures/trials.json`](../../data/fixtures/trials.json)                                                                     |
| `T-B`         | Sintetička T2D studija; kriterijumi uključuju uzrast, HbA1c i eGFR.                              | [`data/fixtures/trials.json`](../../data/fixtures/trials.json)                                                                     |
| `T-C`         | Sintetička T2D studija; kriterijumi uključuju uzrast, BMI i HbA1c.                               | [`data/fixtures/trials.json`](../../data/fixtures/trials.json)                                                                     |
| `NCT07409714` | Studija T2D kod adolescenata/mladih odraslih; izvor sadrži bubrežni i kardiovaskularni kontekst. | [`data/rule_sets/studies_2_approved_20261115_1539/trials.json`](../../data/rule_sets/studies_2_approved_20261115_1539/trials.json) |
| `NCT07924436` | Studija vežbanja kod žena sa gojaznošću, sa ili bez T2D.                                         | [`data/rule_sets/studies_2_approved_20261115_1539/trials.json`](../../data/rule_sets/studies_2_approved_20261115_1539/trials.json) |

Izvorni ClinicalTrials.gov zapisi su lokalni snimci; nisu ponovo preuzimani za ovaj obrazac. Oznaka „relevantno“ odnosi se na upit i sadržaj retrieval dokumenta, ne na kliničku vrednost ili podobnost profila.

## Inventar kriterijumskih odlomaka

Ovo su svi kriterijumski ID-jevi dostupni u snapshot-u. Za tačan tekst otvorite lokalni izvor iz prethodne tabele i pronađite `id`. Izbor relevantnih ID-jeva napravite zasebno za RAG-001 i RAG-002.

| Study ID      | Passage ID-jevi                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `T-A`         | `T-A#inc-1` uzrast; `T-A#inc-2` HbA1c; `T-A#inc-3` eGFR; `T-A#inc-4` insulin                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `T-B`         | `T-B#inc-1` uzrast; `T-B#inc-2` HbA1c; `T-B#inc-3` eGFR                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `T-C`         | `T-C#inc-1` uzrast; `T-C#inc-2` BMI; `T-C#inc-3` HbA1c                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `NCT07924436` | `NCT07924436#inc-1` pol; `NCT07924436#inc-2` uzrast; `NCT07924436#inc-3` BMI; `NCT07924436#inc-4` saglasnost; `NCT07924436#inc-5` dijabetes tipa 2 za jednu grupu / odsustvo dijabetesa za drugu; `NCT07924436#exc-1` stanja koja sprečavaju vežbanje; `NCT07924436#exc-2` muskuloskeletne deformacije; `NCT07924436#exc-3` kognitivno oštećenje; `NCT07924436#exc-4` osteoporoza/osteopenija                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `NCT07409714` | `NCT07409714#inc-1` uzrast; `NCT07409714#inc-2` Tanner stadijum; `NCT07409714#inc-3` vreme početka/trajanje dijabetesa; `NCT07409714#inc-4` HbA1c; `NCT07409714#inc-5` krvni pritisak; `NCT07409714#inc-6` stabilna antihipertenzivna terapija; `NCT07409714#inc-7` BMI; `NCT07409714#inc-8` stabilna doza određenih lekova; `NCT07409714#inc-9` saglasnost; `NCT07409714#exc-1` T1D; `NCT07409714#exc-2` nedavna ketoacidoza/hiperosmolarno stanje; `NCT07409714#exc-3` nekontrolisana hipertenzija; `NCT07409714#exc-4` eGFR; `NCT07409714#exc-5` albuminurija; `NCT07409714#exc-6` druga studija; `NCT07409714#exc-7` trudnoća/dojenje; `NCT07409714#exc-8` alergija na aspirin; `NCT07409714#exc-9` teško oštećenje jetre; `NCT07409714#exc-10` psihijatrijska istorija; `NCT07409714#exc-11` određeni kortikosteroidi/bronhodilatatori; `NCT07409714#exc-12` alergija na jod/školjke |

## Obrasci koji još nemaju slučajeve za adjudikaciju

Sledeće četiri stavke su samo opisni planovi u dataset-u, nisu slučajevi sa oznakama. Ne mogu se potvrditi kao relevantni ID-jevi dok se ne doda i zamrzne odgovarajući corpus-v1 skup:

- upit bez poklapanja;
- srpski sinonimi i ćirilica naspram engleskog izvora;
- zlonameran indeksirani odlomak;
- leksički teški negativni primeri sa sličnim rečima, ali različitim kontekstom.

Ako želite da i ovo bude deo adjudikacije, potrebni su novi sintetički slučajevi i stabilan corpus-v1 snapshot. Nemojte dodeljivati ID-jeve studija/odlomaka ovim obrascima na osnovu trenutnog korpusa.

## Poreklo i fiksiranje verzije

Dataset trenutno kaže `annotationStatus: pending_human_review`; postojeće oznake su predložene i nisu ljudski potvrđene. Snapshot putanje, verzije i SHA-256:

- `data/fixtures/trials.json` — `synthetic-trials-v1`, `f368d13bff16dc5ad69636513281ed18ea8601978a83d6c3c000dd4b0cde4950`
- `data/rule_sets/studies_2_approved_20261115_1539/trials.json` — `rules-0b88455b00ae`, `4b39b15a92b3ce20591c70ed54bb60e81a453c10b2c3a5dd2052b00ec3c8a2e5`

Ako se izvori promene pre nego što vratite pregled, javite to; ove oznake važe samo za gore navedene hash-eve.
