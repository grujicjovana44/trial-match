# Istraživanje: Korisnički tok i interfejs TrialMatch (Uloga A)

**Datum**: 2026-11-10 | **Specifikacija**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Svaka odluka ima oblik: odluka, obrazloženje, razmotrene alternative. Tvrdnje o postojećem kodu navode putanju. Ono što nije provereno označeno je sa „nije provereno“.

## R-01 Revizija radne kopije (šta je već urađeno)

**Odluka**: Radna kopija je polazna osnova. Ne vraća se i ne planira se ponovo ono što već postoji.

| Stavka | Stanje | Dokaz |
|---|---|---|
| Sažetak po studiji („3 od 4 ispunjeno, 1 nepoznato“) i segmentna traka | Urađeno | `apps/web/src/result-view-model.ts` (`summarizeCriteria`), `apps/web/src/motion/CriteriaSummaryBar.tsx` |
| Potvrda „Odgovor je sačuvan · ista provera je nastavljena“ | Urađeno | `apps/web/src/motion/SavedNotice.tsx`, `apps/web/src/App.tsx:188` |
| `MotionConfig reducedMotion="user"` i gašenje CSS animacija | Urađeno | `apps/web/src/App.tsx:93`, `apps/web/src/styles.css:426` |
| Blokada duplog slanja | Urađeno | `apps/web/src/App.tsx:49` |
| Ponuđeni odgovori sa `aria-pressed` | Delimično: klik samo popunjava polje, slanje traži drugi klik | `apps/web/src/App.tsx:298` |
| Stanje obrade | Delimično: tekst postoji, ali stari rezultat ostaje prikazan kao trenutni; uz tekst stoji pulsirajuća tačka koju dizajn ne dozvoljava | `apps/web/src/App.tsx:154-165`, `:178` |
| Bezbedan prikaz teksta | Delimično: nema `dangerouslySetInnerHTML` u `apps/web/src`, ali nema testa | pretraga `apps/web/src` |
| Pristupačnost | Delimično: `aria-live`, `role="status"`, `role="alert"` postoje; nema premeštanja fokusa; kontrast ne prolazi | `apps/web/src/App.tsx:157,169,183` |
| Srpske oznake ishoda studije | Otvoreno: prikazuje se sirov `trial.verdict` i sirov `result.status` | `apps/web/src/App.tsx:196,252` |
| Kartica profila sa oznakama | Otvoreno: postoje samo lista nedostajućih polja i lista izvedenih vrednosti | `apps/web/src/App.tsx:201-231` |
| Vrednost po kriterijumu | Otvoreno: `observedValue` se ne prikazuje | `apps/web/src/App.tsx:259-273` |
| „Počni iznova“, „Pokušaj ponovo“ | Otvoreno: greška je samo tekst | `apps/web/src/App.tsx:56-61` |
| Tekstovi o režimu i skupu iz `meta` | Otvoreno: upisani su u kod | `apps/web/src/App.tsx:102-105,124-125,353,359-360`, `apps/web/index.html` (naslov „TrialMatch — DEMO“) |
| Mrežna otpornost | Otvoreno: odgovor koji nije JSON i neuspela provera šeme prikazuju sirovu poruku izuzetka | `apps/web/src/App.tsx:31-36,57-60` |
| Tokeni boja | Otvoreno: 30 doslovnih boja, nijedno CSS prilagođeno svojstvo | `apps/web/src/styles.css` |

**Alternativa**: prepisati interfejs od početka. Odbačeno: postojeći sloj pokreta i sažetak su ispravni i pokriveni testom.

## R-02 Činjenice o API-ju koje interfejs koristi

**Odluka**: Interfejs se planira prema ugovoru kakav je danas u kodu; sve što nedostaje ide u zahteve drugim ulogama ([contracts/cross-team-requests.md](contracts/cross-team-requests.md)).

