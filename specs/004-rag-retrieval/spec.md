# Specifikacija: Hibridni RAG za TrialMatch

**Funkcionalnost**: `004-rag-retrieval`  
**Datum**: 2026-11-15  
**Status**: Implementacija u toku; korisnik je odobrio SQLite + sqlite-vec i jedan `embeddings:check` sintetički poziv je uspeo; `index:build` još nije pokrenut.  
**Nadovezuje se na**: [specifikaciju Faze 2](../003-phase-2-live-integration/spec.md), bez izmene njenih AC ID-jeva.

Jezički model čita pravila i objašnjava rezultat. Odluku donosi deterministički kod. RAG pronalazi studije i kontekstualne odlomke; ne određuje ishod podobnosti.

## Granice i nepromenljivi zahtevi

- Retrieval bira samo studije koje ulaze u razmatranje. Matcher za svaku izabranu studiju ocenjuje sve pregledane kriterijume iz podataka, ne samo kriterijume čiji su odlomci vraćeni retrieval-om.
- Rangirani odlomci služe za kontekst objašnjenja i citata. Odlomci su nepouzdani podaci; tekst ne može menjati matcher, pitanja, alate ni presude.
- Postojeće stabilne source ID-jeve i serversku proveru citata treba očuvati. Svaki citat mora biti iz izvora dostupnog u konkretnom run-u i verifikovan nad originalnim tekstom.
- Novi zahtevi koriste prefiks `RAG-`; postojeći AC ID-jevi iz `003` se ne preimenuju niti menjaju značenje.
- Pipeline mora raditi nad `data/trials/` i `data/fixtures/`. Novi ili izmenjeni izvori ulaze ponovnim pokretanjem `index:build`.
- CI, testovi i offline evaluacija nikad ne pozivaju embeddings ili druge plaćene servise.

## Korisnički scenariji

### US1 — Relevantne studije i izvori iz validiranog profila

Validiran strukturisani sintetički profil postaje retrieval upit. Srpski koncepti se prevode u jezik korpusa determinističkim, verzionisanim terminološkim rečnikom; sirovi profilni tekst se ne šalje embedding servisu. Poznate vrednosti mogu doprineti upitu, ali nedostajuće/ambivalentne vrednosti se ne izmišljaju.

Metapodaci mogu ograničiti skup studija samo po poznatim, dozvoljenim filterima. Ako nema dijagnoze ni drugog pretraživog koncepta, sistem vraća sve studije koje prođu metadata filtere, sortirane stabilno po normalizovanom ID-ju, līdz `maxCandidates` limitu. Nije dozvoljeno uzimati prvih N zapisa ulaznog fajla.

### US2 — Hibridna pretraga uz očuvan matcher

Sistem pretražuje studije po naslovu, stanjima i sažetku, a zatim i kriterijumske odlomke. Leksički i vektorski rezultati se kombinuju Reciprocal Rank Fusion-om. Studijski i odlomkovni embeddings su odvojeni nivoa, jer numerički kriterijumi sami po sebi slabo predstavljaju semantičku temu studije.

Posle odabira studija, matcher dobija kompletan kriterijumski niz iz svake izabrane studije. Čak i kada retrieval nije stavio exclusion odlomak u kontekst, matcher mora oceniti taj exclusion kriterijum; poznato kršenje i dalje daje `excluded`.

### US3 — Ponovljiv indeks

Lokalni `index:build` čita sve podržane izvore u `data/trials/` i `data/fixtures/`, izračunava hash-eve, ponovo koristi embedding keš po hash-u teksta i modela, i piše indeks sa manifestom. Manifest beleži embedding model, dimenziju, verzije i hash-eve korpusa/odlomaka, kao i verziju normalizacije. Indeksni fajlovi su generisani lokalni artefakti i ne commit-uju se.

Pre stvarnog poziva indeksiranja alat prikazuje procenu tokena. Ako se pređe konfigurisani prag, traži se potvrda pre slanja bilo kakvog teksta. Greška ključa, naloga ili modela je eksplicitna; nema promene modela ili providera kao fallback-a.

### US4 — Merljiva offline i live evaluacija

Verzionisan retrieval skup sadrži sintetičke profile/upite, relevantne studije i tačne relevantne odlomke i vezan je za verziju i hash korpusa. Skup se ljudski potvrđuje i zamrzava pre izmena retrieval-a. Na istim ID-jevima slučajeva meri se postojeći MiniSearch baseline, pa leksički, vektorski, hibridni i rerankovani pristupi.

Metrike uključuju recall@k, precision@k, MRR, nDCG, stabilnost tie-break-a, citatnu validnost i granicu konteksta. Poređenje beleži kašnjenje i paritet rezultata implementacija `VectorStore`.

`eval:rag:offline` koristi samo lažni deterministički embedder i ne pristupa mreži. `eval:rag:live` traži eksplicitnu potvrdu, prikazuje procenjeni broj embeddings/LLM poziva i trošak pre slanja, i beleži modele/verzije/ishode. Live rezultati se nikada ne biraju po najboljem pokušaju.

Generisanje se dodatno procenjuje RAGAS-stil metrikama `faithfulness`, `answer relevancy`, `context precision` i `context recall` u TypeScript-u, uz ograničen LLM sudija preko postojećeg adaptera. Te metrike mere odgovor/kontekst i ne menjaju determinističke ishode. Opciono se rezultati izvoze u format pogodan za Python RAGAS alate.

