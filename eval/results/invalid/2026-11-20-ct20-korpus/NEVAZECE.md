# Nevažeći live run od 2026-11-20 (nije T331 baseline)

- Pokrenut: 2026-11-20T12:29:45Z, `main` 2ed092f, komanda `pnpm eval:live --confirm-live --dataset fixtures --label baseline --max-model-attempts 60 --max-input-tokens 2000000 --max-output-tokens 122880 --approval eval/approval.json`.
- Ishod: 16/16 izvršeno, 9 prošlo, 7 palo (EV-01..07).
- Razlog nevažnosti: pre pokretanja je u okruženje učitan ceo `.env`, uključujući `DATASET_PROFILE=clinicaltrials-20` i `RAG_INDEX_PATH` ka ct-20 indeksu. `TrialMatchService.initialize` tada koristi stvarni korpus od 20 studija umesto fixture studija koje runner prosleđuje. EV očekivanja (T-A/T-B/T-C) zato nisu mogla da se ispune, a `manifest.json` netačno navodi `dataset: fixtures`.
- Trace-ovi pokazuju `selectedTrialIds` sa NCT studijama u svim real_model slučajevima. Padovi EV-01/02/03/05/06 posledica su korpusa. EV-04 (dva extract poziva, bez alata) i EV-07 (matcher pre pitanja HbA1c/glukoza) izgledaju nezavisno od korpusa.
- Odluka (2026-11-20, Aleksa Durutović, u ulozi celog tima): run se čuva ovde kao dokaz, bez izmene sadržaja, a `eval/results/baseline/` se oslobađa za ispravan run. `approval.json` je premešten ovde, jer važi samo za ovaj run.
