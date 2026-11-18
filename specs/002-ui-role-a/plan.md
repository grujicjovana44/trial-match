# Plan implementacije: Korisnički tok i interfejs TrialMatch (Uloga A)

**Grana**: `002-ui-role-a` (oznaka funkcionalnosti; radi se u radnoj kopiji na `main`, grana se ne pravi u fazi planiranja) | **Datum**: 2026-11-10 | **Specifikacija**: [spec.md](spec.md)

**Ulaz**: [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/ui-api.md](contracts/ui-api.md), [contracts/cross-team-requests.md](contracts/cross-team-requests.md), [quickstart.md](quickstart.md), `AGENTS.md`, `.specify/memory/constitution.md`.

**Granica**: Ovaj plan pokriva samo Ulogu A: `apps/web/`, testove u `apps/web/test/` i dokumenta navedena u odeljku 9. Ne menja `packages/shared`, `apps/server`, `eval/`, `scripts/`, `README.md`, korenske konfiguracije ni zavisnosti. Sve ostalo je zahtev drugoj ulozi.

## 1. Sažetak

Postojeći ekran iz Faze 1 dorađuje se u interfejs finalnog proizvoda: stvarni režim je podrazumevan, prikazuje se odakle potiče svaka vrednost, nepoznato je vidljivo, a nijedan ishod ne izgleda kao odluka. Tehnički pristup: `App.tsx` postaje ljuska sa jednim reduktorom stanja; prikaz se deli na male komponente; mrežni sloj nikad ne baca izuzetak i svaku grešku pretvara u jednu od 15 vrsta sa unapred napisanom porukom; svi tekstovi su u jednoj datoteci; boje prelaze u CSS tokene uz ispravku kontrasta. Rad koji zavisi od Uloga B i C je izdvojen i označen.

## 2. Tehnički kontekst

**Jezik i verzija**: TypeScript 5.9.3, `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` (`tsconfig.json`); bez `any`.

**Glavne zavisnosti** (sve već u `package.json`, ništa se ne dodaje): React 19.3.1, Vite 8.3.5, `motion` 14.6.0 (`motion/react`), Zod 4.6.7 preko `packages/shared`.

**Skladište**: nema. Interfejs ne koristi `localStorage`, kolačiće ni druge trajne zapise.

**Testiranje**: Vitest 5.0.5, jsdom 30.1.3, Testing Library React 16.3.3, `user-event` 14.6.8. Test-datoteka koja prikazuje komponente počinje redom `// @vitest-environment jsdom`; jedinični testovi čistih funkcija taj red nemaju. Testovi ne pozivaju mrežu; `fetch` se zamenjuje sa `vi.stubGlobal`.

**Ciljna platforma**: savremeni pregledači na desktopu i telefonu; širina od 320 px. Javna isporuka verovatno na platformi Vercel (odluka iz razjašnjenja).

**Vrsta projekta**: veb-aplikacija u pnpm monorepu; ovaj plan dira samo interfejs.

**Ciljevi performansi**: indikator obrade u roku od 1 s (SC-008); lista od 50 studija upotrebljiva u roku od 1 s od prijema odgovora (SC-011).

**Ograničenja**: samo svetla tema; ručno pisan CSS u `apps/web/src/styles.css`; bez UI kompleta i CSS okvira; `motion` je jedina biblioteka za animaciju; sadržaj je odmah u DOM-u (bez `AnimatePresence mode="wait"`); svi tekstovi na srpskom, latinicom.

**Obim**: jedan ekran, 16 stanja prikaza, 15 komponenti, oko 50 studija po rezultatu.

**Nepoznato**: nema otvorenih stavki koje blokiraju plan. Vlasnik Uloge A je 2026-11-10 odobrio plan, tamniju ivicu polja za unos, tekst oznake „STVARNI MODEL“ i prikaz zastarelog rezultata (vidljiv, zatamnjen, onemogućen).

## 3. Provera usklađenosti sa konstitucijom

| Princip | Ocena | Kako plan to poštuje |
|---|---|---|
| I. Model objašnjava, kod odlučuje | Prolazi | Interfejs ne računa status, ishod ni redosled; prikazuje ono što je vratio server. Sažetak po studiji je samo prebrojavanje već dodeljenih statusa. |
| II. Nepoznato je ravnopravan rezultat | Prolazi | `null` se prikazuje kao „nije uneto“; nedostajuća polja imaju svoj red u kartici profila; nijedna podrazumevana vrednost. |
| III. Granice medicinske bezbednosti | Prolazi | Upozorenje je uvek vidljivo i ne može se skupiti; tekstovi izbegavaju „podoban“; nema slavljeničkih efekata. |
| IV. Validacija na svakoj granici | Prolazi | Svaki odgovor prolazi `RunResponseSchema.safeParse` ili `ApiErrorRequestSchema.safeParse`; neispravan odgovor postaje kontrolisana greška. |
| V. Dokazi prethode tvrdnjama | Prolazi | Režim, model i verzija skupa prikazuju se samo iz `meta`; mapa pokrivenosti AC navodi test ili ručnu proveru. |
| VI. Tajne i podaci pacijenata | Prolazi | Interfejs nema tajni; `VITE_API_BASE_URL` nije tajna; uz polje stoji napomena da se ne unose stvarni podaci; testovi ne zovu plaćeni model. |
| VII. Jednostavnost | Prolazi | Bez novih zavisnosti, bez rutiranja i bez biblioteke za stanje. Glasovni unos je opcion i poslednji. |
| VIII. Stabilni AC ID-jevi | Prolazi | AC-01–AC-12 nepromenjeni; AC-13 dodat; svaki test navodi AC u nazivu ili u mapi pokrivenosti. |
| IX. Dokumentacija prati ponašanje | Prolazi | Uz izmene idu `docs/spec.md`, `docs/ui-motion.md`, `docs/ac-coverage.md`, `docs/demo-script.md` i zapis u `docs/decisions.md`. |
| Razvojni tok: nove biblioteke | Prolazi | Tim je odobrio `motion` 14.6.0; vlasnik je potvrdio odluku 2026-11-10 (REQ-T1, Istraživanje R-16). T246 prenosi zapis u `docs/decisions.md`. Plan ne dodaje druge zavisnosti. |

Ponovna provera posle dizajna: bez novih odstupanja. Tabela „Složenost“ na kraju je prazna.

## 4. Struktura projekta

### Dokumentacija funkcionalnosti

```text
specs/002-ui-role-a/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── ui-api.md
│   └── cross-team-requests.md
├── checklists/
│   └── requirements.md
└── tasks.md                # nastaje u koraku speckit-tasks
```

### Izvorni kod (ciljno stanje u `apps/web/`)

```text
apps/web/
├── index.html                       # menja se samo <title>
├── .env.example                     # NOVO: VITE_API_BASE_URL=
├── src/
│   ├── main.tsx                     # bez izmene
│   ├── App.tsx                      # ljuska: reduktor, raspored, fokus
│   ├── styles.css                   # tokeni i svi stilovi
│   ├── copy.ts                      # NOVO: svi tekstovi i konstante
│   ├── result-view-model.ts         # proširuje se (data-model.md, odeljak 4)
│   ├── api/
│   │   ├── client.ts                # NOVO: postJson, nikad ne baca
│   │   └── ui-error.ts              # NOVO: UiError i mapiranje
│   ├── state/
│   │   └── run-state.ts             # NOVO: reduktor
│   ├── hooks/
│   │   ├── useSlowNotice.ts         # NOVO: true posle 5 s obrade
│   │   ├── useCountdown.ts          # NOVO: odbrojavanje za 429
│   │   └── useSpeechRecognition.ts  # NOVO, AC-13
│   ├── components/
│   │   ├── SiteHeader.tsx
│   │   ├── ModeBadge.tsx
│   │   ├── SafetyNotice.tsx
│   │   ├── ProfileForm.tsx
│   │   ├── ProcessingStatus.tsx
│   │   ├── ErrorPanel.tsx
│   │   ├── ResultPanel.tsx
│   │   ├── ProfileCard.tsx
│   │   ├── TrialOverview.tsx
│   │   ├── TrialCard.tsx
│   │   ├── CriterionRow.tsx
│   │   ├── ClarificationForm.tsx
│   │   ├── HypothesisForm.tsx
│   │   ├── ResultMeta.tsx
│   │   └── VoiceInput.tsx           # AC-13
│   └── motion/                      # postojeće; menja se samo po odeljku 5.7
│       ├── AnimatedNumber.tsx
│       ├── CriteriaSummaryBar.tsx
│       ├── SavedNotice.tsx
│       └── motion-presets.ts
└── test/
    ├── helpers/
    │   └── responses.ts             # NOVO: graditelji odgovora i jsonResponse
    ├── unit/
    │   ├── result-view-model.test.ts  # proširuje se
    │   ├── ui-error.test.ts
    │   ├── run-state.test.ts
    │   ├── client.test.ts
    │   ├── contrast.test.ts
    │   ├── copy.test.ts
    │   └── speech-recognition.test.ts # AC-13
    ├── integration/
    │   ├── run-flow.test.tsx          # menja se (jedan klik)
    │   ├── outcomes.test.tsx
    │   ├── errors.test.tsx
    │   ├── mode-meta.test.tsx
    │   ├── profile-card.test.tsx
    │   ├── trial-list.test.tsx
    │   ├── processing.test.tsx
    │   ├── safe-rendering.test.tsx
    │   └── voice-input.test.tsx
    └── accessibility.test.tsx         # proširuje se
```

