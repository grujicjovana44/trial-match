# Ugovor HTTP API-ja

Ovo je potvrđeni tehnički ugovor za funkcionalne zahteve iz [spec.md](../spec.md).

## Zajednička pravila

- Telo zahteva i odgovor su JSON. Server validira svaki zahtev i svaki izlazni odgovor tokom izvršavanja zajedničkom Zod šemom, bez obzira na klijentsku proveru. Odgovor se šalje tek nakon uspešne validacije. Greška izlaznog ugovora vraća HTTP 500 sa strogo validiranim omotačem `status: "error"` i kategorijom `internal_contract_violation`; nevalidan interni odgovor se ne šalje klijentu.
- Nedostajuća, neispravna i prekoračena obavezna polja odbacuju se pre poziva modela ili alata. Svi objekti zahteva i odgovora su strogi: nepoznata polja se odbacuju.
- Status izvršavanja određuje server. Svi statusi i identifikatori ostaju tačno onakvi kakvi su zadati: `ok`, `needs_clarification`, `insufficient_evidence`, `rejected`, `error`; razlog za nedovoljno dokaza je `no_matching_trial` ili `not_in_sources`.
- `ok` ne znači „podoban“ ili „odobren“. Nijedan odgovor ne predstavlja dijagnozu, savet o lečenju ili odluku o uključivanju.
- Citati se vraćaju samo ako je `sourceId` prosleđen u ovom izvršavanju i citirani tekst provereno potiče iz tog odlomka.
- Profil i odgovor služe jednom `runId`; odgovor na pitanje menja samo polje na koje se pitanje odnosi. Hipotetička izmena koristi namensku rutu i menja samo polja koja je validirani izlaz izričito naveo.

## Pokretanje provere

**Zahtev**: `POST /api/runs`

```json
{
  "profileText": "Muškarac, 62 godine, HbA1c 8,1%, kreatinin 1,3 mg/dL"
}
```

`POST /api/runs` započinje proveru. `profileText` je obavezan tekst sintetičkog profila ili izvorno pitanje o studiji. Ako je to izvorno pitanje o činjenici koja nije u dostupnom korpusu (na primer neželjena dejstva leka kada ih korpus podobnosti ne sadrži), odgovor je `insufficient_evidence` sa `not_in_sources`; model ne odgovara iz opšteg znanja. Ovo nije opšta medicinska Q&A funkcionalnost. `MAX_INPUT_CHARS=4000`; prekoračenje se odbacuje pre poziva modela. Ograničenje učestalosti je 20 zahteva u minuti po klijentu u memoriji; prekoračenje vraća HTTP 429 sa kontrolisanom porukom. Telo ne prihvata identifikatore pacijenta niti stvarne podatke pacijenta.

Odgovor je `RunResponse`. HTTP uspešan odgovor može sadržati bilo koji validan tok statusa, uključujući dopunu, nedovoljne dokaze, odbijanje i kontrolisanu grešku; mapiranje HTTP kodova je navedeno ispod.

## Odgovor na pitanje

**Zahtev**: `POST /api/runs/{runId}/answer`

```json
{
  "answer": "ne"
}
```

Odgovor prihvata samo tekstualni odgovor na trenutno pitanje za taj `runId`. Server deterministički parsira odgovor prema polju i ponuđenim vrednostima, povezuje ga sa poljem koje već čeka dopunu, validira ga, čuva ostala potvrđena polja i nastavlja isto izvršavanje; odgovor ne troši modelski poziv. Svaki validno oblikovan odgovor broji se kao runda, čak i ako ostane dvosmislen. Prazan odgovor, nevažeći prelaz ili nepoznat/istekao `runId` ne smeju pokrenuti procenu sa podrazumevanom vrednošću. Prekoračenje pet rundi vraća kontrolisani odgovor `error` sa kategorijom `question_round_limit`.

## Hipotetička izmena profila

**Zahtev**: `POST /api/runs/{runId}/hypothesis`

```json
{
  "profileText": "A šta ako je HbA1c 9,0%?"
}
```

