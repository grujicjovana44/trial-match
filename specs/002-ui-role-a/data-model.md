# Model podataka interfejsa: stanja i modeli prikaza (Uloga A)

**Datum**: 2026-11-10 | **Specifikacija**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Ovaj dokument opisuje samo stanje i modele prikaza u `apps/web/`. Oblik odgovora servera je u [contracts/ui-api.md](contracts/ui-api.md); zajedničke šeme u `packages/shared` se ne menjaju. Tipovi su opisani TypeScript zapisom radi jednoznačnosti; to je ugovor za implementaciju, ne gotov kod.

## 1. Stanje provere (`apps/web/src/state/run-state.ts`)

```ts
type RequestKind = "run" | "answer" | "hypothesis";

interface LastRequest {
  kind: RequestKind;
  path: string;                    // "/api/runs" | "/api/runs/{runId}/answer" | "/api/runs/{runId}/hypothesis"
  body: Record<string, string>;    // { profileText } ili { answer }
  userText: string;                // tekst koji je korisnik poslao (za prikaz)
}

type Phase = "idle" | "processing" | "result" | "error";

interface RunState {
  phase: Phase;
  result: RunResponse | null;      // poslednji važeći rezultat provere (nikad status "error")
  resultKind: RequestKind | null;  // zahtev koji je proizveo `result`
  sourceText: string | null;       // tekst početne provere, za karticu profila
  hypothesisText: string | null;   // tekst poslednje uspešne hipotetičke izmene
  pending: LastRequest | null;     // zahtev u toku
  lastRequest: LastRequest | null; // zahtev koji ponavlja „Pokušaj ponovo“
  error: UiError | null;
  meta: Meta | null;               // `meta` iz poslednjeg RunResponse bilo kog statusa
  focusToken: number;              // raste pri svakom prelazu koji premešta fokus
  resultSeq: number;               // raste pri svakom novom važećem rezultatu; ključ obrazaca dopune i hipoteze
}

type RunAction =
  | { type: "submit"; request: LastRequest }
  | { type: "succeeded"; response: RunResponse }
  | { type: "failed"; error: UiError }
  | { type: "reset" };
```

Početno stanje: `phase: "idle"`, sva ostala polja `null`, `focusToken: 0`, `resultSeq: 0`.

### Prelazi

| Akcija | Uslov | Novo stanje |
|---|---|---|
| `submit` | `phase !== "processing"` | `phase: "processing"`, `pending` i `lastRequest` = zahtev, `error: null`. Ako je `kind === "run"`: `result`, `resultKind`, `hypothesisText` = `null`, `sourceText` = `request.userText`. Inače `result` ostaje (prikazuje se kao zastareo). |
| `submit` | `phase === "processing"` | Bez promene (drugi zahtev se ne šalje). |
| `succeeded` | `response.status !== "error"` | `phase: "result"`, `result` = odgovor, `resultKind` = `pending.kind`, `meta` = `response.meta`, `pending: null`, `error: null`, `focusToken + 1`, `resultSeq + 1`. Ako je `pending.kind === "hypothesis"`: `hypothesisText` = `pending.userText`. |
| `succeeded` | `response.status === "error"` | `phase: "error"`, `result: null`, `resultKind: null`, `error` = `uiErrorFromCategory(response.error, "run")`, `meta` = `response.meta`, `pending: null`, `focusToken + 1`. |
| `failed` | `error.runLost === true` ili `lastRequest.kind === "run"` | `phase: "error"`, `error`, `result: null`, `resultKind: null`, `pending: null`, `focusToken + 1`. |
| `failed` | inače | `phase: "error"`, `error`, `pending: null`, `focusToken + 1`; `result` ostaje i prikazuje se kao važeći. |
| `reset` | `phase !== "processing"` | Početno stanje, uz `focusToken + 1`; `resultSeq` se ne vraća na nulu. |

### Izvedeno iz stanja (bez dodatnog stanja)