- `meta` sadrži `modelId`, `promptVersion`, `schemaVersion`, `dataVersion`, `durationMs`, `modelCalls`, `toolCalls`, `tokens`, `demoMode` (`packages/shared/src/index.ts:157-169`). Datum snimka ne postoji.
- Server danas ne može da prijavi stvarni režim: `DEMO_MODE` prihvata samo `"true"` (`apps/server/src/config/index.ts`), a `demoMode: true` i `dataVersion: "synthetic-trials-v1"` su stalne vrednosti (`apps/server/src/service/trialmatch.ts:837-842`).
- Kategorije grešaka u kodu: `model_timeout`, `model_call_limit` (`apps/server/src/budget/run-budget.ts`), `tool_call_limit`, `unknown_tool`, `invalid_tool_arguments` (`apps/server/src/tools/executor.ts`), `tool_error`, `question_round_limit`, `input_too_large`, `run_not_found`, `invalid_request`, `invalid_profile`, `invalid_hypothesis`, `invalid_transition`, `forbidden_intent`, `ambiguous_hypothesis` (`apps/server/src/service/trialmatch.ts`), `rate_limit_exceeded`, `internal_error`, `internal_contract_violation` (`apps/server/src/api/app.ts`). Lista je otvorena, pa interfejs mora imati i podrazumevano ponašanje za nepoznatu kategoriju.
- Greška stiže na dva načina: (a) HTTP status 4xx/5xx sa omotačem `{status:"error", error}`; (b) HTTP 200 sa `RunResponse` čiji je `status` `error` i `stage` `failed`.
- Odbijanje zbog broja zahteva: HTTP 429, kategorija `rate_limit_exceeded`, `retryable: false`, bez zaglavlja `Retry-After` (`apps/server/src/api/app.ts:53-61`). Prozor je podesiv (`RATE_LIMIT_WINDOW_MS`, podrazumevano 60000).
- Posle odgovora `status: "error"` provera je u stanju `failed`, koje je završno (`apps/server/src/workflow/state-machine.ts`). Ponovljeni `answer` na takvu proveru vraća `invalid_transition` (`apps/server/src/service/trialmatch.ts:193-200`). Posledica je u R-07.
- `CriterionResult` ima `observedValue` (broj, logička vrednost, tekst ili `null`), ali nema jedinicu, polje na koje se odnosi ni oznaku da je vrednost izračunata (`packages/shared/src/index.ts:110-119`). Za pol stiže tekst `male` ili `female` (`apps/server/src/matcher/evaluate-criteria.ts:27`).
- `TrialResult` nema status regrutacije ni fazu; oni postoje samo u `TrialSchema` (`packages/shared/src/index.ts:89-101,121-128`).
- Pitanje može imati `options: []` (prazan niz) za polja sa slobodnim odgovorom (`apps/server/src/questions/select-next-question.ts`).
- Server ne služi izgrađeni interfejs; razvojni proxy `/api` postoji samo u Vite podešavanju (`vite.config.ts`).

## R-03 Podela `App.tsx` na komponente

**Odluka**: `App.tsx` ostaje ljuska koja drži stanje i raspored; prikaz se deli na male komponente u `apps/web/src/components/`, pozivi servera idu u `apps/web/src/api/`, stanje u `apps/web/src/state/`, a svi tekstovi u `apps/web/src/copy.ts`.

**Obrazloženje**: Zadatke izvršava jeftiniji model; jedna komponenta po zadatku smanjuje rizik i olakšava test. Tekstovi na jednom mestu omogućavaju test da se nijedan interni naziv ne pojavi u interfejsu.

**Alternative**: (a) ostaviti sve u `App.tsx`: odbačeno, datoteka bi prešla 800 redova; (b) uvesti biblioteku za stanje ili rutiranje: odbačeno (konstitucija VII, bez novih zavisnosti).

## R-04 Stanje interfejsa: `useReducer` sa čistim reduktorom

**Odluka**: Jedan reduktor u `apps/web/src/state/run-state.ts` sa fazama `idle`, `processing`, `result`, `error`. Čista funkcija, testirana bez DOM-a.

