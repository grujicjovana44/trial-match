# Jelena Kantarević — CAP-08

Stanje na 23. 11. 2026. Planirani zajednički tag za predaju je `capstone-v1`; njegovo kreiranje još nije potvrđeno.

## Tehnički doprinos u Fazi 2

Moj glavni doprinos obuhvatao je pripremu i integraciju stvarnih kliničkih studija, obradu kriterijuma za uključivanje i isključivanje pacijenata, proveru rada RAG sistema nad stvarnim podacima, ispravku indeksiranja i integraciju drugih funkcionalnosti u zajednički projekat.

- `8d319ba` — radila sam na uvozu 18 novih stvarnih studija povezanih sa dijabetesom tipa 2 i pripremi njihovih kriterijuma za dalju obradu. Izmene su evidentirane na grani `feature/add-t2d-studies` i uključene kroz PR #4.
- Pregledala sam izvorni sadržaj 18 studija i njihovih 300 kriterijuma, vodeći računa o očuvanju originalnog teksta, identifikatora kriterijuma, izvornih citata i povezanosti sa odgovarajućim studijama.
- Radila sam na pripremi podataka i pravila za deterministički matcher, uključujući proveru numeričkih pragova, operatora poređenja i razdvajanje automatski podržanih od složenih kriterijuma koji zahtevaju dodatni pregled.
- Radila sam na RAG integraciji i evaluaciji nad stvarnim studijama, uključujući proveru rezultata retrieval-a, relevantnosti pronađenih odlomaka i citata. Dokumentovala sam četiri dodatna evaluaciona predloga RAG-P001–P004 u `eval/rag/JELENA_REVIEW.md`.
- Uočila sam problem neusaglašenosti RAG indeksa sa aktivnim korpusom. Ispravljena je skripta `scripts/index-build.ts` tako da uvažava `DATASET_PROFILE`, uz odgovarajuću regresionu proveru. Nakon ispravke uspešno je izgrađen indeks za 20 studija i 350 tekstualnih dokumenata.
- Učestvovala sam u integraciji funkcionalnosti glasovnog unosa iz Aleksine grane `feature/002-voice-input`, proverila kompatibilnost sa postojećim sistemom i izvršila automatizovane testove pre spajanja.
- Radila sam na ažuriranju dokumentacije o kriterijumima, poreklu studija, integraciji i evidenciji dokaza.

Moj rad na RAG sistemu odnosio se prvenstveno na korišćenje i integraciju stvarnog korpusa, proveru rezultata i ispravke, dok je Jovana razvijala osnovnu hibridnu retrieval arhitekturu i RAGAS evaluacioni okvir.

Pregled izvornog sadržaja studija nije isto što i odobravanje svakog kriterijuma za automatsko izvršavanje u matcher-u.

## Odluka i provera

Jedna od važnih tehničkih odluka bila je da se u daljem razvoju koriste stvarne kliničke studije sa proverljivim izvorima, uz jasno razdvajanje originalnog teksta kriterijuma od strukturisanih pravila za automatsku proveru.

Kriterijumi često sadrže numeričke pragove, vremenske uslove, kombinacije više ograničenja i medicinske formulacije koje nije moguće pouzdano svesti na jednostavno poređenje.

Zbog toga sam pri njihovoj pripremi vodila računa da se automatsko izvršavanje omogući samo za odgovarajuće pregledana i podržana pravila, dok složeni ili nepotvrđeni kriterijumi zadržavaju status `manual_review` ili `unknown`.

Druga važna provera odnosila se na RAG indeksiranje. Prilikom prelaska na korpus od 20 studija pojavila se greška da indeks sadrži dokumente koji nisu prisutni u aktivnom korpusu.

Analizom je utvrđeno da skripta za izgradnju indeksa ne koristi dosledno izabrani `DATASET_PROFILE`, već učitava i podatke iz drugih skupova.

Nakon ispravke skripte i regresionog testa ponovo sam pokrenula izgradnju indeksa komandom:

`corepack pnpm index:build`

Rezultat je bio uspešno kreiran indeks sa 20 studija i 350 tekstualnih dokumenata, usklađen sa aktivnim korpusom.

U proveri matcher-a korišćeni su i ciljani testovi numeričkih operatora `<`, `<=`, `>` i `>=`, uz proveru očekivanog ponašanja za različite granične vrednosti.

Ove provere potvrđuju tehničku konzistentnost obrađenih podataka i podržanih pravila, ali ne predstavljaju dokaz kliničke ispravnosti svih kriterijuma niti ukupnog semantičkog kvaliteta RAG pretrage.