**Odluka o strukturi**: uvoz iz zajedničkih šema ostaje relativan, kao danas (`../../../packages/shared/src/index.js` iz `src/`, `../../../../packages/shared/src/index.js` iz podfascikli). Svi lokalni uvozi imaju nastavak `.js` (pravilo `NodeNext` u `tsconfig.json`).

## 5. Dizajn-specifikacija

### 5.1 Revizija prema veštini `taste`

Veština `anthropic-skills:taste` je pozvana pre planiranja interfejsa. Ona sama kaže da nije namenjena višekoračnim proizvodnim interfejsima, pa su primenjeni samo delovi koji ovde imaju smisla.

**Čitanje zadatka**: redizajn uz očuvanje jednog ekrana kliničkog alata, za lekare i žiri, jezikom poverenja i gustine dokaza, uz CSS tokene, sistemski sans i uzdržan pokret.

**Podešavanja**: raznolikost rasporeda 3, intenzitet pokreta 3, vizuelna gustina 6. Zatečeno stanje je približno 3 / 4 / 4.

**Nalazi revizije zatečenog stanja** (`apps/web/src/App.tsx`, `apps/web/src/styles.css`):

| Nalaz | Mera |
|---|---|
| 30 doslovnih boja, nijedan token | Tokeni iz 5.2. |
| Pet različitih poluprečnika (0,5 / 0,6 / 0,65 / 0,75 / 1 rem) | Tri vrednosti: kontrole i poruke 0,65 rem, kartice 0,75 rem, paneli 1 rem; oznake 999 px. |
| Sirovi interni nazivi u prikazu (`needs clarification`, `candidate`) | Oznaka statusa odgovora se uklanja (naslov već kaže isto); ishod studije dobija srpsku oznaku. |
| Pulsirajuća tačka uz tekst obrade | Uklanja se; tačka ostaje samo u oznaci režima, gde nosi stvarno stanje. |
| Tvrdnje upisane u kod (DEMO, verzija skupa, datum, „sintetičke studije“) | Sve iz `meta`, ili uklonjeno. |
| Kartica u kartici u kartici na 320 px | Ispod 560 px kartica studije gubi okvir i postaje odeljak sa linijom iznad. |
| Naziv dugmeta se menja u „Obrada…“ | Naziv ostaje „Proveri kriterijume“; obradu saopštava statusni red. |
| Greška je jedan red teksta bez radnje | Panel greške sa naslovom, objašnjenjem i radnjom. |

**Neslaganja sa veštinom (predlozi, ne grade se)**:

| Preporuka veštine | Zašto se ne primenjuje | Status |
|---|---|---|
| Tamna tema je obavezna | Ograničenje vlasnika: samo svetla tema u ovoj fazi. Tokeni omogućavaju da se doda kasnije. | Predlog za kasnije |
| Izbegavati Inter kao podrazumevani font; uvesti drugi | Ograničenje vlasnika: zadržati postojeći niz fontova. Datoteka fonta se ne učitava, pa se u praksi prikazuje sistemski font. | Ne primenjuje se |
| Ikone samo iz biblioteke (Phosphor i slične), bez ručno crtanih SVG | Nove zavisnosti nisu dozvoljene. Koriste se znakovi „✓“, „✕“, „?“ i „↗“ kao tekst, a postojeća kvačica u `SavedNotice.tsx` ostaje. | Predlog timu: biblioteka ikona |
| Potpuna zabrana duge crte | Tekstovi koje je vlasnik zadao sadrže dugu crtu („DEMO režim — bez poziva stvarnom modelu“, „Nepoznato — potrebna je dopuna ili ručna provera“). Oni ostaju. Novi tekstovi je ne koriste, a u redu kriterijuma se oznaka deli na kratku oznaku i napomenu, pa crta nije vidljiva. | Predlog: zameniti preostalu crtu u podnožju tačkom |
| Najviše jedna mala oznaka iznad naslova na tri odeljka | Identifikator studije iznad naslova je podatak, zadat u dizajnu, i stoji na svakoj kartici. | Ne primenjuje se |
| Bez traka sa pozadinskom stazom | Segmentna traka sažetka je zadata u dizajnu i već postoji; segmenti popunjavaju celu širinu, pa se staza ne vidi. | Ne primenjuje se |
| Bez oznake verzije u podnožju | Verzija skupa i režim su dokaz porekla rezultata (konstitucija V). | Ne primenjuje se |
| Stranica mora imati stvarne slike | Klinički alat; slike bi bile ukras. | Ne primenjuje se |
| Tailwind kao podrazumevani stil | Ograničenje vlasnika: ručno pisan CSS. | Ne primenjuje se |

**Završna provera veštine, primenljive stavke**: čitanje zadatka navedeno; podešavanja obrazložena; režim redizajna i revizija urađeni; jedna tema; jedan akcenat (`--accent`); jedan sistem poluprečnika; kontrast dugmadi i obrazaca izmeren (R-12); naziv dugmeta staje u jedan red; nema dva dugmeta iste namere sa različitim nazivom; svaka animacija ima razlog (5.7); smanjen pokret poštovan; prazno, obrada i greška imaju svoj prikaz; nema lažnih brojeva, izmišljenih imena ni ukrasnih tačaka; najviše jedna srednja tačka po redu teksta.

### 5.2 Tokeni

Sve doslovne boje iz `styles.css` prelaze u prilagođena svojstva na `:root`. Vrednosti se ne menjaju, osim pet odobrenih (tekst tri statusne oznake, indikator fokusa, ivica polja za unos).

```css
:root {
  /* površine */
  --bg: #f5f8f6;
  --surface: #ffffff;
  --surface-soft: #f4f7f5;
  --border: #dce8e1;
  --border-soft: #e8efea;
  --border-card: #e0e9e3;
  --border-input: #6f877b;        /* bilo #aebfb5; odobreno 2026-11-10 */
  --quote-rail: #b5d5c1;

  /* tekst */
  --ink: #17362d;
  --ink-muted: #49675d;
  --ink-subtle: #60776d;
  --ink-eyebrow: #447161;
  --ink-quote: #314f42;

  /* akcenat i fokus */
  --accent: #176f50;
  --on-accent: #ffffff;
  --focus: #9a6700;               /* bilo #e8a52a; odobreno */

  /* status kriterijuma: boja linije/segmenta, pozadina oznake, tekst oznake */
  --met: #2f8f63;
  --met-bg: #e3f4e9;
  --met-ink: #15583f;             /* tekst oznake; odobreno */
  --not-met: #c0533f;
  --not-met-bg: #ffebe8;
  --not-met-ink: #842e24;         /* tekst oznake; odobreno */
  --unknown: #7a879c;
  --unknown-bg: #eef1f5;
  --unknown-ink: #4f5b70;         /* tekst oznake; odobreno */

  /* režim, upozorenja, čekanje */
  --demo-ink: #6d4a0b;
  --demo-bg: #ffedc5;
  --live-ink: #244e3e;
  --live-bg: #e7f2eb;
  --pending-ink: #77520c;
  --pending-bg: #fff0cb;
  --notice-border: #d39219;
  --notice-bg: #fff6e3;
  --notice-ink: #5e481e;

  /* senka: jedna jedina */
  --shadow-panel: 0 5px 20px rgb(22 66 48 / 4%);

  /* tipografija */
  --font-sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: ui-monospace, "Cascadia Mono", Consolas, monospace;

  /* oblik */
  --radius-control: 0.65rem;
  --radius-card: 0.75rem;
  --radius-panel: 1rem;
  --radius-pill: 999px;

  /* razmaci */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;
  --space-7: 2.5rem;
}
```