**Obrazloženje**: Šesnaest stanja iz specifikacije su kombinacije faze, odgovora i vrste greške. Čist reduktor čini pravilo „stari rezultat se ne prikazuje kao trenutni“ proverljivim jediničnim testom.

**Alternative**: više nezavisnih `useState` (današnje stanje): odbačeno, jer dozvoljava nemoguće kombinacije (greška i zastareo rezultat bez oznake).

## R-05 Prethodni rezultat tokom obrade i posle greške

**Odluka**:
- Nova provera (dugme „Proveri kriterijume“): prethodni rezultat se uklanja u trenutku slanja.
- Dopuna ili „Šta ako?“: prethodni rezultat ostaje u prikazu, ali označen kao zastareo: traka „Prethodni rezultat. Nova provera je u toku.“, smanjena vidljivost, atribut `inert` i onemogućene kontrole. Izabrani odgovor ostaje označen (`aria-pressed`).
- Greška prenosa (mreža, nečitljiv odgovor, 429, HTTP 4xx ulazne greške) posle dopune ili hipoteze: server nije promenio proveru, pa se prethodni rezultat ponovo prikazuje kao važeći, ispod poruke o grešci.
- Greška provere (`status: "error"` u odgovoru) ili istekla provera (`run_not_found`, `invalid_transition`): prethodni rezultat se uklanja.

**Obrazloženje**: Dizajn traži da izabrani odgovor bude vidljiv kao pritisnut, a specifikacija (priča 6, scenario 3) dozvoljava „označen kao zastareo ili sklonjen“. Posle ulazne greške hipoteze server izričito kaže da sačuvana provera nije promenjena, pa je prethodni rezultat i dalje tačan.

**Alternative**: uvek sakriti prethodni rezultat: odbačeno, jer korisnik posle neuspele hipoteze gubi važeći rezultat i pitanje na koje treba da odgovori.

## R-06 Mrežni sloj koji nikad ne baca izuzetak

**Odluka**: `postJson` u `apps/web/src/api/client.ts` uvek vraća `{ ok: true, response }` ili `{ ok: false, error: UiError }`. Redosled provere: (1) `fetch` uz `AbortController` i rok od 70 s; (2) `response.json()` u `try/catch`; (3) za neuspešan HTTP status `ApiErrorRequestSchema.safeParse`; (4) za uspešan `RunResponseSchema.safeParse`. Sirova poruka izuzetka se nikad ne prikazuje.

**Obrazloženje**: FR-011, FR-028 i javna isporuka. Rok od 70 s je `RUN_TIMEOUT_MS` (60 s, `apps/server/src/config/index.ts`) uvećan za rezervu, da klijent ne prekine pre servera.

**Alternative**: bez klijentskog roka: odbačeno, jer bi zahtev koji nikad ne dobije odgovor zauvek držao kontrole onemogućenim.

## R-07 „Pokušaj ponovo“

**Odluka**: „Pokušaj ponovo“ ponavlja poslednji zahtev doslovno (ista putanja i telo). Ako ponavljanje vrati `invalid_transition` ili `run_not_found`, prikazuje se stanje „Provera više nije dostupna“ sa „Počni iznova“.

**Obrazloženje**: Tako radi i sa današnjim serverom i sa serverom koji bi kasnije dozvolio nastavak. Interfejs ne nagađa koji je zahtev „ispravan“.

**Ograničenje**: Posle greške provere u dopuni ili hipotezi provera je na serveru završno neuspela, pa ponavljanje ne može da je nastavi. To je zahtev REQ-B10 Ulozi B. Za početnu proveru ponavljanje radi već sada (pokreće novu proveru).

**Alternativa**: posle greške u dopuni automatski pokrenuti novu proveru sa izvornim tekstom: odbačeno, jer bi tiho promenilo `runId` i izgubilo dopune.

## R-08 Poruka o broju zahteva i vreme čekanja