| Naziv | Pravilo |
|---|---|
| `busy` | `phase === "processing"` |
| `showResult` | `result !== null` |
| `resultIsStale` | `showResult && phase === "processing"` |
| `showSavedNotice` | `phase === "result" && resultKind === "answer"` |
| `isHypothesisResult` | `phase !== "processing" && resultKind === "hypothesis"` |
| `canStartOver` | `phase === "result" \|\| phase === "error"` |
| Cilj fokusa | `phase === "error"`: panel greške. `phase === "result"` i `result.status === "needs_clarification"`: naslov „Potrebna dopuna“. `phase === "result"` inače: naslov rezultata. `phase === "idle"` i `focusToken > 0`: polje za unos. |

### Veza sa 16 stanja iz specifikacije

| # | Stanje | Kako nastaje |
|---|---|---|
| 1 | Početno | `phase: "idle"`, polje prazno |
| 2 | Greška validacije unosa | lokalno stanje obrasca (odeljak 3), `phase` se ne menja |
| 3 | Obrada | `phase: "processing"` |
| 4 | Rezultat `ok` | `result.status === "ok"` |
| 5 | Pitanje za dopunu | `result.status === "needs_clarification"` |
| 6 | Potvrda nastavka | `showSavedNotice` |
| 7 | `no_matching_trial` | `result.status === "insufficient_evidence"`, `reason === "no_matching_trial"` |
| 8 | `not_in_sources` | isto, `reason === "not_in_sources"` |
| 9 | Odbijen zahtev | `result.status === "rejected"` |
| 10 | Serverska greška koja se može ponoviti | `error.kind === "service"`, `error.action === "retry"` |
| 11 | Istek vremena | `error.kind === "model_timeout"` ili `"client_timeout"` |
| 12 | Prekoračen broj zahteva | `error.kind === "rate_limited"` |
| 13 | Greška koja se ne može ponoviti | `error.action === "restart"` ili `"edit"` |
| 14 | Mrežna ili HTTP greška | `error.kind === "network"`, `"bad_response"`, `"invalid_response"` |
| 15 | Rezultat hipotetičke izmene | `isHypothesisResult` |
| 16 | Posle „Počni iznova“ | `reset` |

## 2. Greška za prikaz (`apps/web/src/api/ui-error.ts`)

```ts
type UiErrorKind =
  | "network" | "client_timeout" | "bad_response" | "invalid_response"
  | "rate_limited" | "model_timeout" | "service" | "processing_limit"
  | "question_limit" | "input_invalid" | "input_too_large"
  | "hypothesis_invalid" | "hypothesis_forbidden" | "run_expired" | "request_rejected";

type UiErrorAction = "retry" | "wait_retry" | "edit" | "restart";

interface UiError {
  kind: UiErrorKind;
  action: UiErrorAction;
  runLost: boolean;             // true: prethodni rezultat više ne važi
  retryAfterSeconds?: number;   // samo za "rate_limited"
  serverMessage?: string;       // poruka servera, samo za nepoznatu kategoriju
}
```

Naslov i tekst nisu u objektu; biraju se iz `copy.ts` po `kind` i `action` ([plan.md](plan.md), odeljak „Tekstovi interfejsa“).

### Od kategorije servera do vrste greške (`uiErrorFromCategory`)

| Kategorija servera | `kind` | `action` | `runLost` |
|---|---|---|---|
| `model_timeout` | `model_timeout` | `retryable ? "retry" : "restart"` | `true` |
| `model_call_limit`, `tool_call_limit` | `processing_limit` | `retryable ? "retry" : "restart"` | `true` |
| `tool_error`, `unknown_tool`, `invalid_tool_arguments`, `internal_error`, `internal_contract_violation` | `service` | `retryable ? "retry" : "restart"` | vidi napomenu |
| `question_round_limit` | `question_limit` | `restart` | `true` |
| `rate_limit_exceeded` | `rate_limited` | `wait_retry` | `false` |
| `input_too_large` | `input_too_large` | `edit` | `false` |
| `invalid_request`, `invalid_profile` | `input_invalid` | `edit` | `false` |
| `invalid_hypothesis`, `ambiguous_hypothesis` | `hypothesis_invalid` | `edit` | `false` |
| `forbidden_intent` | `hypothesis_forbidden` | `edit` | `false` |
| `run_not_found`, `invalid_transition` | `run_expired` | `restart` | `true` |
| bilo koja druga | `service` | `retryable ? "retry" : "restart"` | vidi napomenu; `serverMessage` = poruka servera |

