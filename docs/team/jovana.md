# Jovana Grujić — CAP-08

Stanje na 23. 11. 2026. Planirani zajednički tag za predaju je `capstone-v1`; njegovo kreiranje još nije potvrđeno.

## Tehnički doprinos u Fazama 1 i 2

Moj doprinos obuhvata postavljanje tehničkih osnova projekta, izradu SpecKit dokumentacije, implementaciju prve DEMO verzije TrialMatch aplikacije i razvoj RAG sistema sa evaluacionim okvirom.

**Faza 1 — SpecKit i DEMO aplikacija**

- `dcdbc20a` — postavila sam SpecKit strukturu i pripremila početnu tehničku dokumentaciju: projektne zahteve, kriterijume prihvatanja, constitution, arhitekturu, model podataka, API i AI ugovore, implementacioni plan, zadatke i pristup evaluaciji. Dokumentovala sam tehnološki stek, formule, konverzije i testne vrednosti.
- `4d619e72` — implementirala sam početnu funkcionalnu DEMO verziju aplikacije. Postavila sam pnpm monorepo, Fastify backend, React frontend, zajedničke Zod šeme, deterministički matcher, mock AI adapter, sintetičke podatke i početni okvir za evaluaciju i testiranje.
- `e9f23f94` — radila sam na ispravkama GitHub Actions konfiguracije radi pouzdanijeg izvršavanja automatizovanih provera.

**Faza 2 — RAG i evaluacija**

- `e0476bcb` — implementirala sam osnovu hibridnog RAG sistema, uključujući leksičku i vektorsku pretragu, embeddings i početnu evaluaciju.
- `092a577b` — unapredila sam RAG evaluacionu šemu.
- `4faf2ce9` — dodala sam multi-query retrieval, filtriranje rezultata, reranking i offline evaluaciju.
- `cdfd9800` — radila sam na pripremi i evidentiranju ljudski pregledanih oznaka za RAG evaluaciju.
- `2eebe171` — implementirala sam izgradnju stvarnog RAG indeksa, retrieval trace i nDCG evaluaciju.
- `eb0055a0` — ažurirala sam dokumentaciju, evidenciju dokaza i regresione testove.

U okviru RAG sistema implementirala sam kombinovanje leksičke i vektorske pretrage, normalizaciju termina između srpskog i engleskog jezika i spajanje rangova metodom Reciprocal Rank Fusion (RRF). Dodati su filteri, pragovi relevantnosti i mogućnost dodatnog rangiranja pronađenih rezultata.

Implementirala sam i lokalni evaluacioni okvir po uzoru na RAGAS, sa metrikama faithfulness, answer relevancy, context precision i context recall. Ove metrike su heurističke i razlikuju se od nezavisne evaluacije pomoću LLM-as-judge pristupa.

## Odluka i provera

Jedna od ključnih tehničkih odluka bila je izbor hibridne pretrage umesto isključivo vektorske.

Hibridna pretraga omogućava kombinovanje preciznog pronalaženja medicinskih termina, numeričkih pragova i identifikatora kroz leksičku pretragu sa pronalaženjem semantički sličnog sadržaja pomoću embedding modela.

Razmatrala sam i različite pristupe rerankingu. U sistemu su implementirane i evaluirane konfiguracije lexical, vector, hybrid i hybrid sa rerankerom.

Za poređenje su korišćene metrike precision, recall, Mean Reciprocal Rank (MRR) i normalized Discounted Cumulative Gain (nDCG), posebno za relevantne studije i tekstualne odlomke.

Na ograničenom evaluacionom skupu zabeleženi su sledeći rezultati:

| Konfiguracija | nDCG@10 |
|---|---:|
| Hybrid | 0,747 |
| Hybrid + deterministički reranker | 0,503 |
| Hybrid + Cohere reranker | 0,892 |

Deterministički reranker nije zadržan kao podrazumevani izbor, dok se Cohere koristi u live režimu kada je dostupan odgovarajući API ključ.

Dodatno sam implementirala mehanizme koji proveravaju usklađenost RAG indeksa sa aktivnim korpusom i omogućavaju fallback na leksičku pretragu kada embedding model ili reranker nisu dostupni. Sistem beleži razlog fallback-a kako bi ponašanje bilo proverljivo.

Rezultati evaluacije odnose se na ograničen skup upita i ne predstavljaju dokaz generalizacije na sve kliničke studije.

