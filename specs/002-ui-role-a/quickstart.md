# Vodič za proveru: Korisnički tok i interfejs TrialMatch (Uloga A)

**Datum**: 2026-11-10 | **Plan**: [plan.md](plan.md) | **Stanja**: [data-model.md](data-model.md), odeljak 1

Ovaj vodič opisuje kako se ručno proverava svako od 16 stanja interfejsa, u demo režimu i u stvarnom režimu, iz razvojne i iz izgrađene verzije. Ne sadrži kod implementacije.

Sve komande se pokreću iz korena repozitorijuma. Koriste se isključivo sintetički unosi iz ovog vodiča.

## 1. Preduslovi

- Node.js `24.22.1`, pnpm `12.16.1` (`package.json`). Na Windows-u ih pripremiti u istom PowerShell procesu komandom `. .\specs\002-ui-role-a\setup-toolchain.ps1` iz korena repozitorijuma. Skripta proverava postojeću instalaciju; ako alata nema, preuzima zvanične arhive uz proveru integriteta i instalira ih za korisnika. Lokalni `init.ps1` ne mora prethodno postojati. U novom procesu bez profila ponoviti komandu pre provera.
- Instalacija: `pnpm install --frozen-lockfile`.

## 2. Automatske provere (bez mreže i bez modela)

| Komanda | Šta potvrđuje |
|---|---|
| `pnpm typecheck` | Tipovi u celom repozitorijumu. |
| `pnpm lint` | ESLint, uključujući zabranu `any`. |
| `pnpm test` | Svi jedinični i integracioni testovi, uključujući testove interfejsa iz [plan.md](plan.md), odeljak 8. |
| `pnpm build` | Kompilacija servera i produkcijska izgradnja interfejsa u `dist/web`. |

## 3. Pokretanje

### 3.1 Razvojna verzija, demo režim (radi danas)

```sh
pnpm dev
```

Otvoriti `http://127.0.0.1:5173`. Komanda prvo izgradi projekat, zatim pokreće server na portu 3000 i Vite na portu 5173 (`scripts/dev.mjs`).

### 3.2 Server i interfejs u dva terminala (potrebno za stanja 14 i 16 posle restarta)

`pnpm dev` gasi oba procesa zajedno, pa se za provere u kojima se gasi samo server koriste dva terminala:

```sh
pnpm build
```

Terminal 1 (server):

```sh
node dist/apps/server/src/index.js
```

Terminal 2 (interfejs):

```sh
pnpm exec vite --host 127.0.0.1
```

### 3.3 Server sa izmenjenim ograničenjem (potrebno za stanje 12)

PowerShell:

```powershell
$env:RATE_LIMIT_MAX = "2"; node dist/apps/server/src/index.js
```

Bash:

```sh
RATE_LIMIT_MAX=2 node dist/apps/server/src/index.js
```

### 3.4 Izgrađena verzija (priča 10)

```sh
pnpm build
```

Terminal 1: `node dist/apps/server/src/index.js`. Terminal 2:

```sh
pnpm exec vite preview --host 127.0.0.1
```

Otvoriti adresu koju komanda ispiše (podrazumevano `http://127.0.0.1:4173`). Pregled koristi isti proxy `/api` kao razvojni server. Javna isporuka se proverava tek kada Uloga B isporuči REQ-B8 i REQ-B9.

### 3.5 Stvarni režim

**Čeka REQ-B5 i REQ-C1.** Server danas radi samo u demo režimu. Kada stvarni režim bude dostupan, Uloge B i C daju komandu i podešavanja; ovde se tada dopisuje jedan red. Do tada se ponašanje u stvarnom režimu proverava testovima interfejsa sa `demoMode: false` (`integration/mode-meta.test.tsx`).

## 4. Unosi