Indikator fokusa: `outline: 3px solid var(--focus); outline-offset: 3px;` (ista širina i odmak kao danas, samo tamnija boja).

**Ivica polja za unos**: stara vrednost `#aebfb5` ima kontrast 1,92 prema beloj, ispod praga 3 za granice kontrola (WCAG 1.4.11). Nova vrednost `#6f877b` ima 3,87. Vlasnik Uloge A je odobrio izmenu 2026-11-10.

### 5.3 Boje i ikone statusa (sa izmerenim kontrastom)

Boja nikad nije jedini signal: svaki status ima tekst i znak.

| Status kriterijuma | Znak | Kratka oznaka | Napomena uz oznaku | Tekst / pozadina oznake | Kontrast | Bočna linija i segment | Kontrast (ne-tekst) |
|---|---|---|---|---|---|---|---|
| `met` | ✓ | Ispunjen | prema dostupnim podacima | `--met-ink` / `--met-bg` | 7,35 | `--met` | 4,02 na beloj; 3,44 na stazi |
| `not_met` | ✕ | Nije ispunjen | prema dostupnim podacima | `--not-met-ink` / `--not-met-bg` | 7,63 | `--not-met` | 4,62; 3,95 |
| `unknown` | ? | Nepoznato | potrebna je dopuna ili ručna provera | `--unknown-ink` / `--unknown-bg` | 6,05 | `--unknown` | 3,64; 3,11 |

| Ishod studije | Oznaka | Tekst / pozadina | Kontrast |
|---|---|---|---|
| `candidate` | Kandidat za dalju proveru | `--met-ink` / `--met-bg` | 7,35 |
| `pending` | Čeka dopunu podataka | `--pending-ink` / `--pending-bg` | 6,20 |
| `excluded` | Ne ispunjava kriterijume | `--not-met-ink` / `--not-met-bg` | 7,63 |

| Ostalo | Tekst / pozadina | Kontrast |
|---|---|---|
| Oznaka „DEMO REŽIM“ | `--demo-ink` / `--demo-bg` | 6,90 |
| Oznaka „STVARNI MODEL“ | `--live-ink` / `--live-bg` | 8,19 |
| Upozorenje | `--notice-ink` / `--notice-bg` | 8,07 |
| Panel greške | `--not-met-ink` / `--not-met-bg` | 7,63 |
| Red obrade | `--ink-muted` na `--live-bg` (tekst sa prelivom do `--ink`) | 5,41 |
| Glavni tekst na pozadini | `--ink` / `--bg` | 12,26 |
| Prigušen tekst | `--ink-muted` / `--surface` | 6,21 |
| Najtiši tekst | `--ink-subtle` / `--bg` | 4,51 |
| Mala oznaka iznad naslova | `--ink-eyebrow` / `--surface` | 5,55 |
| Citat | `--ink-quote` / `--surface` | 9,02 |
| Primarno dugme | `--on-accent` / `--accent` | 6,13 |
| Indikator fokusa | `--focus` na `--bg` / `--surface` / `--notice-bg` / `--met-bg` | 4,55 / 4,87 / 4,53 / 4,26 |
| Ivica polja za unos (ne-tekst) | `--border-input` / `--surface` | 3,87 |

Znakovi su tekst (`aria-hidden="true"`), ne slike. Ishod studije nema znak, da ne deluje kao presuda.

### 5.4 Tipografija i razmaci

| Uloga | Veličina / prored | Težina | Ostalo |
|---|---|---|---|
| Naslov stranice (`h1`) | `clamp(2rem, 6vw, 3.2rem)` / 1,08 | 800 | razmak slova −0,04em (kao danas) |
| Naslov panela (`h2`) | 1,35rem / 1,25 | 800 | |
| Naslov odeljka i studije (`h3`) | 1,1rem / 1,3 | 700 | |
| Tekst | 1rem / 1,6 | 400 | najviše 68 znakova u redu za objašnjenje (`max-width: 68ch`) |
| Sitan tekst (podnožje, napomene, izvor) | 0,85rem / 1,5 | 400 | |
| Mala oznaka iznad naslova, oznake režima i ishoda | 0,75rem | 800 | velika slova; razmak slova 0,08em (oznaka iznad naslova), 0,04em (oznake) |
| Oznaka statusa kriterijuma | 0,8rem | 700 | bez velikih slova |
| Izmerene vrednosti, jedinice, identifikatori studije i izvora | 0,95em od okoline | 500 | `font-family: var(--font-mono)`; `font-variant-numeric: tabular-nums` |

Razmaci: samo vrednosti `--space-1` do `--space-7`. Između panela `--space-4`; unutar panela `clamp(1rem, 4vw, 1.5rem)`; između redova kriterijuma `--space-3`; između kartica studija `--space-4`.

Dugački tekst: `overflow-wrap: anywhere` na naslovu studije, citatu, identifikatorima, oznaci modela i izvornom tekstu profila.

### 5.5 Komponente

Jedna komponenta, jedna datoteka u `apps/web/src/components/`. Svi tekstovi dolaze iz `copy.ts` (odeljak 6). `busy` znači da je zahtev u toku.

