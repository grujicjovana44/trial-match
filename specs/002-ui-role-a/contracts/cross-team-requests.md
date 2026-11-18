# Zahtevi drugim ulogama (iz funkcionalnosti 002, Uloga A)

**Datum**: 2026-11-10

**Status slanja**: vlasnik Uloge A je 2026-11-10 potvrdio da su zahtevi poslati. Isporuka traženih izmena još nije potvrđena.

Uloga A ne menja `packages/shared`, server, promptove, evaluaciju ni README. Sve što interfejsu treba od tih delova stoji ovde kao zahtev. Kolona „Čeka“ kaže koji deo interfejsa ne može da se završi bez toga. „Ne blokira“ znači da interfejs radi i bez toga, uz navedeno ograničenje.

## Uloga B: serverski API, šeme, validacija, ograničenja

| ID | Šta je potrebno | Zašto | Čeka |
|---|---|---|---|
| REQ-B1 | Polje sa datumom snimka skupa u `meta` (predlog: `dataSnapshotDate`, `YYYY-MM-DD` ili `null`). | Podnožje rezultata mora prikazati datum iz odgovora, ne upisan u interfejs (FR-012). | Prikaz datuma snimka. |
| REQ-B2 | Potvrđena konačna lista kategorija grešaka, sa oznakom `retryable` za svaku, i potvrda da je `message` uvek tekst na srpskom bezbedan za prikaz korisniku. Potvrda da greške 400 i 413 na `answer` i `hypothesis` ne menjaju sačuvanu proveru. U kodu je danas 18 kategorija ([research.md](../research.md), R-02). | Interfejs bira poruku i radnju po kategoriji (FR-008–FR-010). | Ne blokira: nepoznata kategorija dobija opštu poruku. |
| REQ-B3 | Ishod `no_matching_trial` uključuje isključene studije sa razlozima. | Odluka od 2026-11-09 u specifikaciji. | Prikaz isključenih studija (za kasnije). |
| REQ-B4 | Odbijanje 429 nosi vreme čekanja (predlog: zaglavlje `Retry-After` u sekundama). | Poruka mora reći koliko sačekati (FR-027). | Ne blokira: bez zaglavlja interfejs odbrojava 60 s. |
| REQ-B5 | Stvarni režim na serveru: `DEMO_MODE` može biti `false`, a `meta.demoMode`, `meta.modelId` i `meta.dataVersion` odražavaju stvarno stanje. Danas su stalne vrednosti (`apps/server/src/config/index.ts`, `apps/server/src/service/trialmatch.ts:837-842`). | Stvarni režim je podrazumevan (FR-012). | Ručna provera svih stanja u stvarnom režimu. |
| REQ-B6 | `overallStatus` i `phase` u rezultatu po studiji (`TrialResultSchema`). Danas postoje samo u `TrialSchema`. | Status regrutacije i faza uz naslov studije (FR-025). | Prikaz statusa i faze. |
| REQ-B7 | Po kriterijumu: jedinica uočene vrednosti i oznaka da li je vrednost iz profila ili izračunata (predlog: `observedUnit`, `observedOrigin`). | Red kriterijuma mora prikazati vrednost sa jedinicom i oznaku „izračunao kod“ (FR-004, priča 1). | Jedinica i oznaka u redu kriterijuma. |
| REQ-B8 | Način na koji se izgrađeni interfejs (`dist/web`) služi uz server, i dozvola pristupa sa adrese interfejsa ako su na različitim adresama. Interfejs podržava oba slučaja preko `VITE_API_BASE_URL`. | Rad iz izgrađene verzije (FR-030, FR-034). | Proveru javne isporuke. Lokalna provera izgrađene verzije ne čeka. |
| REQ-B9 | Isporuka na platformi Vercel: provera se danas čuva u memoriji servera, a ograničenje broja zahteva koristi `request.ip`. Potrebno je čuvanje provere između zahteva, ograničenje po klijentu iza posrednika i trajanje funkcije najmanje koliko `RUN_TIMEOUT_MS`. | Bez toga dopuna i „Šta ako?“ često završavaju porukom „Provera više nije dostupna“. | Ne blokira interfejs; određuje koliko je javna verzija upotrebljiva. |
| REQ-B11 | `observedUnit` mora biti jedinica koja se može prikazati korisniku na srpskom. U Fazi 2 server za uzrast šalje „years“ (iz `unit` u pravilima studija), pa red kriterijuma prikazuje „62 years“. Predlog: „godina“ u pravilima i fixture-ima, ili dogovoren spisak jedinica koje interfejs prevodi. | FR-023: tekst za korisnika je na srpskom; jedinice poput mL/min/1.73 m² su tehničke i ostaju. | Ne blokira; određuje čitljivost reda kriterijuma. Otvoreno 2026-11-16 pri T325. |
| REQ-B10 | Ponovni pokušaj posle greške provere u dopuni ili hipotezi. Danas takva provera prelazi u završno stanje `failed`, pa ponovljen isti zahtev vraća `invalid_transition` (`apps/server/src/workflow/state-machine.ts`, `apps/server/src/service/trialmatch.ts:193-200`). Potrebno je da provera ostane nastavljiva posle greške koja se može ponoviti, ili jasno pravilo šta interfejs treba da ponovi. | AC-10 traži kontrolisanu grešku sa opcijom ponovnog pokušaja. | Ne blokira: danas „Pokušaj ponovo“ u tom slučaju vodi do „Počni iznova“. |

