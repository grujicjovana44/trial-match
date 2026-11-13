# Bezbednosne granice

## Podaci i poverenje

- Profilni ulazi moraju biti sintetički. Ne unosite stvarne podatke pacijenata.
- Offline provere ne pozivaju Gemini. Direktan server zahteva `GEMINI_API_KEY`; `pnpm dev` eksplicitno postavlja mock režim. Živi poziv nije izvršen u ovoj sesiji.
- `.env.example` sadrži samo bezbedne vrednosti. Tajne ne pripadaju repozitorijumu ni klijentu.
- Studijski tekst je nepouzdan sadržaj; ne može definisati alat, pozvati kod ili promeniti determinističko pravilo.

## Sprovođenje

Zahtevi, podaci sa diska, argumenti alata i odgovori proveravaju se runtime Zod šemama. API ograničava veličinu ulaza i učestalost poziva. Alati imaju allowlist i vremensko ograničenje. Citati se proveravaju prema izvornim odlomcima tekućeg izvršavanja. UI ispisuje tekst kao tekst i koristi React escaping.

Trenutna ograničenja: run store, idempotency cache i rate limits su process-local; restart briše stanje. Testovi bezbednosti i šeme ne dokazuju semantičku potkrepljenost providerskog odgovora. Ključ, poreklo endpoint-a i upita, uslovi korišćenja, ljudski pregled pravila, cena i live transport nisu potvrđeni. Lokalni eval guard traži odobren opseg; cena nije dostupna bez proverenog cenovnika.

Offline evaluacioni tragovi prolaze kroz fiksnu allowlist-u metapodataka; sirov profil, vrednosti okruženja, tajne i unutrašnje rezonovanje se ne zapisuju. Ovo ne zamenjuje bezbednosni pregled tragova stvarnog modela u Fazi 2.

Gemini ključ čita samo serverski proces iz okruženja. CORS dozvoljava samo podešeni loopback origin i izlaže `Retry-After`. API odgovori prolaze stroge shared šeme; tragovi koriste allowlist-u metapodataka i događaja i ne čuvaju profile, tela odgovora provajdera ni ključeve.
