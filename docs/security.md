# Bezbednosne granice

## Podaci i poverenje

- Profilni ulazi moraju biti sintetički. Ne unosite stvarne podatke pacijenata.
- Offline provere ne pozivaju Gemini ni embeddings endpoint. Direktan server zahteva `GEMINI_API_KEY`; `pnpm dev` eksplicitno postavlja mock režim. Živi RAG reranker/RAGAS i EV pozivi nisu izvršeni u ovoj sesiji.
- `.env.example` sadrži samo bezbedne vrednosti. Tajne ne pripadaju repozitorijumu ni klijentu.
- Studijski tekst je nepouzdan sadržaj; ne može definisati alat, pozvati kod ili promeniti determinističko pravilo.

## Sprovođenje

Zahtevi, podaci sa diska, argumenti alata i odgovori proveravaju se runtime Zod šemama. API ograničava veličinu ulaza i učestalost poziva. Alati imaju allowlist i vremensko ograničenje. Citati se proveravaju prema izvornim odlomcima tekućeg izvršavanja. UI ispisuje tekst kao tekst i koristi React escaping.

Trenutna ograničenja: run store, idempotency cache i rate limits su process-local; restart briše stanje. Run store zadržava najviše 1.000 zapisa po 30 minuta, a idempotency cache najviše 1.000 ključeva sa rokom od 60 sekundi. Testovi bezbednosti i šeme ne dokazuju semantičku potkrepljenost providerskog odgovora. Ključ, poreklo endpoint-a i upita, uslovi korišćenja, ljudski pregled pravila, cena i live transport nisu potvrđeni. Lokalni eval guard traži odobren opseg; cena nije dostupna bez proverenog cenovnika.

Offline evaluacioni tragovi prolaze kroz fiksnu allowlist-u metapodataka; sirov profil, vrednosti okruženja, tajne i unutrašnje rezonovanje se ne zapisuju. Serverski retrieval događaj može beležiti samo normalizovane neprevedene upitne termine i statuse `lexical_fallback`/rerankiranja; primenjuju se isključivo sintetički profili. Ovo ne zamenjuje bezbednosni pregled tragova stvarnog modela u Fazi 2.

Gemini ključ čita samo serverski proces iz okruženja. Profile extraction šalje Gemini-ju korisnički `profileText` (samo sintetički) i prompt; objašnjenje šalje matcher rezultate i dozvoljene izvore/citate. Gemini ne odlučuje podobnost. Opcioni reranker šalje validirani upit i do 20 tekstualnih kandidata, u jednom zahtevu; schema izlaza odbacuje dodatna polja i nepoznate ID-jeve, a neuspeh vraća RRF redosled. RAGAS live evaluator prihvata samo sintetički skup `human-reviewed`, immutable approval, limite poziva/tokena/bajtova i `maxCost=null` uz eksplicitno priznanje nepoznate cene. Nijedan od ova dva live toka nije pokrenut. API ključ ostaje u serverskom `.env`/okruženju i ne zapisuje se. CORS dozvoljava samo podešeni loopback origin i izlaže `Retry-After`. API odgovori prolaze stroge shared šeme; tragovi koriste allowlist-u metapodataka i događaja i ne čuvaju profile, tela odgovora provajdera ni ključeve.

## Embeddings i lokalni vektorski indeks

OpenAI se koristi samo za embeddings; adapter dozvoljava samo `text-embedding-3-small`. Timeout, 429/5xx i nevalidan odgovor imaju ograničene pokušaje; nakon toga trenutni retrieval nastavlja lexical-only uz označen trag, bez promene modela/provajdera. Ostali non-retryable HTTP statusi ostaju jasna greška adaptera, ali se ne ruše retrieval zahtevi. `OPENAI_API_KEY` se čita samo u serverskom procesu i nikad se ne ispisuje. `OPENAI_BASE_URL` je opcion i prihvata HTTPS (HTTP samo za loopback); pri njegovoj upotrebi korisnik je odgovoran za poverenje u odredište jer se njemu šalje ključ.

Indeksiranje prosleđuje samo javni tekst studija i `sourceQuote` tekst iz validiranih Trial zapisa. Upit pri pretrazi dolazi isključivo iz validiranog sintetičkog profila i kontrolisanog srpsko-engleskog rečnika; sirov unos i ostala polja profila se ne šalju OpenAI embeddings endpoint-u. OpenAI i Gemini ključevi (`OPENAI_API_KEY`, `GEMINI_API_KEY`) ostaju serverski, u lokalnom `.env`/okruženju; `.env` je gitignore-ovan. Testovi i CI koriste deterministički lažni embedder/mock i ne šalju podatke mreži. SQLite indeks i keš su lokalni (`data/index/`) i moraju ostati van git-a.

Kriterijumski tekst je nepouzdan čak i kada je pronađen ili je došao iz lokalnog indeksa. Matcher nikad ne čita rangirani kontekst kao pravilo i ocenjuje sve pregledane kriterijume odabranih studija. Testovi pokrivaju nepretražen exclusion kriterijum i zlonamerni tekst u kontekstu; to ne predstavlja live proveru otpornosti modela. Ugrađeni SQLite adapter podržava macOS arm64/x64, Linux arm64/x64 i Windows x64; druge platforme odbija umesto tihog fallback-a.
