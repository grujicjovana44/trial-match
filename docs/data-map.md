# Mapa podataka

| Podatak               | Poreklo                                               | Obrada i mesto                                                            | Ograničenja                                                                                                             |
| --------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Profilni tekst        | Sintetički unos u lokalnom pregledaču                 | Serverski zahtev, izdvaja se u strukturisani profil; stanje je memorijsko | Ne unositi stvarne podatke; nema trajnog skladištenja; run stanje ističe posle 30 minuta ili pri ograničenju kapaciteta |
| Profilna polja        | Mock izdvajanje i/ili odgovor/hipoteza                | Shared Zod šeme, matcher i izvedene vrednosti                             | Nepomenuta polja ostaju odsutna; provenance beleži poreklo                                                              |
| Studije i kriterijumi | `data/fixtures/trials.json` ili novi pregledani paket | Lokalni server i retrieval                                                | T-A/T-B/T-C su sintetički; realni paket zahteva hash review i potvrđenu licencu                                         |
| Citati                | `sourceQuote` u lokalnim fixture-ima                  | Provera u serveru, prikaz u UI-ju                                         | Samo izvor iz tekućeg izvršavanja                                                                                       |
| Evaluacioni primeri   | `eval/cases.jsonl`, sintetički                        | Offline evaluator i testovi                                               | Real-model slučajevi se preskaču/dry-run-ujemo bez PASS ishoda                                                          |
| Trace evaluacije      | Generisani rezultati                                  | `eval/results/<label>/traces/`                                            | Bez sirovog profila, tajni i unutrašnjeg rezonovanja                                                                    |

Pravi studijski snimak nije preuzet. Ako se koristi u kasnijoj fazi, čovek ga ručno stavlja u `data/raw/`; mrežno preuzimanje niti automatsko prikupljanje nisu dozvoljeni.

Faza 2 raw importer daje manifest, normalizovane studije, izvorne odlomke i report u jednom lokalnom JSON izlazu. Nerazdvojeni eligibility tekst ostaje u `sources` kao `unsplit`, a strukturisani pol/starost se normalizuju samo kad su podržani. `rules:review-template` pravi neodobrene hash-eve; čovek unosi pregled, a `compile:rules` odbija nepregledane ili izmenjene stavke. Prazan kriterijumski niz ne može postati kandidat. Realni manifest sa nepotvrđenom licencom server ne učitava.

## OpenAI — embeddings only

`index:build` iz `data/trials/` i `data/fixtures/` šalje OpenAI-ju samo tekstualna polja za embeddings: naslov, stanja, sažetak i criterion `sourceQuote` iz validiranog `TrialSchema` zapisa. ID-jevi, datoteke, manifesti, profili i druga metapodatkovna polja ne ulaze u embedding payload. Pri retrieval-u se šalje samo deterministički, normalizovani dijagnostički upit izveden iz `ProfileSchema` validiranog sintetičkog profila; sirovi tekst, demografija i laboratorijske vrednosti se ne šalju. `embeddings:check` koristi fiksni sintetički upit `type 2 diabetes`.

Pozivi idu na OpenAI embeddings endpoint, koriste isključivo `text-embedding-3-small` i zahtevaju serverski `OPENAI_API_KEY`. Opcioni `OPENAI_BASE_URL` menja odredišni endpoint; ako se podesi, ključ se šalje tom endpoint-u. Indeks i hash-keš ostaju lokalno u `data/index/`, nisu namenjeni commit-u i ne čuvaju API ključ. Testovi/CI koriste lažni embedder i ne šalju podatke mreži. `embeddings:check` je uspeo sa jednim sintetičkim upitom; `index:build` nije pokrenut, pa tekst studija nije poslat provider-u u ovoj proveri.

## Gemini — LLM, sudija i opcioni reranker

Gemini je LLM provajder aplikacije. Profile extraction šalje `profileText` (u ovom projektu samo sintetički tekst) uz prompt i izlaznu šemu. Objašnjenje šalje determinističke rezultate matchera i odobrene izvore/citate iz tekućeg izvršavanja; kriterijumske presude ne generiše Gemini. Planirani LLM sudija za RAGAS-style evaluaciju bi dobijao sintetički slučaj, odgovor, vraćeni kontekst i rubricu; planirani reranker bi dobijao samo validirani sintetički profil-query i kandidate sa javnim studijskim/odlomkovnim tekstom. Sudija i reranker još nisu implementirani kao RAG evaluacioni tokovi, pa se ti payload-i trenutno ne šalju.

Gemini zahteva serverski `GEMINI_API_KEY`, čitan iz okruženja servera; nikada se ne stavlja u browser bundle, trace ili repozitorijum. Lokalni `.env` je ignorisan u git-u, a `.env.example` sadrži samo nazive promenljivih i prazne vrednosti. Offline testovi i CI koriste mock i ne šalju Gemini-ju podatke.