| Oznaka | Tekst |
|---|---|
| U1 | `Muškarac, 62 godine, dijabetes tip 2, HbA1c 8,1%, kreatinin 1,3 mg/dL, visina 178 cm, težina 92 kg, na metforminu.` |
| U2 | `Muškarac, 62 godine, dijabetes tip 2, HbA1c 8,1%, kreatinin 1,3 mg/dL, visina 178 cm, težina 92 kg, bez insulina.` |
| U3 | `Muškarac, 82 godine, HbA1c 6,2%, kreatinin 1,1 mg/dL.` |
| U4 | `Koja su neželjena dejstva leka u studiji A?` |
| U5 | `Koju terapiju treba da uzima ovaj pacijent?` |
| U6 | `Muškarac, 62 godine, HbA1c abc.` |
| H1 | `A šta ako je HbA1c 9,0%?` |
| H2 | `A šta ako je malo drugačije?` |

Ishodi ovih unosa u demo režimu provereni su 2026-11-10 pozivima na lokalni demo server: U1 daje pitanje o insulinu sa opcijama „Da“ i „Ne“ i tri već procenjene studije; odgovor „Ne“ daje `ok`; H1 daje `ok`; H2 daje grešku `ambiguous_hypothesis`; U2 daje `ok`; U3 daje `no_matching_trial`; U4 daje `not_in_sources`; U5 daje `rejected`; U6 daje grešku `invalid_profile`. U stvarnom režimu ishodi zavise od modela i potvrđuju se pri prvoj probi.

## 5. Provera 16 stanja

U svakom stanju proveriti i tri stalne stvari: (a) upozorenje „Važno: …“ je vidljivo; (b) nigde nema internih naziva (`ok`, `needs_clarification`, `candidate`, `true`, `false` i sličnih); (c) nema vodoravnog pomeranja na širini 320 px.

