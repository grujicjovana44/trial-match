# Bezbednosne granice

## Podaci i poverenje

- Profilni ulazi moraju biti sintetički. Ne unosite stvarne podatke pacijenata.
- Offline provere ne pozivaju Gemini ni embeddings endpoint. Direktan server zahteva `GEMINI_API_KEY`; `pnpm dev` eksplicitno postavlja mock režim. Živi RAG reranker/RAGAS i EV pozivi nisu izvršeni u ovoj sesiji.
- `.env.example` sadrži samo bezbedne vrednosti. Tajne ne pripadaju repozitorijumu ni klijentu.
- Studijski tekst je nepouzdan sadržaj; ne može definisati alat, pozvati kod ili promeniti determinističko pravilo.

## Sprovođenje

Zahtevi, podaci sa diska, argumenti alata i odgovori proveravaju se runtime Zod šemama. API ograničava veličinu ulaza i učestalost poziva. Alati imaju allowlist i vremensko ograničenje. Citati se proveravaju prema izvornim odlomcima tekućeg izvršavanja. UI ispisuje tekst kao tekst i koristi React escaping.

Trenutna ograničenja: run store, idempotency cache i rate limits su process-local; restart briše stanje, a više instanci ne dele limite ni deduplikaciju. Run store zadržava najviše 1.000 zapisa po 30 minuta, idempotency cache najviše 1.000 ključeva sa rokom od 60 sekundi, a rate limiter podrazumevano dozvoljava 20 zahteva u 60 sekundi po IP adresi. Ovo nije distribuirana zaštita za budući viš procesni deployment. Testovi bezbednosti i šeme ne dokazuju semantičku potkrepljenost providerskog odgovora. Cena live poziva nije potvrđena; live pozivi se ne izvršavaju bez posebnog odobrenja.

Offline evaluacioni tragovi prolaze kroz fiksnu allowlist-u metapodataka; sirov profil, vrednosti okruženja, tajne i unutrašnje rezonovanje se ne zapisuju. Serverski retrieval događaj može beležiti samo normalizovane neprevedene upitne termine i statuse `lexical_fallback`/rerankiranja; primenjuju se isključivo sintetički profili. Ovo ne zamenjuje bezbednosni pregled tragova stvarnog modela u Fazi 2.

Gemini ključ čita samo serverski proces iz okruženja. Profile extraction šalje Gemini-ju korisnički `profileText` (samo sintetički) i prompt; objašnjenje šalje matcher rezultate i dozvoljene izvore/citate. Gemini ne odlučuje podobnost. Opcioni reranker šalje validirani upit i do 20 tekstualnih kandidata, u jednom zahtevu; schema izlaza odbacuje dodatna polja i nepoznate ID-jeve, a neuspeh vraća RRF redosled. RAGAS live evaluator prihvata samo sintetički skup `human-reviewed`, immutable approval i tvrde limite poziva/tokena/bajtova. `maxCost=null` se razmatra samo uz takve limite i budžetski limit podešen u dashboard-u provajdera. Live pozivi zahtevaju zasebno odobrenje vlasnice projekta; u ovoj sesiji nisu pokrenuti. API ključ ostaje u serverskom `.env`/okruženju i ne zapisuje se. CORS dozvoljava samo podešeni loopback origin i izlaže `Retry-After`. API odgovori prolaze stroge shared šeme; tragovi koriste allowlist-u metapodataka i događaja i ne čuvaju profile, tela odgovora provajdera ni ključeve.

## Deterministički čuvari posle izvlačenja (2026-11-20)

Model izvlači profil, ali kod posle toga proverava dva rizična obrasca, nezavisno od toga šta je model vratio:

- **Šećer ili glukoza bez eksplicitnog HbA1c.** Vrednost uz „šećer“ ili „glukoza“ (latinica ili ćirilica, uz padeže) može biti HbA1c ili glukoza. Ako unos ne navodi eksplicitno HbA1c, kod odbacuje izvučenu vrednost `hba1c`, beleži dvosmislenost i traži dopunu pre bilo kog alata (`apps/server/src/service/glucose-guard.ts`; trace događaj `guard`). Uveden je posle živog baseline-a, u kome je model vrednost šećera upisao kao HbA1c (EV-07, vidi `docs/evaluation.md`).
- **Ograničenje prikaza („bez BMI“).** Studije sa kriterijumom nad izuzetim poljem ne prikazuju se. Statusi preostalih studija se ne menjaju, a ograničenje nije odluka o podobnosti (trace događaj `filter`).