| Komponenta | Ulaz (props) | Struktura i ponašanje |
|---|---|---|
| `SiteHeader` | `meta: Meta \| null` | `<header class="site-header">`: levo veza marke (kao danas), desno `ModeBadge`. |
| `ModeBadge` | `meta: Meta \| null` | `modeBadge(meta)` vraća `null`: ne prikazuje se ništa. Demo: `<span class="mode-badge mode-demo">` sa pulsirajućom tačkom, skrivenim prefiksom „Režim rada: “ i tekstom „DEMO REŽIM“. Stvarni: `<span class="mode-badge mode-live">` sa tačkom, prefiksom, tekstom „STVARNI MODEL“ i, ako postoji, `<span class="mono mode-model">{modelId}</span>`. |
| `SafetyNotice` | `demoMode: boolean` | `<aside class="safety-notice" aria-label="Važno medicinsko upozorenje">`. Uvek prikazano, bez dugmeta za skupljanje. Kada je `demoMode` tačno, dodaje se rečenica o sintetičkim studijama. |
| `ProfileForm` | `text`, `onTextChange`, `onSubmit`, `busy`, `canStartOver`, `onStartOver`, `textareaRef`, `children` | Panel sa `h2`, oznakom i poljem `#profile-text` (bez `maxLength`, `aria-describedby="profile-hint"`, `aria-invalid` kada je greška). Ispod polja red `#profile-hint` (`aria-live="polite"`) sa jednim od četiri teksta (data-model.md, odeljak 3). Podnožje obrasca: levo brojač, desno „Počni iznova“ (`.secondary-button`, samo kada je `canStartOver`, onemogućeno kada je `busy`) i „Proveri kriterijume“ (`type="submit"`, onemogućeno kada unos nije ispravan ili je `busy`). Mesto za `VoiceInput` je između polja i reda sa savetom. |
| `ProcessingStatus` | `slow: boolean` | `<div class="state-message" role="status">`: `<span class="shimmer-text">Provera je u toku…</span>`; kada je `slow`, drugi red sa tekstom o trajanju. Bez tačke i bez spinera. |
| `ErrorPanel` | `error: UiError`, `hasPreviousResult: boolean`, `busy`, `onRetry`, `onStartOver`, `panelRef` | `<section class="error-panel" role="alert" tabIndex={-1}>`: `h2` naslov, pasus teksta, red sa savetom po radnji, opciono „Poruka servera: …“, opciono „Ispod je poslednji potvrđeni rezultat ove provere.“, zatim dugmad po radnji (tabela u 5.6). |
| `ResultPanel` | `result`, `isHypothesis`, `stale`, `showSaved`, `sourceText`, `hypothesisText`, `busy`, `resultSeq`, `headingRef`, `clarificationRef`, `onAnswer`, `onHypothesis` | `<section class="panel results-panel" aria-labelledby="results-heading">`, uz `inert` i klasu `is-stale` kada je `stale`. Redosled sadržaja: traka zastarelosti, `SavedNotice`, traka hipoteze, zaglavlje (mala oznaka i `h2#results-heading` sa `tabIndex={-1}`), tekst ishoda, `ProfileCard`, `TrialOverview`, lista `TrialCard`, `ClarificationForm`, `HypothesisForm`, `ResultMeta`. |
| `ProfileCard` | `profile`, `derived`, `sourceText` | `<section class="profile-card" aria-labelledby="profile-card-heading">`: `h3`; „Izvorni tekst“ i tekst u `<p class="source-text">`; lista oznaka „Prepoznato iz teksta“ (`<ul class="chip-list">`, svaka oznaka `<li class="chip">` sa nazivom i vrednošću u `.mono`, uz sufiks „iz dopune“ ili „hipotetički“ po poreklu); lista „Izračunato“ (`<li class="chip chip-derived">` sa isprekidanim okvirom i sufiksom „izračunao kod“), ispod nje sitan red po vrednosti „{formula}. Izvor: {izvor}“; red „Nije uneto“ sa prigušenim oznakama; red „Nejasno u unosu“ kada postoji. |
| `TrialOverview` | `trials: TrialResult[]` | Samo kada je više od jedne studije. `<nav class="trial-overview" aria-labelledby="overview-heading">`: `h3`, red sa brojem, `<ol>` u redosledu servera. Svaki red je `<a href="#trial-N">` sa identifikatorom (`.mono`), oznakom ishoda i sažetkom. Klik premešta fokus na naslov te studije. |
| `TrialCard` | `trial`, `index` | `<motion.article class="trial-card" id="trial-N">`: zaglavlje (identifikator kao mala oznaka u `.mono`, `h3` sa `tabIndex={-1}` i `id="trial-N-title"`, oznaka ishoda `.status-tag.verdict-*`); red sa vezom ka registru kada `trialRegistryUrl` nije `null`; `CriteriaSummaryBar`; `<ul class="criteria-list">` sa `CriterionRow`; poruka kada nema kriterijuma. |
| `CriterionRow` | `criterion: CriterionResult` | `<li class="criterion criterion-{status}">` sa dve celine. Prva: oznaka statusa (`.status-pill.status-{status}`: znak i kratka oznaka), napomena, tekst uslova, red dokaza „Vrednost: {vrednost} · Izvor: {sourceId}“ (vrednost i izvor u `.mono`; „nije uneto“ prigušeno i bez `.mono`). Druga: `<blockquote><q>{citat}</q></blockquote>`. Element `q` se zadržava jer ga postojeći test traži. |
| `ClarificationForm` | `question`, `busy`, `onAnswer(text)`, `headingRef` | `<form class="follow-up">`: `h3` „Potrebna dopuna“ (`tabIndex={-1}`); `<label for="answer">{pitanje}</label>`; ako ima opcija: `<div class="answer-options" role="group" aria-label="Ponuđeni odgovori">` sa dugmadima (`type="button"`, `aria-pressed`), jedan klik odmah zove `onAnswer(opcija)`; savet; polje `#answer`; „Pošalji dopunu“ šalje slobodan tekst, onemogućeno za prazan tekst ili `busy`. |
| `HypothesisForm` | `busy`, `onSubmit(text)` | `<form class="follow-up hypothesis">` sa isprekidanim okvirom i pozadinom `--bg`: `h3` „Šta ako?“, oznaka, polje `#hypothesis` (`maxLength={4000}`), „Ponovi proveru“, napomena. Polje se prazni posle uspešnog odgovora. |
| `ResultMeta` | `meta: Meta` | `<footer class="result-meta">` sa zasebnim elementima `span` (bez srednje tačke): verzija skupa; datum snimka kada postoji; u demo režimu „DEMO režim — bez poziva stvarnom modelu“, u stvarnom „Stvarni model: {modelId}“. |
| `VoiceInput` | `onTranscript(text)`, `disabled` | Bez podrške pregledača ne prikazuje ništa. Inače dugme „Diktiraj“ / „Zaustavi diktiranje“ (natpis nosi stanje, bez `aria-pressed`; izgled slušanja daje klasa `voice-listening`), napomena o obradi zvuka i statusni red (`role="status"`). Kada `disabled` postane `true`, diktat se prekida i kasni rezultat se odbacuje; `App` menja ključ kontrole pri „Počni iznova“ (T253). |

Postojeće komponente u `motion/` ostaju. `SavedNotice` i `CriteriaSummaryBar` se ne menjaju.

### 5.6 Raspored po stanju, telefon i desktop

Stalni elementi u svakom stanju, odozgo nadole: zaglavlje, uvod, upozorenje, panel za unos, podnožje stranice. Širina sadržaja `min(100% - 2rem, 920px)`. Prelomne tačke: 560 px i 720 px.

| # | Stanje | Šta se vidi ispod panela za unos | Telefon (ispod 560 px) | Desktop |
|---|---|---|---|---|
| 1 | Početno | Ništa. Nema oznake režima. | Brojač iznad dugmeta, dugme pune širine. | Brojač levo, dugme desno. |
| 2 | Greška validacije | Ništa novo; red sa savetom je u boji greške, polje ima `aria-invalid`. | Isto. | Isto. |
| 3 | Obrada | Red „Provera je u toku…“. Posle 5 s drugi red. Kod dopune i hipoteze prethodni rezultat ostaje ispod, zatamnjen, sa trakom. | Isto. | Isto. |
| 4 | Rezultat `ok` | Panel rezultata: zaglavlje, objašnjenje, kartica profila, pregled studija, studije, „Šta ako?“, podnožje. | Zaglavlje studije u koloni: identifikator, naslov, oznaka ishoda. Kartica studije bez okvira, sa linijom iznad. Red kriterijuma u jednoj koloni. | Naslov levo, oznaka ishoda desno. Od 720 px red kriterijuma ima dve kolone: status, uslov i vrednost levo; citat desno. |
| 5 | Pitanje | Panel rezultata sa karticom profila, studijama koje su već procenjene (ako ih ima) i obrascem dopune. Fokus na „Potrebna dopuna“. | Dugmad opcija se prelamaju; polje i dugme pune širine. | Dugmad u redu. |
| 6 | Potvrda nastavka | Na vrhu panela rezultata potvrda sa kvačicom. | Isto. | Isto. |
| 7 | Bez odgovarajuće studije | Naslov, dva pasusa objašnjenja, obrazloženje sistema, kartica profila, „Šta ako?“, podnožje. Nijedna studija. | Isto. | Isto. |
| 8 | Van izvora | Naslov, pasus, obrazloženje sistema, podnožje. Bez kartice profila ako je `profile` `null`. | Isto. | Isto. |
| 9 | Odbijeno | Naslov, objašnjenje granice, šta alat može, obrazloženje sistema, podnožje. Bez kartice profila i bez „Šta ako?“. | Isto. | Isto. |
| 10 | Servisna greška, može se ponoviti | Panel greške: naslov, tekst, „Pokušajte ponovo.“, dugmad „Pokušaj ponovo“ i „Počni iznova“. | Dugmad jedno ispod drugog, pune širine. | Dugmad u redu. |
| 11 | Istek vremena | Panel greške sa naslovom „Servis nije odgovorio na vreme“. | Kao 10. | Kao 10. |
| 12 | Previše zahteva | Panel greške sa odbrojavanjem; „Pokušaj ponovo“ onemogućeno do isteka. | Kao 10. | Kao 10. |
| 13 | Greška koja se ne može ponoviti | Panel greške. Za radnju „ispravi“: bez dugmadi, prethodni rezultat ispod kada postoji. Za radnju „počni iznova“: jedno dugme. | Kao 10. | Kao 10. |
| 14 | Mrežna ili HTTP greška | Panel greške sa „Pokušaj ponovo“; kod dopune i hipoteze prethodni rezultat ispod. | Kao 10. | Kao 10. |
| 15 | Rezultat hipoteze | Kao 4, uz traku „Hipotetička izmena. Ovo nije izvorni profil.“, tekst izmene i malu oznaku „Rezultat hipotetičke izmene“; izmenjene vrednosti u kartici profila nose sufiks „hipotetički“. | Kao 4. | Kao 4. |
| 16 | Posle „Počni iznova“ | Kao 1; fokus u polju za unos. | Kao 1. | Kao 1. |

