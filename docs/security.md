# Bezbednosne granice

## Podaci i poverenje

- Profilni ulazi moraju biti sintetički. Ne unosite stvarne podatke pacijenata.
- Faza 1 ne koristi mrežu ni stvarni LLM provajder; testovi ne pozivaju plaćene API-je.
- `.env.example` sadrži samo bezbedne vrednosti. Tajne ne pripadaju repozitorijumu ni klijentu.
- Studijski tekst je nepouzdan sadržaj; ne može definisati alat, pozvati kod ili promeniti determinističko pravilo.

## Sprovođenje

Zahtevi, podaci sa diska, argumenti alata i odgovori proveravaju se runtime Zod šemama. API ograničava veličinu ulaza i učestalost poziva. Alati imaju allowlist i vremensko ograničenje. Citati se proveravaju prema izvornim odlomcima tekućeg izvršavanja. UI ispisuje tekst kao tekst i koristi React escaping.

Trenutna ograničenja: stanje se čuva u memoriji; DEMO adapter je heuristički; offline provere ne dokazuju bezbednost budućeg živog modela. Za Fazu 2 biće potreban zaseban pregled serverskog provajdera, secrets-a, prompt injection-a, budžeta, redakcije trace-a i stvarnih uslova korišćenja korpusa.

Offline evaluacioni tragovi prolaze kroz fiksnu allowlist-u metapodataka; sirov profil, vrednosti okruženja, tajne i unutrašnje rezonovanje se ne zapisuju. Ovo ne zamenjuje bezbednosni pregled tragova stvarnog modela u Fazi 2.
