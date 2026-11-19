# Demo scenario (6 minuta)

Scenario koristi `pnpm demo`: lokalni mock adapter i skup od 20 studija. Ne šalje podatke Gemini-ju ili embeddings API-ju. Koristiti samo sintetički profil. U tehničkim detaljima se vidi `lexical-only`; ako je lokalni indeks nedostupan u fixtures režimu, health i UI prikazuju lexical fallback. Ovo je demo toka i arhitekture, ne dokaz kvaliteta kliničkog odlučivanja.

## Tok prezentacije

| Vreme     | Deo                          | Radnja i ključna poruka                                                                                                                                                                                                                                                                                                                                     |
| --------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:40 | Granice i bezbednost         | Pokreni `pnpm demo`. Naglasi da je profil izmišljen, alat nije za dijagnozu/lečenje/odluku o uključivanju, a konačnu procenu daje lekar. U ovom DEMO režimu nema poziva stvarnom modelu.                                                                                                                                                                    |
| 0:40–2:10 | Ulaz → obrada → izlaz        | Unesi: „Muškarac, 62 godine, dijabetes tip 2, HbA1c 8,1%, kreatinin 1,3 mg/dL, visina 178 cm, težina 92 kg, bez insulina.“ Odgovori „Ne“ na dopunu ako se pojavi. Pokaži izvučena polja, studije, status kriterijuma i citate.                                                                                                                              |
| 2:10–2:50 | Retrieval i neizvesnost      | Otvori tehničke detalje: skup `clinicaltrials-20` i retrieval režim. Pokaži da se `manual_review` kriterijumi prikazuju kao nepoznati uz citate, ne kao automatska presuda. Proveri `/health` i polje `retrievalMode`.                                                                                                                                      |
| 2:50–3:50 | Tehnologija i AI arhitektura | Prođi kroz Mermaid dijagram u `docs/architecture.md`: React/Vite → Fastify/Zod → ModelSession/adapter → retrieval → allowlisted tools → deterministički matcher → provera citata. Objasni razliku: demo koristi mock adapter; stvarni LLM adapter postoji u kodu, ali nije pozvan. LLM ne donosi matcher presudu.                                           |
| 3:50–4:40 | Evaluacija                   | Pokaži rezultate poslednjeg `pnpm eval:offline` i `pnpm gold:metrics`. Objasni uzorak i ograničenja: 8 sintetičkih parser primera; RAG skup ima samo nekoliko rangirajućih primera i offline fake vektori nisu semantički dokaz. Ne tvrdi da su metrike klinička validacija.                                                                                |
| 4:40–5:35 | Bezbednosne zaštite          | Pokaži `docs/security.md` i test injection otpornosti: tekst studije se tretira kao podatak, alat van allowlist-e se odbija, ulaz/izlaz alata prolazi Zod validaciju, citati se proveravaju prema aktivnom izvoru, a tajne ostaju serverske. Ne unositi stvarne podatke pacijenata.                                                                         |
| 5:35–6:10 | Ograničenja i završetak      | Objasni da su run store, idempotency i rate limit process-local i da budući viš procesni deployment traži zajedničko skladište i distribuirani limiter. Za podatke navedi ClinicalTrials.gov i datum preuzimanja 2026-11-16; pravni pregled nije urađen, uslove korišćenja treba proveriti pre javnog objavljivanja, a pravni status podataka nije ocenjen. |

## Priprema

1. Instaliraj zavisnosti: `pnpm install --frozen-lockfile`.
2. Pokreni `pnpm demo` i otvori `http://127.0.0.1:5173`.
3. Proveri `http://127.0.0.1:3000/health`: `demoMode` treba da bude `true`, a `retrievalMode` da odgovara lokalnom stanju.
4. Za metrike pre demo-a pokreni `pnpm eval:offline` i `pnpm gold:metrics`; oba su offline.
5. Ne pokreći `pnpm eval:live`, `pnpm eval:rag:live`, `pnpm embeddings:check` ili `pnpm index:build` kao deo ovog scenarija. Live pozivi i mogući trošak zahtevaju posebno odobrenje.

## Očekivani ishod

Demonstracija treba da pokaže kompletan lokalni tok, vidljiv retrieval režim, izvorne citate, nepoznate kriterijume, determinističke presude i sigurnosne granice. Ona ne potvrđuje kliničku prikladnost, opšti kvalitet retrieval-a, live LLM ponašanje, pravni status podataka niti spremnost za viš procesni deployment.
