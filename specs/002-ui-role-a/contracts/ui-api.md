# Ugovor: polja API-ja od kojih interfejs zavisi

**Datum**: 2026-11-10 | **Vlasnik ugovora**: Uloga B (`packages/shared/src/index.ts`) | **Korisnik**: Uloga A (`apps/web/`)

Ovaj dokument ne menja ugovor. Navodi samo polja koja interfejs čita, da svaka izmena tih polja bude vidljiva kao rizik za interfejs. Puni ugovor je `specs/001-trialmatch-core/contracts/api.md` i `packages/shared/src/index.ts`.

## Zahtevi koje interfejs šalje

| Radnja | Metod i putanja | Telo |
|---|---|---|
| Nova provera | `POST {osnova}/api/runs` | `{ "profileText": string }` |
| Odgovor na pitanje | `POST {osnova}/api/runs/{runId}/answer` | `{ "answer": string }` |
| Hipotetička izmena | `POST {osnova}/api/runs/{runId}/hypothesis` | `{ "profileText": string }` |

`{osnova}` je vrednost `VITE_API_BASE_URL`; prazna vrednost znači ista adresa. `runId` se kodira sa `encodeURIComponent`. Zaglavlje: `content-type: application/json`. Interfejs ne šalje kolačiće, ključeve ni druga zaglavlja.

## Odgovor `RunResponse` (HTTP 200)

Interfejs odbacuje svaki odgovor koji ne prolazi `RunResponseSchema` i prikazuje kontrolisanu grešku.

| Polje | Gde se koristi | Napomena |
|---|---|---|
| `runId` | putanje za `answer` i `hypothesis` | Isti `runId` kroz dopunu i hipotezu. |
| `status` | izbor stanja prikaza | `ok`, `needs_clarification`, `insufficient_evidence`, `rejected`, `error`. Nikad se ne prikazuje doslovno. |
| `stage` | — | Interfejs ga ne čita; koristi `status`. |
| `reason` | razlikovanje stanja 7 i 8 | `no_matching_trial`, `not_in_sources`. |
| `explanation` | pasus objašnjenja | Nepouzdan tekst; prikazuje se kao običan tekst. |
| `profile` | kartica profila | Polja: `age`, `sex`, `hba1c`, `creatinine`, `height`, `weight`, `insulin_last_3_months`, `medications`, `stated_diagnoses`, `ambiguities`, `provenance`. `null` za `rejected`. |
| `profile.provenance[polje].origin` | oznaka „iz dopune“ ili „hipotetički“ | `initial_input`, `answer`, `hypothesis`. |
| `derived[]` | izvedene oznake | `name`, `value`, `unit`, `formulaName`, `sourceReference`. |
| `results[]` | pregled studija i kartice | Redosled se ne menja. Prazan niz za `insufficient_evidence`, `rejected` i `error`. |
| `results[].trialId` | identifikator, sidro, veza ka registru | Veza samo za oblik `^NCT\d{8}$`. |
| `results[].title` | naslov kartice | Nepouzdan tekst. |
| `results[].verdict` | oznaka ishoda | `candidate`, `pending`, `excluded`. |
| `results[].criteria[]` | redovi kriterijuma | `id` (ključ), `text`, `status`, `observedValue`, `sourceId`, `citation.quote`. |
| `question.text` | tekst pitanja | Nepouzdan tekst. |
| `question.options` | dugmad ponuđenih odgovora | Može izostati ili biti prazan niz; oba znače „bez ponuđenih odgovora“. |
| `error.category`, `error.retryable`, `error.message` | izbor poruke i radnje | Tabela u [data-model.md](../data-model.md), odeljak 2. |
| `meta.demoMode` | oznaka režima, napomena u upozorenju, podnožje | |
| `meta.modelId` | oznaka režima i podnožje u stvarnom režimu | Prazan tekst se ne prikazuje. |
| `meta.dataVersion` | podnožje rezultata | |

Polja `meta.promptVersion`, `meta.schemaVersion`, `meta.durationMs`, `meta.modelCalls`, `meta.toolCalls`, `meta.tokens`, `question.field`, `question.trialsResolved` i `results[].criteria[].citation.sourceId` interfejs ne prikazuje.

## Odgovor sa greškom (HTTP 4xx ili 5xx)

```json
{ "status": "error", "error": { "category": "string", "message": "string", "retryable": true } }
```

| Element | Gde se koristi |
|---|---|
| HTTP status | Rezervno pravilo kada telo nije ispravan omotač (429, 404, 408, 504, 5xx, ostali 4xx). |
| `error.category` | Izbor vrste greške. |
| `error.retryable` | Da li se nudi „Pokušaj ponovo“ za servisne greške. |
| `error.message` | Prikazuje se samo za kategoriju koju interfejs ne poznaje, kao običan tekst. |
| Zaglavlje `Retry-After` | Vreme čekanja za 429 (danas ga server ne šalje; REQ-B4). |

## Ponašanja servera na koja se interfejs oslanja

1. Isti `runId` važi za `answer` i `hypothesis` dok server ne izgubi proveru.
2. Posle greške sa HTTP statusom 400 ili 413 na `answer` ili `hypothesis`, sačuvana provera nije promenjena (potvrđeno porukom u `apps/server/src/service/trialmatch.ts` za `ambiguous_hypothesis`; za ostale kategorije traži se potvrda u REQ-B2).
3. `insufficient_evidence`, `rejected` i `error` imaju prazan `results`.
4. Server vraća `run_not_found` (HTTP 404) kada provera ne postoji.

## Polja koja interfejs očekuje od drugih uloga

Predloženi nazivi; konačne određuje Uloga B. Do isporuke interfejs radi bez njih ([data-model.md](../data-model.md), odeljak 5).

| Predloženo polje | Tip | Zahtev |
|---|---|---|
| `meta.dataSnapshotDate` | `string` (`YYYY-MM-DD`) ili `null` | REQ-B1 |
| `results[].overallStatus` | `string` ili `null` | REQ-B6, REQ-C2 |
| `results[].phase` | `string` ili `null` | REQ-B6, REQ-C2 |
| `results[].criteria[].observedUnit` | `string` ili `null` | REQ-B7 |
| `results[].criteria[].observedOrigin` | `"profile"` ili `"derived"` | REQ-B7 |
| Zaglavlje `Retry-After` na 429 | ceo broj sekundi | REQ-B4 |
