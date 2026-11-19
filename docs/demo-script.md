# Demonstracioni scenario (3 minuta)

Cilj: najviše 3 minuta u lokalnom DEMO_MODE=true toku. Novi raspored prikazuje unos levo i rezultate desno na desktopu; na telefonu se slažu u jednu kolonu. Gemini live prikaz i scenario nisu ručno pregledani; ne predstavljati ga kao izvršenu demonstraciju Faze 2.

Lokalni DEMO tok, koraci 1–6, proveren je 2026-11-16 na izgrađenoj verziji uz mock API (ishod u [003 T325](../specs/003-phase-2-live-integration/tasks.md)). Kroz preview proxy ugašen API daje „Provera nije završena“ (HTTP 502); „Server nije dostupan“ se dobija u režimu bez mreže ili sa `VITE_API_BASE_URL` na odvojeni API. Čitač ekrana, smanjen pokret i boje proverio je vlasnik Uloge A 2026-11-16; live režim nije proveren.

| Korak | Radnja                                       | Unos                                                                                                                                | Očekivano                                                                                                                                           | Vreme |
| ----- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 0     | Početni ekran                                | —                                                                                                                                   | Kratko prazno stanje desno, profil se unosi levo.                                                                                                   | 10 s  |
| 1     | Nova provera                                 | `Muškarac, 62 godine, dijabetes tip 2, HbA1c 8,1%, kreatinin 1,3 mg/dL, visina 178 cm, težina 92 kg, na metforminu.`                | Tokom rada skeleton; zatim profil, pitanje o insulinu i redosled studija sa servera.                                                                | 30 s  |
| 2     | Dopuna jednim klikom                         | klik na „Ne“                                                                                                                        | Sažetak broji studije i kriterijume; kartice prikazuju status, glavne razloge i broj kriterijuma za proveru. Otvori karticu da vidi grupe i citate. | 30 s  |
| 3     | „Šta ako?“                                   | `Šta ako je HbA1c 9,0%?`                                                                                                            | Jasna traka „Šta ako?“ uz rezultat; poruka kaže da izmena važi samo za ovu proveru.                                                                 | 30 s  |
| 4     | „Počni iznova“, bez odgovarajuće studije     | `Muškarac, 82 godine, HbA1c 6,2%, kreatinin 1,1 mg/dL.`                                                                             | Sažetak i kartice isključenih studija; detalji ostaju sklopljeni dok se ne otvore.                                                                  | 30 s  |
| 5     | „Počni iznova“, odbijen zahtev               | `Koju terapiju treba da uzima ovaj pacijent?`                                                                                       | „Zahtev nije podržan“ sa objašnjenjem granice.                                                                                                      | 20 s  |
| 6     | „Počni iznova“, greška sa ponovnim pokušajem | U alatima pregledača uključiti rad bez mreže, poslati unos iz koraka 1, zatim isključiti rad bez mreže i kliknuti „Pokušaj ponovo“. | Jedna kratka poruka sa jednim dugmetom za novi pokušaj; zatim isti tok kao u koraku 1.                                                              | 40 s  |

Upozorenje o sintetičkim profilima ostaje vidljivo; detalji o modelu i diktiranju otvaraju se preko „O alatu i ograničenjima“. Tehnički podaci su u sklopljenom odeljku na dnu rezultata.

## Snimci redizajna

Snimci su napravljeni lokalno uz mock odgovor i Chrome, bez poziva stvarnom modelu:

- [Prazno stanje — desktop](screenshots/trialmatch-empty-desktop.png)
- [Rezultat i otvoreni detalji — desktop](screenshots/trialmatch-results-desktop.png)
- [Rezultat — telefon](screenshots/trialmatch-results-mobile.png)
- [Greška i novi pokušaj — desktop](screenshots/trialmatch-error-desktop.png)

Napomena u scenariju: ako korak 4 u stvarnom režimu prvo postavi pitanje, odgovoriti i nastaviti; ishod se potvrđuje pri probi.

## Priprema

- Aplikacija je otvorena i prošla je jedna probna provera.
- Alati pregledača su otvoreni na kartici Mreža, radi koraka 6.
- Unosi iz tabele su spremni za kopiranje.

## Lokalne komande

Za razvoj pokrenite pnpm dev; skripta eksplicitno bira mock. Za izgrađeni preview pokrenite API sa DEMO_MODE=true i zasebno pnpm preview:ui. Pri različitim origin-ima izgradite UI uz VITE_API_BASE_URL=http://127.0.0.1:3000; WEB_ORIGIN mora da odgovara tačnom UI loopback origin-u. Ovaj vodič ne beleži browser smoke prolaz.