Ruta je dozvoljena samo kada je izvršavanje u fazi `completed`. Server izdvaja i validira samo eksplicitno navedene izmene profila; sve izmene se prihvataju atomski tek po uspešnoj validaciji celog patch-a. Postojeće vrednosti svih nepomenutih polja se čuvaju, a procena se ponavlja pod istim `runId`. Nevalidna, dvosmislena ili zabranjena hipoteza vraća strogu HTTP 400 grešku (`invalid_hypothesis`, `ambiguous_hypothesis` ili `forbidden_intent`) pre alata i matchera, bez izmene sačuvanog izvršavanja; korisnik može poslati novu jasnu hipotezu. Izmenjenim poljima se beleži poreklo `hypothesis`. Ograničenja ukupnog broja poziva i trajanja važe i za nastavak. Hipoteza nije runda odgovora na pitanje; ako ponovna procena traži dopunu, svaki validno oblikovan odgovor računa se u `MAX_QUESTION_ROUNDS=5`, uključujući dvosmislen odgovor. Ako bi posle pete runde bilo potrebno novo pitanje, izvršavanje završava kontrolisanom greškom `question_round_limit`. Ruta nije sredstvo za dijagnozu, savet o lečenju niti odluku o uključenju.

## Oblik odgovora

```json
{
  "runId": "<opaque-run-id>",
  "status": "needs_clarification",
  "stage": "awaiting_input",
  "profile": {
    "age": 62,
    "sex": "male",
    "hba1c": { "value": 8.1, "unit": "%" },
    "ambiguities": [],
    "provenance": {
      "age": { "origin": "initial_input", "round": 0 },
      "sex": { "origin": "initial_input", "round": 0 },
      "hba1c": { "origin": "initial_input", "round": 0 }
    }
  },
  "derived": [],
  "question": {
    "field": "insulin_last_3_months",
    "text": "Da li je koristio insulin u poslednja 3 meseca?",
    "options": ["Da", "Ne"],
    "trialsResolved": ["T-A"]
  },
  "results": [],
  "explanation": "Nedostaje podatak potreban za procenu kriterijuma.",
  "reason": null,
  "error": null,
  "meta": {
    "modelId": "mock",
    "promptVersion": "extract_profile.v1",
    "schemaVersion": "<schema-version>",
    "dataVersion": "<manifest-version>",
    "durationMs": 0,
    "modelCalls": 1,
    "toolCalls": 0,
    "tokens": null,
    "demoMode": true
  }
}
```

Primer prikazuje oblik, ne fiksne identifikatore, rečenice, kliničke vrednosti ili zahtev za konkretnom formulom. Svi odgovori imaju ista polja. Profil može biti `null` samo kada bezbedno nije izgrađen; pitanje i razlog su `null` kada nisu primenljivi, greška je `null` osim za `error`, a kolekcije su prazni nizovi kada nemaju stavke. Polja profila koja nisu navedena ostaju odsutna i ne dobijaju podrazumevane vrednosti.

`RunResponse` je Zod diskriminisana unija po `status`, uz sledeće nepromenljive kombinacije:

| `status` | `stage` | Obavezna polja | Polja koja moraju biti `null` / prazna |
|---|---|---|---|
| `ok` | `completed` | `profile`, neprazan `results`, `explanation` | `question`, `reason`, `error` |
| `needs_clarification` | `awaiting_input` | `profile`, `question`, `explanation` | `reason`, `error` |
| `insufficient_evidence` | `completed` | `explanation`, `reason` (`no_matching_trial` ili `not_in_sources`) | `question`, `error`; `results` je prazan |
| `rejected` | `rejected` | `explanation` | `question`, `reason`, `error`; `profile` je `null`, `derived` i `results` su prazni |
| `error` | `failed` | `error` sa `category`, porukom i `retryable` | `question`, `reason`; `results` je prazan; `profile` može biti `null` ako nije validiran |

`meta` je obavezan u svakom `RunResponse`; sadrži `modelId`, verzije prompta/šeme/podataka, `durationMs`, `modelCalls`, `toolCalls`, `tokens` i `demoMode`. Kada model nije pozvan, `modelId` navodi aktivni adapter, a broj poziva je nula.

### Polja odgovora

