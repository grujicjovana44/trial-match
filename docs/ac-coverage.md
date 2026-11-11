# Mapa pokrivenosti kriterijuma prihvatanja (interfejs)

Za svaki AC navodi stanje interfejsa koje ga prikazuje i dokaz. Brojevi stanja su iz `specs/002-ui-role-a/data-model.md`. Putanje testova su u `apps/web/test/`.

| AC    | Stanje interfejsa                    | Dokaz u interfejsu                                                                                      | Napomena                                                                                        |
| ----- | ------------------------------------ | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| AC-01 | 4 (rezultat `ok`)                    | `integration/outcomes.test.tsx`, `integration/trial-list.test.tsx`, `integration/profile-card.test.tsx` | Rangiranje i statusi su serverski; interfejs čuva redosled.                                     |
| AC-02 | 4, kartica profila (izvedene oznake) | `integration/profile-card.test.tsx`                                                                     | Račun je serverski (`apps/server/src/derived/`); interfejs prikazuje vrednost, formulu i izvor. |
| AC-03 | 5, 6, 15                             | `integration/run-flow.test.tsx`, `unit/run-state.test.ts`                                               | Čuvanje profila je serversko; interfejs čuva `runId` i ne traži ponovo podatke.                 |
| AC-04 | 5                                    | Isključivo serversko: izbor pitanja (`apps/server/src/questions/`).                                     | Interfejs prikazuje jedno pitanje koje dobije.                                                  |
| AC-05 | 7, 8                                 | `integration/outcomes.test.tsx`                                                                         |                                                                                                 |
| AC-06 | 9                                    | `integration/outcomes.test.tsx`                                                                         | Odluka o odbijanju je serverska.                                                                |
| AC-07 | 10, 14                               | `integration/errors.test.tsx`, `unit/client.test.ts`                                                    | Pokušaj ispravke izlaza modela je serverski; interfejs odbacuje neispravan odgovor.             |
| AC-08 | 4 (red kriterijuma: izvor i citat)   | `integration/trial-list.test.tsx`, `integration/safe-rendering.test.tsx`                                | Provera dozvoljenih izvora je serverska (`apps/server/src/citations/`).                         |
| AC-09 | 4                                    | `integration/safe-rendering.test.tsx`                                                                   | Otpornost matchera je serverska; interfejs ne izvršava tekst studije.                           |
| AC-10 | 3, 10, 11, 12, 13, 14                | `integration/errors.test.tsx`, `integration/processing.test.tsx`, `unit/client.test.ts`                 | Ponovni pokušaji prema modelu su serverski.                                                     |
| AC-11 | Nema                                 | Buduće proširenje, bez obaveze u interfejsu.                                                            |                                                                                                 |
| AC-12 | Sva                                  | `accessibility.test.tsx`, `unit/contrast.test.ts`, `unit/copy.test.ts`, ručna provera iz quickstart.md  |                                                                                                 |
| AC-13 | 1 (kontrola „Diktiraj“)              | `integration/voice-input.test.tsx` (nastaje u T252)                                                     | Opciono.                                                                                        |

## Šta čeka druge uloge

| Deo interfejsa                                   | Čeka           | Šta se radi do tada                                                         |
| ------------------------------------------------ | -------------- | --------------------------------------------------------------------------- |
| Datum snimka u podnožju                          | REQ-B1         | Prikazuje se samo verzija skupa.                                            |
| Jedinica i „izračunao kod“ u redu kriterijuma    | REQ-B7         | Vrednost bez jedinice i bez oznake.                                         |
| Status regrutacije i faza                        | REQ-B6, REQ-C2 | Red se ne prikazuje.                                                        |
| Isključene studije za `no_matching_trial`        | REQ-B3         | Samo poruka.                                                                |
| Ručna provera svih stanja u stvarnom režimu      | REQ-B5, REQ-C1 | Stanja se proveravaju testovima sa `demoMode: false` i ručno u demo režimu. |
| Tokovi EV-01, EV-02, EV-05–EV-09 kroz interfejs  | REQ-C1         | Ne može se izvesti.                                                         |
| Ručna provera stanja 10 i 11 na živoj aplikaciji | REQ-D4         | Pokriveno testovima interfejsa.                                             |
| Provera javne isporuke                           | REQ-B8, REQ-B9 | Lokalna provera izgrađene verzije.                                          |