Trace za svaki pokušaj modela beleži ishod validacije (`validation`, `invalidPaths`, `validationCode`, `validationField`) i vrstu greške provajdera (`errorKind`). Beleže se samo nazivi polja i šifre, nikada vrednosti ili tekst odgovora; strogu šemu sprovodi `apps/server/src/trace/redact.ts`. Ovi čuvari pokrivaju navedene obrasce, ne sve moguće dvosmislenosti unosa.

**Objašnjenje modela.** Tekst modela prikazuje se samo kada sve reference prođu proveru citata (izvor tekućeg izvršavanja, tačan podniz) i kada svaki broj u tekstu postoji među vrednostima profila, izvedenim vrednostima, posmatranim vrednostima, pragovima pravila ili brojevima iz dozvoljenih izvora (`apps/server/src/grounding/`). U suprotnom se prikazuje šablon. Trace beleži ishod (`model_explanation_shown`, `fallback:citations`, `fallback:numbers`), a interfejs navodi poreklo objašnjenja. Preostali rizik je semantički netačna parafraza bez brojeva. Prompt `explain_results.v2` zato zabranjuje zbirove, a statusi i presude uvek dolaze od koda.

## Embeddings i lokalni vektorski indeks

OpenAI se koristi samo za embeddings; adapter dozvoljava samo `text-embedding-3-small`. Timeout, 429/5xx i nevalidan odgovor imaju ograničene pokušaje; nakon toga trenutni retrieval nastavlja lexical-only uz označen trag, bez promene modela/provajdera. Ostali non-retryable HTTP statusi ostaju jasna greška adaptera, ali se ne ruše retrieval zahtevi. `OPENAI_API_KEY` se čita samo u serverskom procesu i nikad se ne ispisuje. `OPENAI_BASE_URL` je opcion i prihvata HTTPS (HTTP samo za loopback); pri njegovoj upotrebi korisnik je odgovoran za poverenje u odredište jer se njemu šalje ključ.

Indeksiranje prosleđuje samo javni tekst studija i `sourceQuote` tekst iz validiranih Trial zapisa. Upit pri pretrazi dolazi isključivo iz validiranog sintetičkog profila i kontrolisanog srpsko-engleskog rečnika; sirov unos i ostala polja profila se ne šalju OpenAI embeddings endpoint-u. OpenAI i Gemini ključevi (`OPENAI_API_KEY`, `GEMINI_API_KEY`) ostaju serverski, u lokalnom `.env`/okruženju; `.env` je gitignore-ovan. Testovi i CI koriste deterministički lažni embedder/mock i ne šalju podatke mreži. SQLite indeks i keš su lokalni (`data/index/`) i moraju ostati van git-a.

Kriterijumski tekst je nepouzdan čak i kada je pronađen ili je došao iz lokalnog indeksa. Matcher nikad ne čita rangirani kontekst kao pravilo i ocenjuje sve pregledane kriterijume odabranih studija. Testovi pokrivaju nepretražen exclusion kriterijum i zlonameran tekst u fixture-u i aktivnom 18-study paketu; deterministički statusi ostaju isti, manual kriterijum ostaje `unknown`, a alat van allowlist-e se odbija. Ovo ne predstavlja live proveru otpornosti modela. Ugrađeni SQLite adapter podržava macOS arm64/x64, Linux arm64/x64 i Windows x64; druge platforme odbija umesto tihog fallback-a.

Studijski podaci u demo korpusu dolaze iz ClinicalTrials.gov i preuzeti su 2026-11-16. Pravni pregled nije urađen; uslove korišćenja treba proveriti pre javnog objavljivanja. O pravnom statusu podataka se ovde ne donosi zaključak.