Dugmad u panelu greške po radnji:

| Radnja | Dugmad |
|---|---|
| `retry` | „Pokušaj ponovo“ (primarno), „Počni iznova“ (sekundarno) |
| `wait_retry` | isto; „Pokušaj ponovo“ onemogućeno dok odbrojavanje ne dođe do nule |
| `edit` | bez dugmadi |
| `restart` | „Počni iznova“ (primarno) |

Pravila rasporeda na 320 px: `body { min-width: 320px }` ostaje; nijedan element nema fiksnu širinu veću od 288 px; dugi tekst se prelama; liste oznaka se prelamaju (`flex-wrap: wrap`); oznaka režima prelazi ispod marke kada ne staje.

### 5.7 Pokret

| Element | Pokret | Razlog | Izvor |
|---|---|---|---|
| Oznaka režima | spora pulsirajuća tačka | saopštava da je režim živ podatak iz odgovora | CSS `.pulse-dot` (postoji) |
| Red obrade | prelivajući tekst | obrada traje | CSS `.shimmer-text` (postoji) |
| Panel rezultata i panel greške | ulazak (`enter`) | novo stanje | `motion-presets.ts` |
| Kartice studija | ulazak sa kašnjenjem `min(indeks, 8) × 0,04 s` | redosled; ograničeno da poslednja ne kasni | `fadeUp` uz `transition` po kartici |
| Sažetak i traka | brojač i širenje segmenata | odnos statusa | postoji |
| Ponuđeni odgovor | pritisak i trajno označen izbor | potvrda izbora | `pressable` (postoji) |
| Potvrda dopune | iscrtavanje kvačice | ista provera je nastavljena | postoji |
| Zastareo rezultat | CSS prelaz providnosti 0,2 s | rezultat više nije trenutni | CSS |

Pravila: redovi kriterijuma, redovi pregleda studija i oznake profila se ne animiraju pojedinačno (uklanjaju se `variants` sa `li` u listi kriterijuma). Roditeljski `staggerList` na listi studija se uklanja; kašnjenje se računa po kartici. Pojedinačni prelazi stanja traju najviše 0,6 s. Postojeće ponavljajuće CSS animacije su izuzeci: tačka režima ima ciklus 2 s, a preliv teksta obrade 2,2 s; obe prestaju uz smanjen pokret i ne odlažu sadržaj. `MotionConfig reducedMotion="user"` ostaje oko cele aplikacije. Sve CSS animacije i prelazi su isključeni u `@media (prefers-reduced-motion: reduce)`. `docs/ui-motion.md` se ažurira istim zadatkom koji menja pokret.

### 5.8 Pristupačnost

- Živa oblast: `<div class="results-region" aria-live="polite">` je uvek u DOM-u i sadrži panel rezultata. Red obrade i potvrda dopune imaju `role="status"`. Panel greške ima `role="alert"`.
- Fokus posle koraka: nova greška → panel greške; pitanje → naslov „Potrebna dopuna“; ostali rezultati → naslov rezultata; „Počni iznova“ → polje za unos; klik u pregledu studija → naslov te studije. Izvodi se jednim `useEffect` u `App.tsx` koji zavisi od `focusToken`.
- Zastareo rezultat ima `inert`, pa nije dostupan tastaturi ni čitaču dok obrada traje.
- Svaka kontrola ima vidljiv tekst kao naziv. Nazivi koje testovi koriste ostaju: „Opis profila ili pitanje“, „Proveri kriterijume“, „Pošalji dopunu“, „Ponovi proveru“, „Unesite samo hipotetičku izmenu profila“ i dugmad opcija sa tekstom opcije.
- Veza ka registru ima skriveni dodatak „(otvara se u novoj kartici)“.
- Odbrojavanje je `aria-hidden`; čitač dobija jednu rečenicu sa početnim vremenom.
- Animirani broj je `aria-hidden`; pun tekst sažetka je u skrivenom elementu (postoji).

## 6. Tekstovi interfejsa (`apps/web/src/copy.ts`)

Ovo je ceo sadržaj tekstova. Implementacija ih prepisuje doslovno i ne dodaje nove.