Napomena za `runLost`: drugi argument funkcije je izvor, `"run"` (greška je stigla kao `RunResponse` sa statusom `error`) ili `"http"` (greška je stigla kao HTTP status sa omotačem). Za izvor `"run"` `runLost` je uvek `true`. Za izvor `"http"` važi vrednost iz tabele, a za redove sa „vidi napomenu“ je `false`.

### Greške bez omotača servera (`uiErrorFromTransport`)

| Okolnost | `kind` | `action` | `runLost` |
|---|---|---|---|
| `fetch` odbijen (mreža, server nedostupan) | `network` | `retry` | `false` |
| Prekid posle 70 s | `client_timeout` | `retry` | `false` |
| Telo nije JSON | `bad_response` | `retry` | `false` |
| HTTP 200, ali ne prolazi `RunResponseSchema` | `invalid_response` | `retry` | `false` |
| HTTP 429 bez ispravnog omotača | `rate_limited` | `wait_retry` | `false` |
| HTTP 404 bez ispravnog omotača, zahtev nije `run` | `run_expired` | `restart` | `true` |
| HTTP 408 ili 504 bez ispravnog omotača | `client_timeout` | `retry` | `false` |
| HTTP 5xx bez ispravnog omotača | `service` | `retry` | `false` |
| Ostali HTTP 4xx bez ispravnog omotača | `request_rejected` | `restart` | `false` |

`retryAfterSeconds`: ceo broj iz zaglavlja `Retry-After` ako je između 1 i 600; inače 60.

## 3. Lokalno stanje obrasca za unos (`ProfileForm`)

| Polje | Tip | Pravilo |
|---|---|---|
| `text` | `string` | sadržaj polja; nema atribut `maxLength`, da se nalepljen tekst ne skrati neprimetno |
| `touched` | `boolean` | `true` posle prve izmene ili napuštanja polja; `reset` ga vraća na `false` |
| `validity` | `"empty" \| "too_long" \| "valid"` | `empty`: `text.trim().length === 0`; `too_long`: `text.length > 4000`; inače `valid` |
| Slanje | — | onemogućeno kada `validity !== "valid"` ili `busy` |
| Greška se prikazuje | — | `too_long` uvek; `empty` samo kada je `touched` |

Granica 4000 je konstanta `MAX_INPUT_CHARS` u `copy.ts`, jednaka podrazumevanoj vrednosti servera (`apps/server/src/config/index.ts`).

## 4. Modeli prikaza (čiste funkcije u `apps/web/src/result-view-model.ts`)

Postojeće funkcije `statusLabel`, `criterionStatusLabel`, `summarizeCriteria` i `missingProfileFields` zadržavaju potpis i ponašanje koje test već proverava.

