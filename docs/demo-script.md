# Demo scenario — 25. novembar 2026. (oko 7 minuta)

Demo pokazuje glavni tok sa **stvarnim Gemini modelom** nad 20 studija sa ClinicalTrials.gov: uspešan prolaz, slučaj sa dopunom i kontrolisanu grešku. Koristiti samo sintetičke profile. Ovo je demonstracija toka i arhitekture, ne dokaz kliničkog kvaliteta.

Isti tok je sačuvan kao dokaz u [eval/results/ui-live/predaja-ui-3/](../eval/results/ui-live/predaja-ui-3/) (snimci i `run.json`). Ako živi servis ne radi, pokazati te snimke i preći na rezervni plan na kraju.

## Priprema (pre izlaganja)

1. `pnpm install --frozen-lockfile` i `pnpm build`.
2. U `.env` postoji `GEMINI_API_KEY`. Opciono `OPENAI_API_KEY` i `COHERE_API_KEY` uključuju `hybrid` retrieval i reranker; bez njih radi leksička pretraga.
3. Pokrenuti `pnpm demo:live`, otvoriti `http://127.0.0.1:5173` i proveriti `http://127.0.0.1:3000/health`: `demoMode: false`, `modelId: gemini-3.5-flash-lite`.
4. Jednom proći korak 1 pre publike, da bi se proverili ključ i limit provajdera.
5. U drugom terminalu pripremiti `pnpm demo` (mock) kao rezervu. Pokrenuti ga tek ako zatreba, jer koristi iste portove.

## Tok izlaganja

| Vreme     | Deo                              | Radnja i ključna poruka                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:40 | Granice                          | Profil je izmišljen. Alat ne postavlja dijagnozu i ne odlučuje o uključivanju; konačnu odluku donosi lekar. U zaglavlju se vidi oznaka „Stvarni model“. **Jezički model čita i objašnjava, a odluku donosi deterministički kod.**                                                                                                                                                                                            |
| 0:40–2:20 | **1. Uspešan prolaz sa dopunom** | Uneti: „Muškarac, 62 godine, dijabetes tip 2, HbA1c 8,1%, kreatinin 1,3 mg/dL, visina 178 cm.“ Sistem pita: „Koja je težina osobe i u kojoj jedinici?“, jer bez težine BMI ostaje nepoznat, a BMI odlučuje kod odobrenih pravila. Pitanje bira kod, ne model. Odgovoriti „92 kg“. Pokazati: eGFR 62,11 i BMI 29,04 (izračunao kod, uz izvor formule), 10 studija, oznaku „Odgovor je sačuvan – ista provera je nastavljena“. |
| 2:20–3:10 | Citat i izvor                    | Kod NCT07919236 otvoriti „Detalji studije“: kriterijum „Body mass index ≥25 kg/m2“ je _Ispunjen_, uz citat iz registra. Kliknuti „Otvori NCT07919236 na ClinicalTrials.gov“, da se vidi originalni izvor. Kriterijumi bez odobrenog pravila su „čeka proveru lekara“ (`unknown`), a ne „da“ ili „ne“.                                                                                                                        |
| 3:10–3:50 | „Šta ako?“ u istom toku          | Uneti „Šta ako je HbA1c 10,5%?“. Isti `runId`, ostali podaci ostaju. NCT07919236 prelazi u „Ne ispunjava kriterijume“, jer sada važi njen uslov isključenja HbA1c >10%.                                                                                                                                                                                                                                                      |
| 3:50–4:30 | **2. Nedovoljno podataka**       | „Počni iznova“ → „Muškarac, 62 godine, dijabetes tip 2, šećer 8,1, kreatinin 1,3 mg/dL, visina 178 cm, težina 92 kg.“ Sistem ne nagađa: pita da li je 8,1 HbA1c ili glukoza i ne poziva alate. To je ciljana izmena posle baseline-a (EV-07, trag u mapi dokaza).                                                                                                                                                            |
| 4:30–5:20 | **3. Kontrolisana greška**       | Pokazati unapred snimljen ili uživo pokrenut primer (vidi ispod). Poruka „Provera nije završena. Počnite novu proveru.“ nema tehničke detalje ni tajne, a stari rezultat se ne prikazuje kao novi.                                                                                                                                                                                                                           |
| 5:20–6:10 | Arhitektura i evaluacija         | [architecture.md](architecture.md): React/Vite → Fastify/Zod → adapter modela → retrieval → alati sa allowlist-om → deterministički matcher → provera citata. Evaluacija: 16 fiksnih slučajeva, baseline 13/16 → 16/16, `predaja-3` 16/16 na `a62df6b` ([mapa dokaza](evidence-map.md)).                                                                                                                                     |
| 6:10–7:00 | Ograničenja                      | Svaki run je pokrenut jednom, pa to nije statistička procena. 290 kriterijuma čeka ljudski pregled. Aplikacija je lokalna; nalazi TM-01–TM-05 iz audita važe pre javne dostupnosti. Podaci: ClinicalTrials.gov, preuzeto 16. 11. 2026; pravni pregled nije urađen.                                                                                                                                                           |

## Kontrolisana greška — kako je izazvati

**Uživo sa stvarnim adapterom (istek vremena modela).** Zaustaviti `pnpm demo:live`, pa u PowerShell-u:

```powershell
$env:MODEL_TIMEOUT_MS='1'; pnpm demo:live
```

Bilo koji profil daje grešku `model_timeout` posle ograničenih ponovnih pokušaja. Ovo je provereno kroz API 22. 11.: status `error`, poruka „Provera nije završena. Počnite novu proveru.“. Posle demonstracije vratiti podrazumevanu vrednost:

```powershell
Remove-Item Env:MODEL_TIMEOUT_MS; pnpm demo:live
```

**Bez restarta (simulacija, DEMO).** U `pnpm demo` uneti „HbA1c neispravno“. Interfejs prikazuje pristupačnu poruku o grešci (`role="alert"`). Isti slučaj pokriva Playwright test „invalid profile response is shown as an accessible error“. Naglasiti da je ovo simulacija.

Determinističke provere grešaka su EV-11–EV-16: nevalidan zahtev, nevalidan izlaz modela, nedozvoljen citat, nepoznat alat, timeout/429 i greška alata.

## Rezervni plan

Ako provajder ne odgovara ili vraća `429`:

1. Pokazati snimke iz `eval/results/ui-live/predaja-ui-3/` (`01-unos.png` … `05-sta-ako.png`) i `run.json` sa `demoMode: false`, `runId` i primerom citata.
2. Pokrenuti `pnpm demo` i proći isti tok u mock režimu, uz jasnu napomenu da tada nema poziva stvarnom modelu (oznaka „DEMO“ u zaglavlju).