```ts
export const MAX_INPUT_CHARS = 4000;
export const REQUEST_TIMEOUT_MS = 70000;
export const SLOW_NOTICE_MS = 5000;
export const DEFAULT_RETRY_AFTER_SECONDS = 60;
export const SPEECH_LANGUAGE = "sr-RS";

export const copy = {
  documentTitle: "TrialMatch",
  brand: { name: "TrialMatch", homeLabel: "TrialMatch početna stranica" },

  mode: {
    srPrefix: "Režim rada: ",
    demo: "DEMO REŽIM",
    live: "STVARNI MODEL",
  },

  intro: {
    eyebrow: "Preliminarna provera kriterijuma",
    title: "Uporedite sintetički profil sa studijama",
    lead: "Unesite samo izmišljene podatke. Rezultat prikazuje dokaze i nepoznanice za pregled zdravstvenog radnika.",
  },

  safety: {
    label: "Važno medicinsko upozorenje",
    strong: "Važno:",
    body: "TrialMatch ne postavlja dijagnozu, ne preporučuje lečenje i ne odlučuje o uključivanju u studiju. Jezički model čita pravila i objašnjava rezultat. Odluku donosi deterministički kod. Konačnu odluku uvek donosi lekar. Unosite isključivo sintetičke (izmišljene) profile; ne unosite stvarne podatke pacijenata.",
    demo: "U demo režimu i studije su sintetički primeri.",
  },

  form: {
    heading: "Sintetički profil ili pitanje o studiji",
    label: "Opis profila ili pitanje",
    placeholder: "Primer: Muškarac, 62 godine, dijabetes tip 2, HbA1c 8,1%, kreatinin 1,3 mg/dL, visina 178 cm, težina 92 kg.",
    hint: "Ne unosite stvarne podatke pacijenata.",
    hintEmpty: "Unesite opis profila ili pitanje da biste pokrenuli proveru. Ne unosite stvarne podatke pacijenata.",
    errorEmpty: "Polje je prazno. Unesite opis profila ili pitanje.",
    errorTooLong: (over: number) => `Unos je duži od 4000 znakova za ${over}. Skratite opis da biste pokrenuli proveru.`,
    counter: (length: number) => `${length}/4000 znakova`,
    submit: "Proveri kriterijume",
    startOver: "Počni iznova",
  },

  voice: {
    start: "Diktiraj",
    stop: "Zaustavi diktiranje",
    note: "Diktiranje koristi prepoznavanje govora vašeg pregledača, koji zvuk može obrađivati na svom servisu. Diktirajte samo sintetičke podatke.",
    listening: "Slušam. Govorite sada.",
    added: "Tekst je dodat u polje. Proverite ga i ispravite pre slanja.",
    noSpeech: "Govor nije prepoznat. Pokušajte ponovo ili unesite tekst.",
    denied: "Pristup mikrofonu nije dozvoljen. Unos tekstom radi kao i do sada.",
    failed: "Diktiranje nije uspelo. Unos tekstom radi kao i do sada.",
  },

  processing: {
    line: "Provera je u toku…",
    slow: "Provera sa stvarnim modelom može trajati do jednog minuta. Zahtev je poslat jednom i ne treba ga ponavljati.",
    stale: "Prethodni rezultat. Nova provera je u toku.",
  },

  result: {
    eyebrow: "Rezultat provere",
    eyebrowHypothesis: "Rezultat hipotetičke izmene",
    headingOk: "Preliminarna provera završena",
    headingClarification: "Potrebna je dopuna",
    headingNoMatch: "Nijedna studija iz skupa ne odgovara profilu",
    headingNotInSources: "Tražena informacija nije u dostupnim izvorima",
    headingRejected: "Zahtev nije podržan",
    noMatchBody: "Prema unetim podacima profil ne ispunjava kriterijume nijedne studije iz dostupnog skupa. TrialMatch ne predlaže studije van tog skupa i ne nagađa.",
    noMatchDetail: "Razlozi po studiji trenutno nisu deo odgovora.",
    notInSourcesBody: "Odgovor na ovo pitanje ne nalazi se u dostupnim izvorima studija. TrialMatch ne odgovara iz opšteg znanja.",
    rejectedBody: "TrialMatch ne postavlja dijagnozu, ne daje savet o lečenju i ne odlučuje o uključivanju u studiju.",
    rejectedNext: "Može da uporedi sintetički profil sa kriterijumima studija i da pokaže na kojim se podacima i izvorima to poređenje zasniva. Unesite sintetički profil ili pitanje o kriterijumima studije.",
    systemExplanation: "Obrazloženje sistema:",
    hypothesisBanner: "Hipotetička izmena. Ovo nije izvorni profil.",
    hypothesisChange: (text: string) => `Izmena: „${text}“`,
  },

  profile: {
    heading: "Prepoznati podaci iz unosa",
    sourceLabel: "Izvorni tekst",
    extractedLabel: "Prepoznato iz teksta",
    noneExtracted: "Iz teksta nije prepoznata nijedna vrednost profila.",
    derivedLabel: "Izračunato",
    derivedSuffix: "izračunao kod",
    formula: (name: string, source: string) => `${name}. Izvor: ${source}`,
    missingLabel: "Nije uneto",
    ambiguousLabel: "Nejasno u unosu",
    originAnswer: "iz dopune",
    originHypothesis: "hipotetički",
    fields: {
      age: "starost",
      sex: "pol",
      hba1c: "HbA1c",
      creatinine: "kreatinin",
      height: "visina",
      weight: "težina",
      insulin_last_3_months: "upotreba insulina",
      medications: "terapije",
      stated_diagnoses: "navedena dijagnoza",
      egfr: "eGFR",
      bmi: "BMI",
    },
    sexMale: "M",
    sexFemale: "Ž",
  },

  overview: {
    heading: "Pregled studija",
    count: (total: number) => `Broj studija: ${total}. Redosled je odredio deterministički kod.`,
  },

  trial: {
    registryLink: (trialId: string) => `Otvori ${trialId} na ClinicalTrials.gov`,
    newTab: "(otvara se u novoj kartici)",
    noCriteria: "Kriterijumi ove studije nisu dostupni u odgovoru.",
    recruitment: "Status regrutacije:",
    phase: "Faza:",
    verdict: {
      candidate: "Kandidat za dalju proveru",
      pending: "Čeka dopunu podataka",
      excluded: "Ne ispunjava kriterijume",
    },
  },

  criterion: {
    short: { met: "Ispunjen", not_met: "Nije ispunjen", unknown: "Nepoznato" },
    note: {
      met: "prema dostupnim podacima",
      not_met: "prema dostupnim podacima",
      unknown: "potrebna je dopuna ili ručna provera",
    },
    icon: { met: "✓", not_met: "✕", unknown: "?" },
    value: "Vrednost:",
    source: "Izvor:",
    missing: "nije uneto",
    computed: "izračunao kod",
    yes: "da",
    no: "ne",
    male: "muški",
    female: "ženski",
  },

  clarify: {
    heading: "Potrebna dopuna",
    optionsLabel: "Ponuđeni odgovori",
    hint: "Izaberite ponuđeni odgovor ili upišite svoj.",
    submit: "Pošalji dopunu",
  },

  hypothesis: {
    heading: "Šta ako?",
    label: "Unesite samo hipotetičku izmenu profila",
    placeholder: "Na primer: A šta ako je HbA1c 9,0%?",
    submit: "Ponovi proveru",
    note: "Izmena se proverava u okviru iste provere i ne menja izvorni profil.",
  },

  meta: {
    dataVersion: (version: string) => `Skup podataka: ${version}`,
    snapshot: (date: string) => `Datum snimka: ${date}`,
    demo: "DEMO režim — bez poziva stvarnom modelu",
    live: (modelId: string) => `Stvarni model: ${modelId}`,
    liveNoId: "Stvarni model",
  },

  footer: { note: "Sintetički profili · Nije medicinski savet" },

  errors: {
    network: {
      title: "Server nije dostupan",
      body: "Zahtev nije stigao do servera ili odgovor nije stigao nazad. Proverite internet vezu.",
    },
    client_timeout: {
      title: "Servis nije odgovorio na vreme",
      body: "Odgovor nije stigao u predviđenom roku. Rezultat nije izračunat.",
    },
    model_timeout: {
      title: "Servis nije odgovorio na vreme",
      body: "Jezički model nije odgovorio u predviđenom roku. Rezultat nije izračunat i nijedna studija nije ocenjena.",
    },
    bad_response: {
      title: "Odgovor servera nije čitljiv",
      body: "Server je vratio odgovor koji aplikacija ne može da pročita. Rezultat nije prikazan.",
    },
    invalid_response: {
      title: "Odgovor servera nije u očekivanom obliku",
      body: "Odgovor nije prošao proveru formata, pa nije prikazan ni delimično.",
    },
    rate_limited: {
      title: "Poslato je previše zahteva",
      body: "Server ograničava broj zahteva u minuti po korisniku. Ovo nije greška modela i provera nije izgubljena.",
    },
    service: {
      title: "Provera nije završena",
      body: "Došlo je do greške u servisu tokom provere. Rezultat nije izračunat i nijedna studija nije ocenjena.",
    },
    processing_limit: {
      title: "Provera je dostigla ograničenje obrade",
      body: "Ova provera je potrošila dozvoljen broj koraka obrade. Rezultat nije izračunat.",
    },
    question_limit: {
      title: "Dostignut je najveći broj dopuna",
      body: "Broj dopuna u jednoj proveri je ograničen. U novom opisu navedite sve poznate podatke.",
    },
    input_invalid: {
      title: "Unos nije prihvaćen",
      body: "Server nije mogao da obradi uneti tekst. Proverite da li su vrednosti i jedinice jasno napisane, pa pošaljite ponovo.",
    },
    input_too_large: {
      title: "Unos je predugačak",
      body: "Tekst je duži od dozvoljene granice. Skratite ga i pošaljite ponovo.",
    },
    hypothesis_invalid: {
      title: "Hipotetička izmena nije primenjena",
      body: "Izmena nije dovoljno jasna ili nije u podržanom obliku. Sačuvana provera nije promenjena. Navedite jednu konkretnu izmenu, na primer: „A šta ako je HbA1c 9,0%?“",
    },
    hypothesis_forbidden: {
      title: "Hipotetička izmena nije primenjena",
      body: "Izmena ne može da traži dijagnozu, savet o lečenju ili odluku o uključivanju. Sačuvana provera nije promenjena.",
    },
    run_expired: {
      title: "Provera više nije dostupna",
      body: "Server više nema ovu proveru ili ona ne može da se nastavi, na primer posle ponovnog pokretanja servera.",
    },
    request_rejected: {
      title: "Zahtev nije prihvaćen",
      body: "Server je odbio zahtev.",
    },
    hintRetry: "Pokušajte ponovo.",
    hintRestart: "Počnite iznova.",
    waitSeconds: (seconds: number) => `Možete pokušati ponovo za ${seconds} s.`,
    waitDone: "Možete pokušati ponovo.",
    waitForScreenReader: (seconds: number) => `Sačekajte oko ${seconds} sekundi pre ponovnog pokušaja.`,
    previousKept: "Ispod je poslednji potvrđeni rezultat ove provere.",
    serverMessage: "Poruka servera:",
    retry: "Pokušaj ponovo",
    startOver: "Počni iznova",
  },
} as const;
```

Tekstovi koji ostaju u postojećim datotekama i ne menjaju se: „Odgovor je sačuvan · ista provera je nastavljena“ (`motion/SavedNotice.tsx`), oznake iz `summarizeCriteria` i `criterionStatusLabel` (`result-view-model.ts`).

Tekstovi koji se čekaju od drugih uloga (uz zadatke označene kao blokirane):

| Vrednost registra | Tekst | | Vrednost registra | Tekst |
|---|---|---|---|---|
| `RECRUITING` | regrutuje učesnike | | `EARLY_PHASE1` | rana faza 1 |
| `NOT_YET_RECRUITING` | još ne regrutuje | | `PHASE1` | faza 1 |
| `ACTIVE_NOT_RECRUITING` | aktivna, ne regrutuje | | `PHASE1/PHASE2` | faza 1/2 |
| `ENROLLING_BY_INVITATION` | uključivanje po pozivu | | `PHASE2` | faza 2 |
| `COMPLETED` | završena | | `PHASE2/PHASE3` | faza 2/3 |
| `SUSPENDED` | privremeno zaustavljena | | `PHASE3` | faza 3 |
| `TERMINATED` | prekinuta | | `PHASE4` | faza 4 |
| `WITHDRAWN` | povučena | | `NA` | nije primenljivo |
| `UNKNOWN` | status nije poznat | | | |