## Zahtevi i kriterijumi prihvatanja

| ID | Zahtev | Kriterijum prihvatanja |
|---|---|---|
| RAG-01 | Upit se gradi samo od `ProfileSchema` validiranog profila. | Nijedna retrieval/embedding funkcija ne prima sirov korisnički tekst. Nepoznate vrednosti ostaju odsutne. |
| RAG-02 | Srpski termini rade nad engleskim korpusom. | Verzionsani deterministički rečnik normalizuje podržane termine; testovi pokrivaju srpske upite i engleske izvore. Nema slobodnog prevoda modelom u retrieval putanji. |
| RAG-03 | Ponašanje bez dijagnoze je eksplicitno. | Bez pretraživog koncepta vraćaju se svi metadata-dozvoljeni zapisi do limita u stabilnom ID redosledu, nikad početni ulazni redosled. |
| RAG-04 | Metadata filtering ne nagađa. | Filteri koriste samo poznata, normalizovana polja; nepoznate vrednosti ne postaju tvrdi exclusion filteri. |
| RAG-05 | Obim kandidata je odvojen od obima kriterijumske procene. | Matcher dobija sve pregledane kriterijume svake izabrane studije. Test dokazuje da nepretražen exclusion kriterijum i dalje daje `excluded`. |
| RAG-06 | Leksički retrieval radi na studiji i odlomku. | MiniSearch indeksira relevantne tekstualne/metapodatkovne prikaze; tie-break je deterministički. |
| RAG-07 | `VectorStore` je zamenljiv. | Postoji memorijska implementacija za testove/CI/offline i odobrena ugrađena implementacija za lokalni/demo/live rad; zajednički ugovorni test proverava paritet. |
| RAG-08 | Embeddings su kontrolisani. | Dozvoljen je samo `text-embedding-3-small`; nedostupan ključ/model daje jasnu grešku, bez fallback-a. Indeks manifestuje vektorsku dimenziju. |
| RAG-09 | Indeksiranje je inkrementalno i ograničeno. | `index:build` prihvata oba data-root-a, kešira hash teksta+modela, prikazuje procenu pre poziva, traži potvrdu preko praga i poštuje batch/timeout/retry/max-chunks. |
| RAG-10 | Fuzija je ponovljiva. | RRF kombinuje rangove bez uvođenja presude; deterministički reranker i stabilni NCT ID tie-break daju isti red za isti snapshot. |
| RAG-11 | Kontekst i citati su bezbedni. | Kontekst ne prelazi `MAX_CONTEXT_CHARS`; ID-jevi i postojeća server provera citata ostaju; studijski tekst je jasno označen kao nepouzdan. |
| RAG-12 | Zlonameran odlomak ne menja matcher. | Adversarial fixture može dospeti u kontekst kao nepouzdan tekst; alatni izlaz/presude/pitanja ostaju funkcija samo validiranog profila, pregledanih kriterijuma i determinističkog koda. |
| RAG-13 | Retrieval dataset i baseline su zamrznuti. | Ručno pregledan skup sadrži srpske/engleske slučajeve, relevatne studije/odlomke, hash-eve korpusa i verziju. Pre bilo kakve izmene retrieval-a snima se nepromenljiv MiniSearch baseline. |
| RAG-14 | Retrieval metrike su proverljive. | Isti case ID-jevi mere retrieval pristupe po recall@k, precision@k, MRR, nDCG, tie-break determinističnosti, citatima i kontekstu. |
| RAG-15 | Generisanje ima odvojenu RAGAS-stil evaluaciju. | TS implementacija računa četiri navedene metrike uz ograničen, eksplicitno odobren live sudija; offline testovi koriste determinističke odgovore i nikad mrežu. |
| RAG-16 | Live trošak je vidljiv pre poziva. | Live evaluator prikazuje pozive/model/trošak procenjen pre početka, zahteva eksplicitnu potvrdu i beleži stvarni rezultat bez biranja najboljeg pokušaja. |
| RAG-17 | Podaci upućeni embedding provajderu su dokumentovani. | `docs/data-map.md` navodi da se šalju samo javni tekst studija i deterministički upit izveden iz sintetičkog validiranog profila; tajne ostaju serverske. |

## Ograničenja isporuke

Prvi paket u trajanju od 2–3 radna dana isporučuje se kao minimalna hibridna pretraga sa merenjem. LLM reranker, paritet performansi dve ugrađene baze i dodatni RAGAS export rade se samo ako ostane vremena; ne smeju odložiti korektnost granice matcher/retriever, baseline, embedding index i offline testove.

Izbor ugrađene baze: SQLite `node:sqlite` + `sqlite-vec@0.1.9`, kupljen/instaliran je uz korisničko odobrenje. `pnpm sqlite:smoke` i ciljane offline VectorStore testove treba/je potrebno izvesti pre oslanjanja na indeks; stvarni embeddings check i index build ostaju zasebni, eksplicitni koraci. Retrieval anotacije su assistant-authored nacrt i njihove metrike ne smeju se predstavljati kao validiran kvalitet pre ljudske adjudikacije.
