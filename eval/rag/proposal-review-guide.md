# Jelena: ručni pregled RAG predloga

Ovaj dokument priprema pregled; ne predstavlja oznake kao potvrđene. Predlozi su u `retrieval-proposals-v1.json`, vezani za `rag-retrieval-v2` i `rag-corpus-v0-dev`. Nemoj menjati v2 gold skup.

## Predmeti za pregled

| ID       | Profil / predlog                                                                | Šta pregledati                                                                                                                                              |
| -------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RAG-P001 | Ćirilični upit za T2D i gojaznost; NCT07924436, `inc-3`, `inc-5`                | Potvrditi ili ispraviti relevantnost studije i svakog passage ID-ja prema originalnom zapisu i istom pravilu kao RAG-001.                                   |
| RAG-P002 | Starost 20, T2D, HbA1c 9.8%, kreatinin 2.1 mg/dL; NCT07409714, `exc-4`, `exc-5` | Potvrditi renalnu relevantnost. Kreatinin nije eGFR; ne zaključivati laboratorijski parametar koji profil ne sadrži. Proveriti citate u originalnom zapisu. |
| RAG-P003 | Negativni upit za celijakiju; predlog bez relevantnih studija/passage-a         | Proveriti svih pet studija snapshot-a; dodati sve relevantne ID-jeve ako ih ima. Prazan odgovor nije unapred potvrđen.                                      |
| RAG-P004 | Nepotpuni profil samo sa uzrastom 22                                            | Proveriti očekivanje stabilnog fallback-a, bez izvođenja dijagnoze iz uzrasta; ovo je behavior slučaj i ne ulazi u ranking metrike.                         |

## Kako zabeležiti odluku

Za svaki slučaj Jelena treba da navede `confirmed`, `corrected` ili `rejected`, svoje ime/inicijale, datum, razlog, proverene trial/passage ID-jeve i izvorne URL-ove. Ispraviti predložene ID-jeve samo u novoj adjudikovanoj verziji (nikad u frozen v2); sačuvati reviewer/date i promenu kao diff. Za rangirajuće slučajeve proveriti i sve relevantne kandidate iz kompletnog petostudijskog korpusa, naročito P003. Tek nakon pregleda napraviti immutable dataset sa novim ID/hash-om i odvojiti ga po studijama u dev/test; evaluacija trenutnog queue-a nije gold rezultat.

## Strukturisana matcher pravila

Izvorni tekst studije i matcher pravilo su odvojene odobrenja. Za svaki kriterijum potreban za automatizovano poređenje:

1. Sačuvati originalni eligibility quote, study/source URL, fetch datum/hash i izdvojeni kriterijum ID.
2. Pripremiti draft strukturisanog pravila sa operatorom, vrednošću/jedinicom, polarity, populacijom i citatom; ne pretvarati nepoznato ili nedostajući podatak u ispunjeno/neispunjeno.
3. Reviewer pregleda semantiku prema originalu, potvrđuje ili ispravlja polja, beleži odluku, reviewer/date i razlog za svaki criterion ID. Odbijene/nejasne stavke ne ulaze u automatizaciju.
4. Postojeći `rules:review-template`/`compile:rules` ugovor trenutno odobrava kompletan skup kriterijuma na nivou studije (hash `rulesHash` pokriva ceo draft studije), ne pojedinačni kriterijum. Zato pripremiti draft sa samo eksplicitno prihvaćenim kriterijumima i njegovim review hash-om; ne označiti studiju `approved` dok skup/hash nije pregledan.
5. Pokrenuti compile samo nad studijama čiji tačan draft i izvorni hash su odobreni; proveriti `review-report.json`, included/excluded stavke i package hash. Ako je kriterijum-level approval hi-tech zahtev nezavisan od studije, prvo treba proširiti toolchain da čuva individualne approval records—trenutni workflow to sam ne dokazuje.
6. Ostatak ostaje `manual_review` i matcher `unknown`; nikakvo grupno odobrenje 300 kriterijuma.

Do završetka ljudskog pregleda, sva četiri RAG predloga imaju `labelStatus: proposed`, `reviewer: TODO`, `reviewedAt: TODO` i evaluator ih mora isključiti.