| Funkcija | Ulaz → izlaz | Pravilo |
|---|---|---|
| `resultHeading(result)` | `RunResponse` → `string` | Za `insufficient_evidence` bira po `reason`; inače `statusLabel(status)`. |
| `verdictLabel(verdict)` | `"candidate" \| "pending" \| "excluded"` → `string` | „Kandidat za dalju proveru“, „Čeka dopunu podataka“, „Ne ispunjava kriterijume“. |
| `criterionStatusShort(status)` | status → `string` | „Ispunjen“, „Nije ispunjen“, „Nepoznato“. |
| `criterionStatusNote(status)` | status → `string` | „prema dostupnim podacima“ (za `met` i `not_met`), „potrebna je dopuna ili ručna provera“ (za `unknown`). |
| `criterionStatusIcon(status)` | status → `string` | „✓“, „✕“, „?“. |
| `formatNumber(value)` | `number` → `string` | Najviše dve decimale, bez završnih nula, decimalni zarez: `8.1` → „8,1“, `62` → „62“, `61.666` → „61,67“. |
| `formatObservedValue(value)` | `number \| boolean \| string \| null` → `{ text: string; missing: boolean }` | `null` → „nije uneto“, `missing: true`. `true` → „da“. `false` → „ne“. `"male"` → „muški“. `"female"` → „ženski“. Broj → `formatNumber`. Ostali tekst doslovno. |
| `profileChips(profile)` | `Profile` → `ProfileChip[]` | Jedna oznaka po prisutnom polju, redosledom: starost, pol, HbA1c, kreatinin, visina, težina, insulin, terapije, dijagnoza. |
| `derivedChips(derived)` | `DerivedValue[]` → `DerivedChip[]` | Jedna oznaka po izvedenoj vrednosti. |
| `missingProfileFields(profile)` | postojeće | Oznaka za pol se menja iz „pol za eGFR“ u „pol“. |
| `profileAmbiguities(profile)` | `Profile` → `{ label: string; reason: string }[]` | Iz `profile.ambiguities`; oznaka polja iz iste tabele naziva, uz „eGFR“ i „BMI“. |
| `trialRegistryUrl(trialId)` | `string` → `string \| null` | Ako odgovara `^NCT\d{8}$`: `https://clinicaltrials.gov/study/` + identifikator; inače `null`. |
| `trialAnchorId(index)` | `number` → `string` | `trial-` + (indeks + 1). |
| `modeBadge(meta)` | `Meta \| null` → `ModeBadgeModel \| null` | `null` → `null`. `demoMode: true` → `{ kind: "demo" }`. Inače `{ kind: "live", modelId }`, gde je `modelId` `null` ako je prazan tekst. |
| `formatSnapshotDate(iso)` | `string` → `string \| null` | `YYYY-MM-DD` → „7. novembar 2026.“; neispravan oblik → `null`. |

```ts
interface ProfileChip {
  key: string;                       // naziv polja profila
  label: string;                     // "starost"
  value: string;                     // "62", "M", "8,1%", "1,3 mg/dL", "da"
  origin: "initial_input" | "answer" | "hypothesis" | null; // iz profile.provenance
}

interface DerivedChip {
  key: string;        // "eGFR" | "BMI"
  text: string;       // "eGFR ≈ 62,11 mL/min/1.73 m²" (jedinica doslovno kako je pošalje server)
  formula: string;    // formulaName
  source: string;     // sourceReference
}

type ModeBadgeModel = { kind: "demo" } | { kind: "live"; modelId: string | null };
```

### Pravila za oznake profila

| Polje | `label` | `value` |
|---|---|---|
| `age` | starost | broj, bez jedinice |
| `sex` | pol | `male` → „M“, `female` → „Ž“ |
| `hba1c`, `creatinine`, `height`, `weight` | HbA1c, kreatinin, visina, težina | `formatNumber(value)` + jedinica; jedinica „%“ se piše bez razmaka, ostale sa razmakom |
| `insulin_last_3_months` | upotreba insulina | „da“ ili „ne“ |
| `medications` | terapije | stavke spojene sa „, “ |
| `stated_diagnoses` | navedena dijagnoza | stavke spojene sa „, “ |

Tekst izvedene oznake: `{name} ≈ {formatNumber(value)} {unit}`.

## 5. Modeli koji čekaju drugu ulogu

| Model | Čeka | Do tada |
|---|---|---|
| Jedinica i oznaka „izračunao kod“ u redu kriterijuma | REQ-B7 (`observedUnit`, `observedOrigin`) | Prikazuje se vrednost bez jedinice i bez oznake; ništa se ne nagađa. |
| Status regrutacije i faza u zaglavlju studije | REQ-B6, REQ-C2 (`overallStatus`, `phase` u rezultatu po studiji) | Red se ne prikazuje. |
| Datum snimka u podnožju rezultata | REQ-B1 (`meta.dataSnapshotDate`) | Prikazuje se samo verzija skupa. |
| Isključene studije za `no_matching_trial` | REQ-B3 | Prikazuje se samo poruka. |