| # | Stanje | Kako ga izazvati (demo režim) | Šta mora da se vidi | U stvarnom režimu se razlikuje |
|---|---|---|---|---|
| 1 | Početno | Otvoriti stranicu. | Prazno polje, „0/4000 znakova“, savet ispod polja, dugme onemogućeno. Nema oznake režima. Naslov kartice pregledača je „TrialMatch“. | Isto. |
| 2 | Greška validacije | (a) Upisati znak pa ga obrisati. (b) Nalepiti tekst duži od 4000 znakova. | (a) „Polje je prazno. Unesite opis profila ili pitanje.“ (b) „Unos je duži od 4000 znakova za N. …“; tekst nije skraćen; dugme onemogućeno. | Isto. |
| 3 | Obrada | Poslati U1 i posmatrati. U demo režimu traje kratko; za dužu obradu u alatima pregledača usporiti mrežu. | „Provera je u toku…“ bez spinera i bez tačke; dugme onemogućeno; drugi klik ne šalje novi zahtev (kartica Mreža). Posle 5 s drugi red o trajanju. | Obrada traje 10 do 20 s; drugi red se vidi bez usporavanja mreže. |
| 4 | Rezultat `ok` | Poslati U2. | Naslov „Preliminarna provera završena“ ima fokus. Kartica profila: oznake „starost 62“, „pol M“, „HbA1c 8,1%“, izvedene oznake sa isprekidanim okvirom i „izračunao kod“, formula i izvor. Pregled studija sa tri reda. Svaka studija: identifikator, naslov, srpska oznaka ishoda, sažetak i traka. Svaki kriterijum: znak i oznaka statusa, uslov, „Vrednost: … · Izvor: …“, ceo citat. „Šta ako?“ i podnožje. | Oko 50 studija; identifikatori oblika NCT sa vezom koja se otvara u novoj kartici; status regrutacije i faza (posle REQ-B6). |
| 5 | Pitanje | Poslati U1. | Naslov „Potrebna je dopuna“; fokus na „Potrebna dopuna“; pitanje; dugmad „Da“ i „Ne“; polje i „Pošalji dopunu“. Već procenjene studije su vidljive. | Tekst pitanja dolazi od modela. |
| 6 | Potvrda nastavka | U stanju 5 kliknuti „Ne“ (jedan klik). | Izabrano dugme ostaje označeno dok traje obrada; zatim „Odgovor je sačuvan · ista provera je nastavljena“ sa kvačicom; u kartici Mreža drugi zahtev ide na `/api/runs/{isti runId}/answer`; oznaka „upotreba insulina ne“ nosi „iz dopune“. | Isto. |
| 7 | Bez odgovarajuće studije | Poslati U3. | „Nijedna studija iz skupa ne odgovara profilu“; dva pasusa objašnjenja; nijedna studija; kartica profila; „Šta ako?“. | Isto. |
| 8 | Van izvora | Poslati U4. | „Tražena informacija nije u dostupnim izvorima“; nema odgovora iz opšteg znanja; nema studija ni kartice profila. | Isto. |
| 9 | Odbijeno | Poslati U5. | „Zahtev nije podržan“; objašnjenje granice i šta alat može; nema medicinskog odgovora; nema „Šta ako?“. | Isto. |
| 10 | Servisna greška koja se može ponoviti | U demo režimu se ne može izazvati iz interfejsa. Pokriveno testom `integration/errors.test.tsx`. | „Provera nije završena“; „Pokušaj ponovo“ i „Počni iznova“; nijedna studija. | Ručna provera čeka REQ-D4. |
| 11 | Istek vremena | Kao 10. | „Servis nije odgovorio na vreme“. | Ručna provera čeka REQ-D4. |
| 12 | Previše zahteva | Pokrenuti server po 3.3, poslati U5 tri puta zaredom (uz „Počni iznova“ između). | Na trećem: „Poslato je previše zahteva“; odbrojavanje od 60 s; „Pokušaj ponovo“ onemogućeno do nule; poruka kaže da nije greška modela. | Isto; odbrojavanje iz zaglavlja posle REQ-B4. |
| 13 | Greška koja se ne može ponoviti | (a) Poslati U6. (b) Posle stanja 4 poslati H2. (c) Po 3.2: poslati U1, ugasiti i ponovo pokrenuti server, kliknuti „Ne“. | (a) „Unos nije prihvaćen“, bez „Pokušaj ponovo“. (b) „Hipotetička izmena nije primenjena“; ispod je prethodni rezultat i rečenica da je to poslednji potvrđeni rezultat. (c) „Provera više nije dostupna“ sa „Počni iznova“; prethodni rezultat nije prikazan. | Isto. |
| 14 | Mrežna ili HTTP greška | Po 3.2: ugasiti server (terminal 1), poslati U1. Zatim ponovo pokrenuti server i kliknuti „Pokušaj ponovo“. | „Server nije dostupan“ ili „Odgovor servera nije čitljiv“ (zavisi od toga šta vrati proxy); nikad sirov tehnički tekst; posle ponovnog pokretanja jedan klik ponavlja zahtev. | Na javnoj adresi: u alatima pregledača uključiti rad bez mreže. |
| 15 | Rezultat hipoteze | Posle stanja 4 poslati H1. | Mala oznaka „Rezultat hipotetičke izmene“; traka „Hipotetička izmena. Ovo nije izvorni profil.“; „Izmena: „A šta ako je HbA1c 9,0%?““; oznaka HbA1c nosi „hipotetički“; zahtev ide na `/api/runs/{isti runId}/hypothesis`; polje „Šta ako?“ je prazno. | Isto. |
| 16 | Počni iznova | Iz stanja 4, 9 ili 14 kliknuti „Počni iznova“. | Isto kao stanje 1; fokus je u polju za unos; nema oznake režima. | Isto. |

## 6. Režim i podaci (priča 4)

| Provera | Demo režim | Stvarni režim (čeka REQ-B5) |
|---|---|---|
| Oznaka u zaglavlju posle prvog odgovora | „DEMO REŽIM“ sa tačkom | „STVARNI MODEL“ i oznaka modela |
| Upozorenje | sadrži i rečenicu „U demo režimu i studije su sintetički primeri.“ | ne sadrži tu rečenicu |
| Podnožje rezultata | „Skup podataka: synthetic-trials-v1“ i „DEMO režim — bez poziva stvarnom modelu“ | verzija stvarnog skupa, „Stvarni model: …“, datum snimka posle REQ-B1 |
| Podnožje stranice | „Sintetički profili · Nije medicinski savet“, bez verzije i datuma | isto |