| Polje | Očekivani sadržaj |
|---|---|
| `runId` | Identifikator nastavka provere; ne sadrži identitet osobe. |
| `status` | `ok`, `needs_clarification`, `insufficient_evidence`, `rejected` ili `error`. |
| `stage` | `received`, `awaiting_input`, `ready`, `running_tool`, `completed`, `failed` ili `rejected`. |
| `profile` | Validiran profil i poreklo vrednosti ili `null` ako profil nije validiran; bez podrazumevanih vrednosti. |
| `derived[]` | `name`, `value`, `unit`, `formulaName`, `sourceReference`. |
| `question` | Objekat sa `field`, tekstom na srpskom, opcionim ponuđenim vrednostima i `trialsResolved`, ili `null`. Najviše jedno pitanje po odgovoru. |
| `results[]` | `trialId`, naslov, presuda, `criteria[]`. |
| `criteria[]` | `id`, tekst kriterijuma, `status`, `observedValue`, `sourceId`, `citation`. |
| `citation` | `sourceId` i tačan `quote` u jeziku izvora; mora se proveriti na serveru. |
| `explanation` | Objašnjenje na srpskom, potkrepljeno već izračunatim statusima i dostupnim odlomcima. |
| `reason` | Za `insufficient_evidence`: `no_matching_trial` ili `not_in_sources`; inače `null`. |
| `error` | Objekat `category`, razumljiva poruka na srpskom i `retryable` samo za status `error`; inače `null`. Ne sadrži tajne ni unutrašnji lanac rezonovanja. `question_round_limit` završava izvršavanje kao `error` sa HTTP 200; ugovorna greška odgovora je `internal_contract_violation` i jedina vraća HTTP 500. |
| `meta` | Model/prompt/šema/podaci, trajanje, broj poziva i tokeni kada ih provajder vraća; `demoMode` označava mock režim. |

Svaka varijanta se validira pre slanja; status i faza ne mogu biti međusobno neusaglašeni. Ključevi u odgovoru su obavezni čak i kada je vrednost `null` ili prazna kolekcija. Polja koja nisu u šemi odbacuju se, ne uklanjaju se tiho.

Greške zahteva koje ne mogu da se predstave kao izvršavanje vraćaju strogo telo:

```json
{
  "status": "error",
  "error": {
    "category": "run_not_found",
    "message": "Izvršavanje nije pronađeno. Pokrenite novu proveru.",
    "retryable": false
  }
}
```

Isti strogi omotač koristi se za HTTP 400, 404, 413, 429 i 500. Nepoznat ili izgubljen `runId` vraća HTTP 404 sa `run_not_found`; ne kreira se novo izvršavanje. Greška validacije izlaznog ugovora vraća HTTP 500 sa `internal_contract_violation`. Ove greške zahtevnog omotača nisu `RunResponse` i ne pokreću model ili alat.

## Potvrđeno mapiranje HTTP kodova

Poslovni ishodi `needs_clarification`, `insufficient_evidence`, `rejected` i kontrolisani `error`, kao i `ok`, vraćaju HTTP 200; status poslovnog toka nalazi se u telu odgovora. Samo `internal_contract_violation` vraća HTTP 500.

| HTTP kod | Slučaj |
|---|---|
| `200` | Validan poslovni ishod: `ok`, `needs_clarification`, `insufficient_evidence`, `rejected` ili kontrolisani `error`. |
| `400` | Nevažeći JSON/polja/odgovor na pitanje ili nevalidna, dvosmislena ili zabranjena hipoteza (`invalid_hypothesis`, `ambiguous_hypothesis`, `forbidden_intent`). Greška hipoteze ne menja sačuvano izvršavanje. |
| `404` | `runId` ne postoji ili je izgubio stanje posle restarta. |
| `413` | Ulaz prevazilazi dozvoljenu dužinu. |
| `429` | Ograničenje učestalosti: više od 20 zahteva u minuti po klijentu. |
| `500` | Isključivo `internal_contract_violation`; odgovor je kontrolisani error sa tom kategorijom. |

Nevažeće telo zahteva je 400; nepoznat ili istekao `runId` je 404; predugačak unos je 413; ograničenje brzine je 429. Samo `internal_contract_violation` vraća 500.

## Politika bezbednosti ugovora

- API ključ ostaje u serverskom okruženju; nikada nije deo ugovora ili klijentskog odgovora. Server validira zajedničkom runtime šemom i pre slanja; neuspeh je kontrolisani `error` sa `internal_contract_violation`.
- Model ne određuje status provere, dozvolu za alat niti konačnu presudu studije.
- Primitivni i složeni tipovi zahtevaju runtime validaciju, uključujući odgovore modela i argumente alata.
- Nepoznat `runId`, nedozvoljen statusni prelaz i nedostupan citat ne mogu dati uspešan odgovor.
- Odgovor se prikazuje kao bezbedan tekst; klijent ne tumači izlaz modela kao izvršivi HTML.
