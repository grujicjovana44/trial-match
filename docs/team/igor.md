# Igor — CAP-08

Stanje na 22. 11. 2026. Planirani zajednički tag za predaju je `capstone-v1`; tag još nije napravljen.

## Tehnički doprinos u Fazi 2

- `f793968` — napisao sam specifikaciju implementacije Faze 2: zahteve, plan, API i adapter ugovore, podatkovna pravila, evaluaciju, model podataka, quickstart i handoff.
- `1cbd647` — ažurirao sam README, odluke, mapu dokaza, spremnost za Fazu 2 i dokumentaciju uvoza.
- `6a0abbb` — implementirao sam serverski Gemini REST adapter, konfiguraciju i API, sesiju sa budžetima i retry pravilima, workflow alata, retrieval/matcher izmene, redakciju tragova, povezivanje UI-ja i podatke/evaluaciju; commit sadrži i testove.
- `23d7471` — dodao sam jedan zapis u dostavljeni raw snimak od 50 studija.

Proverio sam doseg svakog commit-a pomoću `git merge-base --is-ancestor <sha> origin/main`: sva četiri su deo aktuelnog `origin/main`, kao i predajne grane `security-audit-fixes`. Ovaj iskaz govori o prisustvu u istoriji, ne o potpunosti ili kvalitetu podataka.

## Odluka i provera

Za prvog stvarnog modelskog adaptera izabrao sam serverski Gemini REST poziv preko ugrađenog Node `fetch`-a, bez dodatnog SDK-a. Ključ ostaje u serverskom okruženju; DEMO bira mock adapter, a nedostajući ključ u live režimu je konfiguraciona greška. Odluka i razmotrene alternative su u `docs/decisions.md`.

Proverio sam granicu kroz `apps/server/src/config/index.test.ts` (live bez ključa odbija konfiguraciju), testove sesije i alata, pa i čist checkout: `pnpm typecheck` PASS i `pnpm test` PASS, 74 fajla i 417/417 testova. Ovo potvrđuje lokalne ugovore i mock tok; ne predstavlja novu proveru plaćenog Gemini poziva.

## Primer pregleda tuđeg rada

Zapis pregleda od 22. 11. 2026: pregledao sam Jovanine izmene iz PR #6, posebno `4cec7e4` i `631b063`. Proverio sam da DEMO bez indeksa ili sa nevažećim indeksom prelazi na leksičku pretragu i izlaže razlog fallback-a, dok validan lokalni indeks može ostati u hybrid režimu; zatim sam pregledao integracione slučajeve u `apps/server/test/integration/retrieval-startup.test.ts` i UI aserciju za prikaz `Retrieval: lexical-only`. Zaključak u tom opsegu: nema nalaza; uključeni offline/unit/integracioni testovi prošli su u čistom checkout-u 417/417. Zasebni Playwright E2E prolaz nije potvrđen zbog nedostajućeg browser-a. Ovo je lokalni zapis pregleda, ne tvrdnja da postoji PR komentar.

## Mesto u glavnom toku i ograničenja

Serverski tok prihvata profil, model može da izdvoji činjenice i objasni rezultat, a matcher deterministički ocenjuje samo dozvoljena strukturisana pravila. UI prikazuje validiran odgovor kroz API. Faza 2 je zato adapter i integracija oko istog determinističkog matcher-a.

DEMO koristi mock i ne proverava stvarni Gemini. Live poziv zahteva serverski ključ i može imati trošak. U aktivnom paketu od 18 studija 273 kriterijuma ostaju `manual_review`/`unknown`, a 27 `auto` pravila imaju važeći hash-povezan pregled; uzorak studija nije dokaz potpunosti korpusa, a kvalitet parsiranja kriterijuma nije izmeren. RAG kvalitet, nezavisni pregled pravnih uslova i poreklo/paginacija snimka od 50 studija ostaju ograničenja opisana u `docs/phase-2-readiness.md`.

## Primer upotrebe AI-ja

AI pomoć sam koristio pri pripremi ove CAP-08 beleške da sažmem istoriju i izlaze provera. Prihvatio sam predlog da se u evidenciji navedu tačni brojevi i razlozi prvobitnih neuspeha, a zatim sam ažurirao zaključak nakon instalacije Playwright Chromium-a: `pnpm test` 417/417, E2E 3/3 i README profil u DEMO UI-ju završen. Ishode sam proverio ponovnim pokretanjem komandi i vidljivim UI stanjem; nisam pomešao početni nedostatak browsera sa konačnim PASS rezultatom.