Vrednost koje nema u tabeli prikazuje se doslovno, u `.mono`, kao izvorni podatak registra. Tačan skup vrednosti potvrđuje Uloga C (REQ-C2); nije proveren.

## 7. Ponašanje koje nije vidljivo iz tabele komponenti

1. **Slanje**: `App.tsx` ima jednu funkciju `send(request)`: otpremi `submit`, pozove `postJson`, pa otpremi `succeeded` ili `failed`. Ako je `phase === "processing"`, funkcija se odmah vraća.
2. **Jedan klik**: klik na opciju zove `send` sa `kind: "answer"` i `body: { answer: opcija }`. Izabrana opcija ostaje `aria-pressed="true"` dok je rezultat zastareo.
3. **Pokušaj ponovo**: zove `send(state.lastRequest)`.
4. **Počni iznova**: otpremi `reset`, isprazni tekst profila, odgovora i hipoteze, vrati `touched` na `false`.
5. **Spora obrada**: `useSlowNotice(busy)` vraća `true` posle `SLOW_NOTICE_MS` neprekidne obrade i `false` čim obrada prestane.
6. **Odbrojavanje**: `useCountdown(seconds)` smanjuje vrednost svake sekunde do nule; koristi `setInterval` i čisti ga pri uklanjanju komponente.
7. **Naslov dokumenta**: `apps/web/index.html` dobija `<title>TrialMatch</title>`.
8. **Podnožje stranice**: jedan red „Sintetički profili · Nije medicinski savet“; red sa verzijom skupa i datumom se uklanja.
9. **Adresa servisa**: `client.ts` čita `import.meta.env.VITE_API_BASE_URL` kao `unknown`, prihvata samo tekst i uklanja završnu kosu crtu; sve ostalo znači praznu osnovu (ista adresa).

## 8. Testovi