## Uloga C: ekstrakcija, pronalaženje, workflow, sledeće pitanje

| ID | Šta je potrebno | Zašto | Čeka |
|---|---|---|---|
| REQ-C1 | Rad sa stvarnim modelom u glavnom toku. | Tokovi EV-01, EV-02, EV-05, EV-06, EV-07, EV-08 i EV-09 moraju proći kroz interfejs. | Ručnu proveru tih tokova i demonstracioni scenario na živoj aplikaciji. |
| REQ-C2 | Stvarni snimak (oko 50 studija) sa identifikatorima registra (NCT), statusom regrutacije i fazom. | Veza ka ClinicalTrials.gov, status i faza (FR-024, FR-025). | Proveru liste od 50 studija na stvarnim podacima. |
| REQ-C3 | Citat po kriterijumu je rečenica na koju se kriterijum odnosi, ne ceo blok kriterijuma studije. | Citati se uvek prikazuju u celini (odluka iz razjašnjenja). | Ne blokira; određuje čitljivost. |
| REQ-C4 | `explanation` i tekst pitanja su običan tekst na srpskom, bez Markdown-a i HTML-a. | Interfejs prikazuje tekst doslovno (FR-017), pa bi Markdown bio vidljiv kao znakovi. | Ne blokira. |

## Uloga D: evaluacija, bezbednosni testovi, README, čist checkout

| ID | Šta je potrebno | Zašto | Čeka |
|---|---|---|---|
| REQ-D1 | Mapa dokaza (`docs/evidence-map.md`) upućuje na mapu pokrivenosti AC (`docs/ac-coverage.md`). | Sledljivost AC (FR-020). | Ne blokira. |
| REQ-D2 | README: uputstvo za pokretanje izgrađene verzije i podešavanje `VITE_API_BASE_URL`; provera iz čistog checkout-a; usklađen opis toka (ponuđeni odgovor se šalje jednim klikom, postoji „Počni iznova“, naslov više nije „DEMO“). | Priča 10; README danas opisuje tok iz Faze 1. | Ne blokira interfejs. |
| REQ-D3 | Bezbednosna provera javne isporuke: zaštita od troška poziva modela na javnoj adresi i potvrda da izgrađeni interfejs ne sadrži tajne. | Javna isporuka na platformi Vercel. | Ne blokira interfejs. |
| REQ-D4 | Ponovljiv način da se u živom okruženju izazovu istek vremena modela i servisna greška koja se može ponoviti. | Ručna provera stanja 10 i 11; u demo režimu ih interfejs ne može izazvati. | Ručnu proveru stanja 10 i 11 na živoj aplikaciji. Testovi interfejsa ih pokrivaju bez toga. |

## Tim