**Odluka**: Vreme čekanja se čita iz zaglavlja `Retry-After` (ceo broj sekundi). Ako ga nema ili nije ispravno, koristi se 60 s. Dugme „Pokušaj ponovo“ je onemogućeno dok odbrojavanje ne istekne. Tekst ne navodi broj dozvoljenih zahteva, jer je podesiv na serveru.

**Alternative**: stalna poruka bez odbrojavanja: odbačeno, specifikacija (priča 3, scenario 8) traži da se ponavljanje ne nudi pre isteka čekanja.

## R-09 Lista od oko 50 studija

**Odluka**: Sve studije otvorene, u redosledu servera. Iznad liste „Pregled studija“ sa vezama do svake studije. Brzina: CSS `content-visibility: auto` sa `contain-intrinsic-size` na kartici studije. Pojavljivanje: kašnjenje po kartici `min(indeks, 8) × 0,04 s`, pa poslednja kartica počinje najkasnije posle 0,32 s; redovi kriterijuma se ne animiraju pojedinačno.

**Obrazloženje**: Odgovor korisnika u razjašnjenju (opcija A). `content-visibility` ne sakriva sadržaj od pretrage na stranici ni od čitača ekrana, a ne traži biblioteku za virtuelizaciju.

**Alternative**: virtuelizovana lista: odbačeno (nova zavisnost; lomi pretragu na stranici i sidra); skupljanje isključenih studija: odbačeno odlukom korisnika.

## R-10 Veza ka ClinicalTrials.gov

**Odluka**: Adresa `https://clinicaltrials.gov/study/{NCT}` samo kada identifikator odgovara obrascu `^NCT\d{8}$`. Veza ima `target="_blank"` i `rel="noopener noreferrer"`. Identifikator se ne ubacuje u adresu ako ne odgovara obrascu.

**Obrazloženje**: Obrazac sprečava da proizvoljan tekst iz odgovora završi u adresi. Oblik adrese nije proveren pristupom mreži (AGENTS.md zabranjuje mrežni pristup); potvrđuje ga čovek pri ručnoj proveri iz [quickstart.md](quickstart.md).

## R-11 Bezbedan prikaz teksta

**Odluka**: Sav tekst iz odgovora ide kroz React kao tekstualni čvor. Zabranjeni su `dangerouslySetInnerHTML`, `innerHTML` i pretvaranje Markdown-a u HTML. Test prikazuje objašnjenje, naslov, citat, pitanje i opciju sa HTML-om i skriptom i proverava da se ništa ne izvršava; drugi test pretražuje `apps/web/src` na zabranjene nazive.

**Posledica**: Ako model vrati Markdown, korisnik vidi zvezdice i tarabe. Zato je REQ-C4: objašnjenje je običan tekst.

## R-12 Kontrast (WCAG 2.2 AA)

**Odluka**: Usvajaju se odobrene vrednosti; pozadine oznaka, bočne linije i trake se ne menjaju.

| Par | Staro | Odnos | Novo | Odnos |
|---|---|---|---|---|
| Tekst „ispunjen“ na `#e3f4e9` | `#2f8f63` | 3,51 | `#15583f` | 7,35 |
| Tekst „nije ispunjen“ na `#ffebe8` | `#c0533f` | 4,02 | `#842e24` | 7,63 |
| Tekst „nepoznato“ na `#eef1f5` | `#7a879c` | 3,21 | `#4f5b70` | 6,05 |
| Indikator fokusa na `#f5f8f6` / `#ffffff` | `#e8a52a` | 1,99 / 2,13 | `#9a6700` | 4,55 / 4,87 |

Ostali izmereni parovi koji prolaze bez izmene: glavni tekst 12,26; prigušen tekst 5,81 na pozadini i 6,21 na beloj; najtiši tekst 4,51 na pozadini i 4,82 na beloj; akcenat 6,13; beli tekst na akcentu 6,13; DEMO oznaka 6,90; oznaka „čeka dopunu“ (`#77520c` na `#fff0cb`) 6,20; bočne linije i segmenti trake 3,11 do 4,62 (ne-tekst, prag 3).