## 7. Pristupačnost (ručno)

1. **Samo tastatura**: proći unos → pitanje → odgovor → „Šta ako?“ → „Počni iznova“ tasterima Tab, Shift+Tab, Enter i razmaknicom. Svaka kontrola je dostupna, redosled je logičan, indikator fokusa je vidljiv na svakoj.
2. **Fokus posle koraka**: posle rezultata fokus je na naslovu rezultata; posle pitanja na „Potrebna dopuna“; posle greške na panelu greške; posle „Počni iznova“ u polju za unos; posle klika u pregledu studija na naslovu te studije.
3. **Čitač ekrana** (NVDA ili Narator): početak obrade, rezultat, potvrda dopune i greška se najavljuju. Sažetak studije se čita kao ceo tekst („3 od 4 ispunjeno, 1 nepoznato“).
4. **Širina 320 px**: u alatima pregledača postaviti širinu 320 px i proći stanja 1, 4, 5, 10 i 15. Nema vodoravnog pomeranja; zaglavlja studija su složena u kolonu.
5. **Smanjen pokret**: uključiti „Smanji pokret“ u sistemu ili emulaciju `prefers-reduced-motion: reduce` u alatima pregledača. Sve informacije su iste; tačka ne pulsira i tekst obrade se ne preliva.
6. **Boje**: u alatima pregledača uključiti emulaciju akromatopsije. Svaki status je i dalje prepoznatljiv po tekstu i znaku.

## 8. Bezbedan prikaz (ručno, uz test)

Automatski test `integration/safe-rendering.test.tsx` je glavni dokaz. Ručna provera u stvarnom režimu: ako naslov studije ili citat sadrži znakove `<` i `>`, oni se vide kao tekst.

## 9. Lista od 50 studija

**Čeka REQ-C2** za stvarne podatke. Do tada test `integration/trial-list.test.tsx` prikazuje 50 studija. Ručno, kada snimak bude dostupan: redosled u pregledu studija jednak je redosledu kartica; pomeranje je glatko; poslednja kartica se ne pojavljuje primetno kasnije od prve; pretraga na stranici (Ctrl+F) nalazi tekst citata u studijama pri dnu.

## 10. Glasovni unos (AC-13, opciono)

U pregledaču koji podržava prepoznavanje govora (na primer Chrome): kliknuti „Diktiraj“, dozvoliti mikrofon, izgovoriti U1. Tekst se pojavljuje u polju; ništa se ne šalje; tekst se može ispraviti. Odbiti mikrofon: poruka „Pristup mikrofonu nije dozvoljen. Unos tekstom radi kao i do sada.“ U pregledaču bez podrške (na primer Firefox): dugme ne postoji, unos tekstom radi. Kliknuti „Diktiraj“ pa odmah „Proveri kriterijume“: diktat se prekida, a polje se ne menja dok provera traje. Posle rezultata kliknuti „Diktiraj“ pa „Počni iznova“: polje ostaje prazno. Čitač ekrana na dugmetu „Zaustavi diktiranje“ ne izgovara „pritisnuto“.

## 11. Šta ovaj vodič ne može da potvrdi dok druge uloge ne isporuče

| Provera | Čeka |
|---|---|
| Sva stanja na stvarnom modelu | REQ-B5, REQ-C1 |
| Stanja 10 i 11 ručno | REQ-D4 |
| Veze ka registru, status i faza na stvarnim studijama | REQ-C2, REQ-B6 |
| Jedinica i „izračunao kod“ u redu kriterijuma | REQ-B7 |
| Datum snimka | REQ-B1 |
| Javna isporuka | REQ-B8, REQ-B9 |