| ID | Šta je potrebno | Zašto |
|---|---|---|
| REQ-T1 | **Odobreno 2026-11-10**: vlasnik Uloge A je potvrdio odobrenje tima za `motion` 14.6.0. T246 prenosi odluku u `docs/decisions.md`; zapis više ne blokira prvu grupu. | Obrazloženje i pregled uticaja su u Istraživanju R-16. Odobrenje se odnosi na postojeću verziju u zajedničkim zavisnostima; nije dozvola za nove zavisnosti. |

## Zatvaranje Faze 2 (stanje 2026-11-16)

Deo Uloge A u Fazi 2 je završen (T324 i T325 zatvoreni 2026-11-16); ostaje samo T332, live UI smoke posle baseline-a. Ostali uslovi za Fazu 2 iz [project-brief](../../../docs/project-brief.md) (stvarni adapter i živo izvlačenje/objašnjenje, ručno pregledana pravila za 15–20 studija, prvi živi baseline) i za prelazak u Fazu 3 (pregled trace-a baseline-a) zavise od drugih uloga i ljudi. Uloga A ih ne radi; ovo su zahtevi.

| ID | Kome | Šta je potrebno | Zašto / dokaz |
|---|---|---|---|
| REQ-C5 | Uloga C / Uloga D (vlasnik `scripts/`) | `insidePath` u `scripts/split-trials.ts` pogrešno vraća `true` kada su putanje na različitim Windows diskovima: `path.relative("D:\Trial_Match\data\raw", "C:\...\Temp\x.json")` vraća apsolutnu putanju, koja ne počinje sa `..`. Zato `protectOutputPath` odbija upis u privremeni folder. Predlog: tretirati apsolutan rezultat `relative` kao „van“ (`isAbsolute(path)`). | Na Windows-u sa repozitorijumom na `D:` pada 13 testova u `scripts/split-trials.test.ts`, `scripts/split-draft.test.ts` i `scripts/create-rule-draft.test.ts` („Izlaz ne sme biti upisan u data/raw/.“). Na Linux CI-ju i kada su repo i `%TEMP%` na istom disku testovi prolaze. |
| REQ-D5 | Uloge B, C i D, svako za svoje datoteke | `pnpm format:check` na čistoj LF kopiji `main`-a (`4c22035`) pada na 14 datoteka: `apps/server/src/llm/mock-adapter.ts`, `apps/server/src/retrieval/retrieve.test.ts`, `scripts/compile-rules.test.ts`, pet datoteka u `data/raw/`, tri u `data/rule_sets/` i tri u `data/trials/`. Za `data/raw/` (ručno postavljen snimak koji se ne menja) predlog je dodavanje u `.prettierignore`, ne formatiranje. | Dok ova komanda ne prođe, otvoreni su 002 T201, T248 i T252 i 003 T334. `.github/workflows/ci.yml` je na `main`-u ispravljen. |
| REQ-B12 | Uloga B | Zatvoriti 003 T302–T310 sa dokazima iz uslova svakog zadatka. Kod postoji na `main`-u, ali checkboxi su otvoreni. | Uloga A je zatvorila T324, koji zavisi od T304–T309. |
| REQ-C6 | Uloga C | Zatvoriti 003 T311–T316 dokazima; odlučiti da li grana `rag` (004) ulazi u Fazu 2 ili u kasniju fazu. | Faza 2 traži stvarni adapter i živo izvlačenje/objašnjenje; nijedan živi poziv nije izvršen. |
| REQ-D6 | Uloga D i čovek-pregledač | 003 T319 (poreklo i licenca snimka), T320 (pravila za 15–20 studija; danas 2), T323 (nezavisne oznake za oko 30 kriterijuma), T336 ako se menja formula ili prag. | Ručni koraci; agent ih ne sme dopunjavati. |
| REQ-T2 | Tim | Lokalni Gemini ključ samo na serveru (T329), scope-specifično odobrenje (T330), prvi kompletan `eval:live` baseline (T331), pa T333–T335; zatim zaseban live UI smoke T332 uz Ulogu A. Popuniti vodeće članove i pregledaoce u `docs/team.md`. | Faza 3 počinje pregledom trace-a baseline-a, pa bez T331 nema prelaska. Plaćeni koraci traže izričito odobrenje. |