Svi testovi su offline. Komande provere: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`.

| Datoteka | Šta dokazuje | AC |
|---|---|---|
| `test/helpers/responses.ts` | Nije test: graditelji `metaOf`, `okResponse`, `clarificationResponse`, `noMatchResponse`, `notInSourcesResponse`, `rejectedResponse`, `runErrorResponse`, `httpErrorBody`, `jsonResponse`, `trialsOf(n)`. | — |
| `unit/result-view-model.test.ts` | Oznake ishoda, kratke oznake i znakovi, `formatNumber`, `formatObservedValue` (uključujući `null`, `true`, `false`, `male`), oznake profila, veza ka registru, oznaka režima, datum. | AC-01, AC-02, AC-03, AC-12 |
| `unit/ui-error.test.ts` | Svaka od 18 kategorija i svaka okolnost prenosa daje očekivanu vrstu, radnju i `runLost`; nepoznata kategorija dobija opštu poruku. | AC-07, AC-10 |
| `unit/run-state.test.ts` | Svaki prelaz iz data-model.md; drugi `submit` tokom obrade se zanemaruje; pravila za prethodni rezultat. | AC-03, AC-10 |
| `unit/client.test.ts` | Mreža, prekid, telo koje nije JSON, neispravna šema, 429 sa i bez `Retry-After`, 404, 5xx, ispravan odgovor; adresa sa `VITE_API_BASE_URL`. | AC-07, AC-10 |
| `unit/contrast.test.ts` | Čita tokene iz `styles.css` i proverava parove iz 5.3: tekst najmanje 4,5, fokus i ne-tekst najmanje 3. | AC-12 |
| `unit/copy.test.ts` | Nijedan tekst u `copy` ne sadrži interni naziv statusa, ishoda ili kategorije greške, ni reči `true`, `false`, `null`, `undefined`. | AC-12 |
| `integration/run-flow.test.tsx` | Postojeći tok, izmenjen: klik na „Ne“ odmah šalje odgovor; isti `runId`; potvrda dopune; hipoteza. | AC-03, AC-04 |
| `integration/outcomes.test.tsx` | Stanja 4, 7, 8, 9, 15 i 16; nijedna studija u stanjima 7, 8 i 9; „Počni iznova“ vraća početni ekran i fokus. | AC-01, AC-05, AC-06 |
| `integration/errors.test.tsx` | Stanja 10 do 14: poruka, dugmad, ponavljanje jednim klikom, odbrojavanje, istekla provera, prethodni rezultat posle greške hipoteze; nijedna studija se ne prikazuje kao kandidat posle greške provere. | AC-07, AC-10 |
| `integration/mode-meta.test.tsx` | Pre odgovora nema oznake režima; demo i stvarni režim; podnožje iz `meta`; upozorenje ne tvrdi da su studije sintetičke u stvarnom režimu; oznake prate poslednji odgovor. | AC-01, AC-10 |
| `integration/profile-card.test.tsx` | Oznake prepoznatih vrednosti, izvedene oznake sa „izračunao kod“, „Nije uneto“, poreklo „iz dopune“ i „hipotetički“. | AC-01, AC-02, AC-03 |
| `integration/trial-list.test.tsx` | 50 studija u redosledu servera, prikazanih za manje od 1 s; pregled studija i premeštanje fokusa; veza ka registru samo za NCT oblik, sa `rel="noopener noreferrer"`; vrednost, izvor i ceo citat po kriterijumu; poruka kada nema kriterijuma. | AC-01, AC-08 |
| `integration/processing.test.tsx` | Red obrade odmah; kontrole onemogućene; dupli klik šalje jedan zahtev; poruka posle 5 s; zastareo rezultat označen; nova provera uklanja stari rezultat. | AC-10 |
| `integration/safe-rendering.test.tsx` | HTML i skripta u objašnjenju, naslovu, citatu, pitanju, opciji i poruci greške prikazuju se doslovno; nema elementa `script` ni `img` u DOM-u; pretraga izvora ne nalazi `dangerouslySetInnerHTML` ni `innerHTML`. | AC-08, AC-09 |
| `unit/speech-recognition.test.ts` | Kuka za prepoznavanje govora sa lažnim konstruktorom: jezik `sr-RS`, prenos teksta, odbijen mikrofon, pregledač bez podrške, prekid (`cancel`) i uklanjanje bez kasnog rezultata. | AC-13 |
| `integration/voice-input.test.tsx` | Sa lažnim prepoznavanjem: tekst ulazi u polje, ništa se ne šalje; bez podrške kontrola ne postoji; odbijen mikrofon daje poruku; slanje i „Počni iznova“ prekidaju diktat; dugme nema `aria-pressed`. | AC-13 |
| `accessibility.test.tsx` | Postojeće provere, uz: uloge `status` i `alert`, živa oblast, fokus posle svakog koraka, nazivi kontrola nepromenjeni, pravila za uske ekrane i `prefers-reduced-motion` u `styles.css`, i provera da nijedno stanje, ni u demo ni u stvarnom režimu, ne prikazuje interni naziv. | AC-12 |

## 9. Dokumenta koja menja Uloga A

| Dokument | Izmena |
|---|---|
| `docs/spec.md` | Tabela „Kriterijumi prihvatanja“ dobija značenja iz odeljka 10; dodaje se AC-11 kao red i AC-13. Ostatak dokumenta se ne dira. |
| `docs/ac-coverage.md` | Novi: mapa pokrivenosti iz odeljka 11. |
| `docs/demo-script.md` | Novi: scenario iz odeljka 12. |
| `docs/ui-motion.md` | Ažurira se tabela „Gde se koristi“ prema 5.7. |
| `docs/decisions.md` | Dodaje se, na kraj, odeljak „Interfejs (funkcionalnost 002)“ sa odlukama R-05, R-07, R-08, R-09 i R-13 iz [research.md](research.md), uz odobrenje `motion` 14.6.0 iz R-16 (tim, 2026-11-10). Postojeći tekst se ne menja. |

`README.md` i `docs/evidence-map.md` pripadaju Ulozi D (REQ-D1, REQ-D2) i ne menjaju se ovim planom.

## 10. Usklađena tabela kriterijuma prihvatanja za `docs/spec.md`

Merodavni izvori: `specs/001-trialmatch-core/spec.md` (tabela AC) i `docs/project-brief.md`. Tekst redova koji zamenjuje postojeću tabelu:

| ID | Očekivano ponašanje |
|---|---|
| AC-01 | Dovoljno podataka daje `ok` sa rangiranim studijama; svaki kriterijum ima status i izvor iz dozvoljenog skupa; rezultat nije odluka o podobnosti. |
| AC-02 | Kada postoje kreatinin, starost i pol, server deterministički računa eGFR; vrednost nosi naziv formule i izvor; isti ulaz daje isti izlaz. |
| AC-03 | Nedostajuća vrednost ostaje `unknown`; postavlja se tačno jedno pitanje; profil se čuva i ista provera se nastavlja bez izmišljene vrednosti; hipotetička izmena menja samo navedena polja pod istim `runId`. |
| AC-04 | Među više nepoznanica bira se pitanje koje razrešava najviše studija, uz stabilno razrešavanje izjednačenja. |
| AC-05 | Bez podudaranja sledi `insufficient_evidence/no_matching_trial`; pitanje o činjenici van izvora daje `insufficient_evidence/not_in_sources`; nema izmišljene ponude ni odgovora iz opšteg znanja. |
| AC-06 | Zahtev za dijagnozu, savet o lečenju ili odluku o uključivanju odbija se (`rejected`) pre bilo kog poziva alata ili matchera. |
| AC-07 | Nevažeći strukturisani izlaz modela ima jedan pokušaj ispravke, zatim kontrolisanu grešku; ne stiže do procene kriterijuma. |
| AC-08 | Izvor koji nije bio dostupan u tekućoj proveri ne prikazuje se kao dokaz. |
| AC-09 | Instrukcija u tekstu studije ne menja ishod; izvršavaju se samo dozvoljene funkcije. |
| AC-10 | Istek vremena, HTTP 429 i 5xx modela imaju najviše 2 ponovna pokušaja, zatim kontrolisanu grešku sa opcijom ponovnog pokušaja; ulaz, pozivi i trajanje su ograničeni; nikada lažan uspeh. |
| AC-11 | Buduće proširenje, van osnovnog obima: nepotkrepljena navedena dijagnoza označava se „zahteva potvrdu lekara“. |
| AC-12 | Ključne kontrole imaju dostupne nazive, dostupne su tastaturom logičnim redosledom i imaju vidljiv indikator fokusa; statusi su tekstualni. |
| AC-13 | Opciono: glasovni unos popunjava polje za unos; ništa se ne šalje dok korisnik ne potvrdi tekst; bez podrške pregledača unos tekstom radi nepromenjeno. |

Ispod tabele: „AC-11 ostaje van osnovnog obima. AC-13 je opcion i definisan u `specs/002-ui-role-a/spec.md`.“

## 11. Mapa pokrivenosti AC (sadržaj za `docs/ac-coverage.md`)

| AC | Stanje interfejsa | Dokaz u interfejsu | Napomena |
|---|---|---|---|
| AC-01 | 4 (rezultat `ok`) | `integration/outcomes.test.tsx`, `integration/trial-list.test.tsx`, `integration/profile-card.test.tsx` | Rangiranje i statusi su serverski; interfejs čuva redosled. |
| AC-02 | 4, kartica profila (izvedene oznake) | `integration/profile-card.test.tsx` | Račun je serverski (`apps/server/src/derived/`); interfejs prikazuje vrednost, formulu i izvor. |
| AC-03 | 5, 6, 15 | `integration/run-flow.test.tsx`, `unit/run-state.test.ts` | Čuvanje profila je serversko; interfejs čuva `runId` i ne traži ponovo podatke. |
| AC-04 | 5 | Isključivo serversko: izbor pitanja (`apps/server/src/questions/`). | Interfejs prikazuje jedno pitanje koje dobije. |
| AC-05 | 7, 8 | `integration/outcomes.test.tsx` | |
| AC-06 | 9 | `integration/outcomes.test.tsx` | Odluka o odbijanju je serverska. |
| AC-07 | 10, 14 | `integration/errors.test.tsx`, `unit/client.test.ts` | Pokušaj ispravke izlaza modela je serverski; interfejs odbacuje neispravan odgovor. |
| AC-08 | 4 (red kriterijuma: izvor i citat) | `integration/trial-list.test.tsx`, `integration/safe-rendering.test.tsx` | Provera dozvoljenih izvora je serverska (`apps/server/src/citations/`). |
| AC-09 | 4 | `integration/safe-rendering.test.tsx` | Otpornost matchera je serverska; interfejs ne izvršava tekst studije. |
| AC-10 | 3, 10, 11, 12, 13, 14 | `integration/errors.test.tsx`, `integration/processing.test.tsx`, `unit/client.test.ts` | Ponovni pokušaji prema modelu su serverski. |
| AC-11 | Nema | Buduće proširenje, bez obaveze u interfejsu. | |
| AC-12 | Sva | `accessibility.test.tsx`, `unit/contrast.test.ts`, `unit/copy.test.ts`, ručna provera iz quickstart.md | |
| AC-13 | 1 (kontrola „Diktiraj“) | `integration/voice-input.test.tsx` | Opciono. |

## 12. Demonstracioni scenario (sadržaj za `docs/demo-script.md`)

Cilj: najviše 3 minuta, na aplikaciji u stvarnom režimu. Očekivani ishodi u stvarnom režimu potvrđuju se tek kada REQ-B5 i REQ-C1 budu isporučeni; do tada scenario važi za demo režim.

| Korak | Radnja | Unos | Očekivano | Vreme |
|---|---|---|---|---|
| 1 | Nova provera | `Muškarac, 62 godine, dijabetes tip 2, HbA1c 8,1%, kreatinin 1,3 mg/dL, visina 178 cm, težina 92 kg, na metforminu.` | Kartica profila sa oznakama i „eGFR … izračunao kod“; pitanje o insulinu. | 30 s |
| 2 | Dopuna jednim klikom | klik na „Ne“ | „Odgovor je sačuvan · ista provera je nastavljena“; studije sa sažetkom, vrednostima i citatima. | 30 s |
| 3 | „Šta ako?“ | `A šta ako je HbA1c 9,0%?` | Traka „Hipotetička izmena. Ovo nije izvorni profil.“ | 30 s |
| 4 | „Počni iznova“, bez odgovarajuće studije | `Muškarac, 82 godine, HbA1c 6,2%, kreatinin 1,1 mg/dL.` | „Nijedna studija iz skupa ne odgovara profilu“; nijedna studija nije prikazana. | 30 s |
| 5 | „Počni iznova“, odbijen zahtev | `Koju terapiju treba da uzima ovaj pacijent?` | „Zahtev nije podržan“ sa objašnjenjem granice. | 20 s |
| 6 | „Počni iznova“, greška sa ponovnim pokušajem | U alatima pregledača uključiti rad bez mreže, poslati unos iz koraka 1, zatim isključiti rad bez mreže i kliknuti „Pokušaj ponovo“. | „Server nije dostupan“, zatim isti tok kao u koraku 1. | 40 s |

Napomena u scenariju: ako korak 4 u stvarnom režimu prvo postavi pitanje, odgovoriti i nastaviti; ishod se potvrđuje pri probi.

## 13. Zavisnosti i blokade

| Deo interfejsa | Čeka | Šta se radi do tada |
|---|---|---|
| Datum snimka u podnožju | REQ-B1 | Prikazuje se samo verzija skupa. |
| Jedinica i „izračunao kod“ u redu kriterijuma | REQ-B7 | Vrednost bez jedinice i bez oznake. |
| Status regrutacije i faza | REQ-B6, REQ-C2 | Red se ne prikazuje. |
| Isključene studije za `no_matching_trial` | REQ-B3 | Samo poruka. |
| Ručna provera svih stanja u stvarnom režimu | REQ-B5, REQ-C1 | Stanja se proveravaju testovima sa `demoMode: false` i ručno u demo režimu. |
| Tokovi EV-01, EV-02, EV-05–EV-09 kroz interfejs | REQ-C1 | Ne može se izvesti. |
| Ručna provera stanja 10 i 11 na živoj aplikaciji | REQ-D4 | Pokriveno testovima interfejsa. |
| Provera javne isporuke | REQ-B8, REQ-B9 | Lokalna provera izgrađene verzije. |

Sve ostalo u ovom planu ne zavisi od drugih uloga.

## Složenost

Nema odstupanja od konstitucije koja traže obrazloženje.

| Odstupanje | Zašto je potrebno | Zašto jednostavnije rešenje nije dovoljno |
|---|---|---|
| — | — | — |