## Primer pregleda tuđeg rada

Pregledala sam Aleksine izmene za glasovni unos profila pacijenta, pripremljene na grani `feature/002-voice-input`.

Implementacija je obuhvatala komponentu `VoiceInput.tsx`, hook `useSpeechRecognition.ts`, pomoćne funkcije za obradu govora, izmene korisničkog interfejsa i odgovarajuće testove.

Granu sam integrisala u postojeći projekat komandom:

`git merge --no-commit --no-ff origin/feature/002-voice-input`

Spajanje je završeno bez konflikata. Pre kreiranja završnog merge commita pokrenula sam automatizovane provere:

- `corepack pnpm typecheck` — PASS
- `corepack pnpm lint` — PASS
- `corepack pnpm test` — PASS, 307/307 testova u 61 testnom fajlu
- `corepack pnpm build` — PASS

Ovim proverama potvrđena je kompatibilnost novih funkcionalnosti sa postojećim API, RAG i matcher komponentama, kao i prolazak testova za glasovni unos i prikaz rezultata.

Tokom build procesa pojavilo se upozorenje o veličini JavaScript paketa, ali se build uspešno završio.

Pregled potvrđuje prolazak lokalnih automatizovanih provera nakon integracije. Ne predstavlja zasebnu potvrdu prepoznavanja govora pomoću stvarnog mikrofona u browser-u.

## Mesto u glavnom toku i ograničenja

Moj doprinos povezuje stvarne kliničke podatke sa postojećim TrialMatch workflow-om.

Korisnik unosi sintetički profil pacijenta tekstom ili glasom. Sistem izdvaja relevantne podatke, koristi RAG za pronalaženje odgovarajućih studija i njihovih kriterijuma, a zatim deterministički matcher proverava samo odobrena strukturisana pravila.

Rezultati se prikazuju zajedno sa izvornim citatima, a kada određeni podatak nedostaje, kriterijum ne sme biti proglašen ispunjenim ili neispunjenim bez odgovarajućeg osnova.

Moj rad na korpusu omogućio je proširenje sistema sa početnih sintetičkih primera na stvarne studije, uz očuvanje identifikatora i originalnih kriterijuma.

Usklađivanje RAG indeksa sa aktivnim korpusom bilo je važno kako sistem ne bi pretraživao zastarele ili nepovezane dokumente.

Glavna ograničenja odnose se na složene kriterijume koji nisu automatizovani, nedovoljno široku nezavisnu evaluaciju RAG kvaliteta, nepotpuno dokumentovano poreklo i paginaciju prvobitnog snimka od 50 studija i činjenicu da sistem ne donosi medicinske odluke.

Prema dokumentovanom stanju, od 300 kriterijuma u paketu od 18 dodatnih studija, 27 ima pregledana automatska pravila, dok 273 ostaju `manual_review`/`unknown`. Pregled originalnog sadržaja ne znači da su svi kriterijumi odobreni za automatizaciju.

## Primer upotrebe AI-ja

Tokom rada na projektu koristila sam AI asistente, uključujući GitHub Copilot i ChatGPT, kao pomoć pri razumevanju postojećeg koda, pripremi izmena, analizi grešaka, pisanju testova i dokumentovanju rezultata.

Konkretan primer bio je rešavanje problema neusaglašenosti RAG indeksa sa aktivnim korpusom kliničkih studija.

Prilikom izgradnje indeksa sistem je prijavio da sadrži dokumente koji ne pripadaju trenutno izabranom korpusu. Uz pomoć AI asistenta analizirala sam način učitavanja studija, korišćenje `DATASET_PROFILE` konfiguracije i ponašanje skripte `scripts/index-build.ts`.

Nakon identifikovanja problema pripremljena je izmena skripte i regresiona provera. Rezultat sam proverila ponovnim pokretanjem indeksiranja, kada je uspešno izgrađen indeks za 20 studija i 350 tekstualnih dokumenata.

AI sam koristila i tokom pripreme i analize kriterijuma kliničkih studija, ali nisam tretirala automatski predložena pravila kao potvrđena. Originalne tekstove studija sam pregledala i razlikovala potvrdu sadržaja od odobravanja automatizovanog matcher pravila.

Time su AI alati korišćeni kao pomoć u analizi i implementaciji, dok su rezultati proveravani kroz testove, izlaze izvršenih komandi i poređenje sa izvornim podacima.