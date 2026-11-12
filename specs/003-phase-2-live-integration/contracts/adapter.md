# Adapter, konfiguracija i budžet

Provider-neutral ugovor ostaje; konkretan adapter je Gemini `gemini-3.5-flash-lite`, prema Q2 i zvaničnim izvorima u research.md. Koristiti Node fetch/REST, bez SDK zavisnosti. DEMO_MODE podrazumevano false; true bira mock. Dokumentacija je čitana uz dozvolu, živi pozivi nisu odobreni. Zavisnosti: šeme, budžet, trace i zaštita ponavljanja iz API ugovora.

`LlmAdapter.generate(request, context): Promise<AdapterResult>` prima promptId/version, minimizovan validiran ulaz, očekivani schemaId, dozvoljene izvore, abort signal i deadline. Vraća unknown kandidat sadržaja, modelId/providerId, finish status, usage|null i tipizovanu grešku. `generateStructured` obavija adapter i vraća tek Zod-validiran rezultat. Konkretnom SDK izlazu se ne veruje kroz assertion.

Ekstrakcija vraća intent i samo eksplicitne profilne vrednosti/ambiguities; hipoteza parcijalni patch; explanation tekst i reference sa criterionId/sourceId/quote. Model ne vraća autoritativne statuse ni izračunava eGFR/BMI. Izlaz može biti validan JSON a semantički nevalidan: proveriti opsege, jedinice i saglasnost sa unosom. Zabranjena namera zaustavlja pre alata; source_question bez izvora ne odgovara iz opšteg znanja. Odgovor na ciljano pitanje parsira kod, bez modelskog poziva.

Verzionisane promptove tek napraviti u prompts/. Odvojiti instrukcije od nepouzdanog korisničkog/studijskog teksta. Objašnjenje je običan srpski tekst, citati originalni. Tačan ID/tekst proveriti samo prema izvorima dostavljenim u tom pozivu; zasebno vezati tvrdnju uz kriterijumski rezultat i proveriti brojeve. Ako ne prolazi, koristiti minimalan šablon iz serverskih statusa; semantičku podršku pregledati ljudski. Ne prikazivati generalnu medicinsku tvrdnju samo zato što citat postoji.

## Brojanje i prekidi

- Jedan logički poziv troši jedan od 4, i popravka je zaseban logički poziv. Sva početna ekstrakcija/hipoteza/objašnjenje prolaze isti omotač.
- Neispravan, prazan, prekinut ili odbijen izlaz ima najviše jednu popravku, pa kontrolisani neuspeh; ne radi mrežni retry zbog takvog sadržaja. Ako nema budžeta za popravku, odmah greška. Odbijanje provajdera ne pokušava se zaobići promenom bezbednosne namere.
- Retry samo timeout, 429, 500–599: najviše dva ponavljanja, 500/1500 ms. Svaki pokušaj dobija događaj i moguće usage podatke, iako ne troši dodatni logički limit. Provajder može naplatiti pokušaj; ne nazivati retry besplatnim.
- Svaki pokušaj ima rok min(20000, preostali run rok) ms; backoff mora stati u ukupnih 60000 ms od createdAt. Abort otkazuje transport kada SDK podržava; zakašnjeli odgovor ne menja stanje. Nije dovoljno samo Promise.race.
- Ukupni limiti ostaju kroz dopunu, čekanje korisnika i hipotezu: 4 model, 10 alata, 5 rundi dopune. Ne resetovati na ulasku u HTTP handler. Nedostajući ključ se proverava bez ispisa vrednosti.
- Po run-u odvojeni brojači/usage/deadline; adapter može biti deljen samo ako je bez promenljivog globalnog stanja poziva.

Mock radi bez mreže/ključa, sa istim omotačem i deterministic fault transportom. Živi režim je podrazumevan i zahteva validne postavke LLM_PROVIDER=gemini, LLM_MODEL=gemini-3.5-flash-lite i serverski GEMINI_API_KEY; `/health`, meta i UI odražavaju izabrani režim. Testovi/CI eksplicitno biraju mock. Provider greške klasifikovati po ugovoru, bez logovanja kompletnog zahteva/odgovora ili tajni. SDK specifična ograničenja, dostupnost tokena i cene zapisati tek po odobrenom proveravanju dokumentacije.

Provere: jedna popravka, invalid/empty/refused/truncated, auth greška bez retry-a, timeout/429/5xx tačno ograničeni, kašnjenje posle abort-a bez mutacije, dva paralelna run-a bez mešanja, nevalidna hipoteza bez refund-a potrošnje, missing key bez mock fallback-a, 0 alata za zabranjenu nameru.

## Gemini transport

Planirana ruta je POST /v1beta/models/gemini-3.5-flash-lite:generateContent na zvaničnom Gemini API hostu, bez proizvoljnog URL-a iz korisničkog teksta. API ključ šalje se samo serverskim autentikacionim zaglavljem; ne u klijentu ili logovima. Slati tekst i ograničen JSON schema izlaz, bez ugrađenih web/search/code alata provajdera. Validirati candidates, finishReason/promptFeedback i sadržaj pre JSON/Zod provere. Usage brojati samo iz validiranih provider podataka; odsutno je null. Ne tražiti ni čuvati unutrašnje rezonovanje. Referenca i datum provere su u research.md; T312 mora proveriti request/usage polja i abort kroz lažni transport, bez živog probe poziva.
