# Istorijski predlog RAG oznaka za Jovanin pregled — v1

Ovo je istorijski predlog osam upita za ručno označavanje retrieval relevantnosti u `clinicaltrials-20` korpusu. Oznake su naknadno pregledane i sačuvane u [`retrieval-v4-jovana-clinicaltrials20-2026-11-19.json`](./retrieval-v4-jovana-clinicaltrials20-2026-11-19.json): sedam ranking slučajeva i jedan negativan slučaj. Anotacija nije klinički pregled. Tabela ispod čuva fokus prvobitnog predloga.

Oznake služe samo za retrieval relevantnost. Ne potvrđuju medicinsku prikladnost studije, matcher mapiranje ni klinički prag. Ako klinički osetljiva očekivanja ne pregleda Jelena, u pratećoj dokumentaciji označiti da pregled nije bio klinički.

| Predlog ID | Upit za pretragu                                                                      | Fokus za anotaciju                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| J-RAG-01   | Ćirilični upit o dijabetesu tipa 2 i gojaznosti                                       | Da li transliteracija i sinonimi nalaze studije i odlomke koji zaista obuhvataju te pojmove.                                      |
| J-RAG-02   | Dijabetes tipa 2 uz bubrežnu bolest, dijabetičku nefropatiju ili eGFR                 | Odvojiti relevantnost studije/passage-a od profila sa kreatininom; kreatinin nije eGFR.                                           |
| J-RAG-03   | Dijabetes tipa 2 uz masnu jetru/NAFLD i cilj smanjenja jetrene masti                  | Proveriti studije i kriterijumske odlomke povezane sa jetrenim stanjem i populacijom.                                             |
| J-RAG-04   | Kontinuirano praćenje glukoze kod osoba sa dijabetesom tipa 2 koje ne koriste insulin | Proveriti relevantnost studija i odlomaka o CGM-u i populaciji bez insulina.                                                      |
| J-RAG-05   | Praćenje bezbednosti kod starijih odraslih sa dijabetesom tipa 2                      | Proveriti šta izvor kaže o starijoj populaciji; ne zaključivati podobnost iz same starosti.                                       |
| J-RAG-06   | Perioperativna kontrola glikemije kod T2D uz parenteralnu ishranu                     | Proveriti specifičnu populaciju/intervenciju i ne svoditi je na opštu T2D relevantnost.                                           |
| J-RAG-07   | Negativni upit: celijakija bez dijabetesa tipa 2                                      | Pregledati svih 20 studija pre nego što se potvrde prazne relevantne liste; ovo je predlog, ne unapred potvrđen negativan slučaj. |
| J-RAG-08   | Novo dijagnostikovan dijabetes tipa 2 i terapija metforminom                          | Proveriti relevantnost studija i passage-a koji zaista opisuju novu dijagnozu ili metformin.                                      |

Opcioni behavior slučaj van ovih osam relevance oznaka: nepotpuni profil koji sadrži samo uzrast, bez dijagnoze ili kliničkog pojma. Proveriti fallback ponašanje; ne unositi relevantne liste i ne bodovati ga ranking metrikama.

## Polja za Jovaninu anotaciju

U prvobitnom predlogu je traženo da se za svaki od osam slučajeva popune relevantne `trialId` vrednosti (sve relevantne studije), relevantne `passageId` vrednosti i kratko obrazloženje iz izvornog teksta, `reviewer`, datum i `labelStatus`, kao i da li je pregled klinički obavljen. Anotacije su završene; pogledati verzionisani skup iznad.

Nakon anotacije napraviti novu verzionisanu immutable dataset datoteku. Ne menjati `retrieval-v1`, `retrieval-v2`, `retrieval-v3-adjudicated` ni stare baseline fajlove.