## Primer pregleda tuđeg rada

U Fazi 2 pregledala sam Jelenin rad na uvozu 18 novih stvarnih kliničkih studija povezanih sa dijabetesom tipa 2 i pripremi njihovih kriterijuma za dalju obradu.

Rad je evidentiran commitom `8d319ba` na grani `feature/add-t2d-studies`. Otvorila sam PR #4 i spojila ga u `main` 16. 11. 2026. kroz merge commit `1820927`.

Pregled se odnosio na Jelenin implementacioni rad, pripremu i integraciju studija i kriterijuma u postojeći sistem. Pri tome je bilo važno očuvati originalni tekst kriterijuma, identifikatore i reference na izvore, kao i razdvojiti pripremu podataka od odobravanja strukturisanih matcher pravila.

Nakon integracije ažurirala sam dokumentaciju i evidenciju dokaza kroz commit `eb0055a0`.

GitHub Actions provere povezane sa Jeleninim commitom, otvaranjem PR-a, merge commitom i dokumentacionim izmenama završile su se uspešno. To potvrđuje prolazak automatizovanih provera za te revizije, ali ne predstavlja nezavisnu validaciju svih 300 kriterijuma.

## Mesto u glavnom toku i ograničenja

Moj doprinos obuhvata dve povezane celine TrialMatch sistema.

U Fazi 1 postavila sam tehničku i specifikacionu osnovu projekta i implementirala početnu DEMO aplikaciju, koja omogućava unos sintetičkog profila pacijenta, validaciju podataka, izvršavanje početnog determinističkog matchera i prikaz rezultata.

U Fazi 2 razvila sam RAG mehanizam koji pronalazi relevantne studije i tekstualne odlomke iz korpusa stvarnih kliničkih studija.

RAG služi za pronalaženje izvora i pružanje konteksta, dok konačnu proveru odobrenih strukturisanih kriterijuma obavlja deterministički matcher. Semantička sličnost ne predstavlja potvrdu medicinske podobnosti pacijenta.

Sistem omogućava fallback na leksičku pretragu kada semantičke komponente nisu dostupne, kao i proveru da citati odgovaraju dostupnom izvornom sadržaju.

Ograničenja uključuju mali evaluacioni skup, zavisnost pojedinih funkcionalnosti od eksternih API servisa, nepotpunu automatizaciju složenih kriterijuma i činjenicu da lokalne RAGAS-style metrike predstavljaju heuristike, a ne nezavisnu LLM evaluaciju.

U aktivnom paketu od 18 dodatnih studija, prema dokumentovanom stanju, 27 kriterijuma ima automatska pravila sa odgovarajućim pregledom, dok 273 ostaju `manual_review`/`unknown`. Ovi statusi ne predstavljaju medicinsku procenu podobnosti pacijenta.

## Primer upotrebe AI-ja

Tokom razvoja projekta koristila sam Codex, GitHub Copilot i Claude kao pomoć pri pisanju i analizi koda, pripremi SpecKit dokumentacije, implementaciji funkcionalnosti i razmatranju tehničkih rešenja.

Konkretan primer upotrebe AI-ja bio je izbor arhitekture RAG sistema. Prilikom projektovanja nisam bila sigurna da li da implementiram isključivo vektorsku ili hibridnu pretragu. Uz pomoć AI alata analizirala sam prednosti i ograničenja oba pristupa, nakon čega sam se odlučila za hibridnu pretragu koja kombinuje leksičko i semantičko pronalaženje relevantnih studija.

AI sam koristila i prilikom izbora rerankera. Predložena su mi četiri različita rešenja, zajedno sa objašnjenjem njihovih prednosti, mana i tehničkih kompromisa. Ovo poređenje mi je pomoglo da odaberem pristup koji odgovara potrebama TrialMatch projekta.

Preporuke AI-ja nisam tretirala kao dovoljan dokaz kvaliteta. Implementirala sam različite konfiguracije pretrage i uporedila ih kroz evaluacione metrike. Na ograničenom evaluacionom skupu Cohere reranker je ostvario bolji nDCG@10 rezultat od hibridne pretrage bez rerankera i determinističkog rerankera.

Na taj način AI alati su mi pomogli da razumem alternative i donesem tehničke odluke, dok sam njihove rezultate proveravala kroz implementaciju i evaluaciju.