**Ivica polja za unos**: `#aebfb5` na beloj ima 1,92, ispod praga 3 za granice kontrola (WCAG 1.4.11). Usvaja se `--border-input: #6f877b` (3,87). Vlasnik Uloge A je odobrio izmenu 2026-11-10, na kapiji plana.

**Provera**: jedinični test `apps/web/test/unit/contrast.test.ts` čita tokene iz `styles.css` i računa odnose, da se kontrast ne pokvari kasnijom izmenom.

## R-13 Izgrađena verzija i adresa servisa

**Odluka**: Interfejs zove `${VITE_API_BASE_URL}/api/...`; prazna vrednost znači ista adresa. Primer ide u `apps/web/.env.example`. Lokalna provera izgrađene verzije: `pnpm build`, server iz `dist`, pa `pnpm exec vite preview`, koji koristi isti proxy `/api` kao razvojni server.

**Obrazloženje**: Vite čita `.env` iz korena projekta interfejsa (`root: "apps/web"` u `vite.config.ts`), pa primer pripada `apps/web/`. Tako Uloga A ne menja koren repozitorijuma ni server. Kako se izgrađeni interfejs služi na platformi Vercel odlučuje Uloga B (REQ-B8, REQ-B9).

**Alternativa**: dodati skriptu `preview` u korenski `package.json`: odbačeno, to je zajednička konfiguracija.

## R-14 Glasovni unos (AC-13)

**Odluka**: Ugrađeni `SpeechRecognition` (ili `webkitSpeechRecognition`), jezik `sr-RS`, bez međurezultata. Prepoznat tekst se dodaje na kraj polja za unos. Ništa se ne šalje. Bez podrške pregledača kontrola se ne prikazuje. Tipovi se opisuju lokalnim interfejsom u kuki, bez `any`.

**Obrazloženje**: Bez nove zavisnosti i bez servera. Zvuk može obrađivati servis proizvođača pregledača, pa uz kontrolu stoji napomena.

**Nije provereno**: da li `lib.dom` u TypeScript-u 5.9.3 već sadrži tip `SpeechRecognition`; zato se koristi lokalni interfejs koji radi u oba slučaja.

## R-15 Revizija prema veštini `taste`

**Odluka**: Veština je pozvana. Ona sama navodi da nije namenjena višekoračnim proizvodnim interfejsima, pa su primenjeni samo delovi koji odgovaraju: čitanje zadatka, revizija pre izmene (režim „redizajn uz očuvanje“), provere protiv šablona i završna lista. Nalazi i neslaganja su u odeljku „Dizajn-specifikacija“ u [plan.md](plan.md).

**Čitanje zadatka**: redizajn uz očuvanje jednog ekrana kliničkog alata za lekare i žiri, jezikom poverenja i gustine dokaza, uz CSS tokene, sistemski sans i uzdržan pokret. Podešavanja: raznolikost rasporeda 3, intenzitet pokreta 3, gustina 6.

## R-16 Biblioteka `motion`

**Odluka**: Koristi se `motion` 14.6.0 koji je već u radnoj kopiji (`package.json`). Ne dodaje se nijedna druga biblioteka.

**Odobrenje tima**: vlasnik Uloge A je 2026-11-10 potvrdio da tim odobrava `motion` 14.6.0 (REQ-T1). Odobrenje važi za postojeću zavisnost; T246 prenosi ovu odluku u `docs/decisions.md`. To više nije blokada implementacije.

**Obrazloženje i pregled uticaja**: biblioteka omogućava postojeće prelaze rezultata, sažetak i potvrdu dopune uz poštovanje smanjenog pokreta. Koristi se u prezentacionom sloju; ne određuje kriterijume, ne menja serverski workflow i ne dobija ključeve modela. Verzija ostaje tačno navedena u zajedničkim zavisnostima i zaključanoj datoteci; tim dobija istu verziju pri instalaciji. Plan ne dodaje novu biblioteku niti ovu odluku predstavlja kao završen bezbednosni audit zavisnosti.
