# Istraživanje i odluke za 003

Datum 2026-11-12; lokalni pregled HEAD-a `2c1536c` i naknadno odobreno čitanje Gemini dokumentacije, navedeno ispod. Statički pregled nije izvršni dokaz. SpecKit interna istraživačka/dizajn faza nije Faza 1/2 iz brief-a. Po izričitom promptu nezavisni artefakti se dovršavaju i uz otvorene odluke; zavisni ugovori ostaju nacrt.

## Razjašnjenja potvrđena 2026-11-12

| ID | Odgovor korisnika | Odluka / posledica |
|---|---|---|
| Q1 | Aleksa je izvršio A, Jelena pregledala dosadašnji rad, Jovana napravila osnovu i sve pre Aleksinog dela. | Evidentirati potvrđene dosadašnje doprinose; buduće vlasnike B/C/D/završnog A ne pretpostavljati. |
| Q2 | Testirati Gemini 3.5 Flash Lite, dokumentacija direktno sa zvaničnog sajta; produkcija verovatno OpenAI. | Početni provider `gemini`, model `gemini-3.5-flash-lite`; jedan konkretan adapter sada, mogući OpenAI kasnije bez njegovog SDK-a/prompata u ovom obimu. Dozvoljeno čitanje dokumentacije nije dozvola za plaćene pozive. |
| Q3 | Nastaviti ono što je urađeno u 002. | Zadržati istu putanju/telo pri retry-u i Počni iznova za invalid_transition/run_not_found; failed ostaje terminalan. Ne birati novi prelaz ili automatski novi run. |
| Q4 | Samo lokalno, bez modelskog generisanja. | compile:rules uvozi/validira ručno pripremljena pravila i odobrenje; nema modelskog compile prompta ni plaćenog generatora. |
| Q5 | Stvarni režim podrazumevan, postojeći mock testovi ostaju mock. | Odsutan DEMO_MODE znači false; true eksplicitno bira mock. Live bez ključa greška pri konfiguraciji, nikada fallback. Test/CI eksplicitno mock. |

Q3 ne odobrava novu semantiku workflow-a. Tehnički ugovor dodaje Idempotency-Key u zaglavlju radi istovetnog ponavljanja bez dupliranja, uz nepromenjenu putanju/telo i korisnički tok 002. Potrošnja je zaseban monotoni dnevnik; HTTP 400/413 čuvaju poslovni snapshot, ne brišu već izvršeni modelski pokušaj. To razrešava prividni konflikt bez besplatnog resetovanja limita.

## Odobreno čitanje Gemini dokumentacije

Korisnik je u ovoj sesiji dozvolio direktno čitanje zvanične dokumentacije. Pregled 2026-11-12 potvrđuje identifikator `gemini-3.5-flash-lite` i podršku strukturisanim izlazima na [stranici modela](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite). [Strukturisani izlazi](https://ai.google.dev/gemini-api/docs/structured-output) podržavaju JSON Schema; lokalna Zod validacija i poslovna provera ostaju obavezne. [REST referenca](https://ai.google.dev/api/generate-content) dokumentuje generateContent, candidates, promptFeedback i finishReason. Dokumentacione adrese su preusmerene na aistudio.google.com; ništa nije poslato modelu.

Tehnička odluka: koristiti ugrađeni Node fetch i REST adapter, bez nove SDK zavisnosti. Alternativa je Google GenAI SDK, ali nije potreban za ovaj mali strukturisani tekstualni tok. U T312 proveriti tačno mapiranje request/usage/error polja prema dostupnoj zvaničnoj referenci; bez tvrdnje da je pristup korisničkog naloga/modela već testiran. Cene i politika čuvanja podataka nisu potvrđene; nema procene troška u ovoj pripremi.

## Lokalni nalazi i tehničke odluke planiranja

| ID | Dokaz | Odluka / razlog | Alternativa i posledica |
|---|---|---|---|
| R01 | `config/index.ts`, `api/app.ts`, `service/trialmatch.ts` | Zameniti fiksni mock, `/health` i meta stvarnim adapter/manifest kontekstom; metrika po run-u. | Globalni `callCount` meša konkurentne pozive. |
| R02 | `budget/run-budget.ts`, `docs/decisions.md` | Zadržati rok od createdAt uključujući čekanje korisnika i backoff; ne postavljati nov deadline po zahtevu. | Pauziranje roka bi promenilo potvrđenu odluku; nije deo ovog plana. |
| R03 | `matcher/evaluate-criteria.ts`, retrieval/questions/service | Izvedene vrednosti računati jednom po relevantnoj reviziji profila kroz registar, deliti validirani snapshot. | Nominalni alat uz direktne proračune ne dokazuje EV-04 i troši budžet više puta. |
| R04 | `tools/executor.ts` | Svaki alat ima ulaznu i izlaznu šemu, server bira poziv; zabranjena namera pre svih alata. | Provera samo argumenata propušta nevalidan handler izlaz. |
| R05 | `retrieve.ts`, servis `sourceTexts` | Razdvojiti izvore procene i tačno dostavljene izvore konkretnog modelskog poziva; provera objašnjenja koristi drugi skup. | Svi izvori iz starih procena nisu dozvola za novi citat. |
| R06 | `prepare-trials.ts`, `TrialSchema`, lokalni pregled `data/raw/studies_50_recruiting_2026-11-12.json` | Fajl sadrži `studies` niz od 50 zapisa u v2-sličnom obliku, 50 jedinstvenih NCT ID-jeva i `nextPageToken`; svih 50 ima `overallStatus=RECRUITING`, a `phases` nedostaje ili sadrži `NA`/više faza. Korisnik je potvrdio datum 2026-11-12; creation time fajla je 2026-11-12T01:47:55+01:00. Ovo je statički JSON pregled, ne importer izvršenje. | Proveriti ga lokalno kroz T317. T319 mora zabeležiti endpoint/izvoz, upit, da li su druge stranice preuzete i uslove korišćenja; bez tih metapodataka ne tvrditi da je snimak potpun ili ponovljiv. Postojeći normalizovani niz nije dokaz CT.gov v2 kompatibilnosti. |
| R07 | `eval/runner/results.ts` | Atomsko prvo rezervisanje baseline direktorijuma pre plaćenog rada, inkrementalni zapis i status prekida. | Sadašnja zabrana svakog basename=baseline onemogućava i prvo kreiranje. |
| R08 | `gold-metrics.ts`, `gold-set.jsonl` | Sačuvati osam profilnih primera; zaseban kriterijumski skup, ljudske oznake i nezavisne predikcije. | Dodavanje profilnih redova ne dokazuje parsiranje kriterijuma. |
| R09 | `RunResponseSchema`, EV-05, 001 API | Planira se `excludedTrials` uz zadržavanje praznog `results` za insufficient_evidence. | Neprazan results bi promenio 001/002 invariant i doslovno očekivanje EV-05. Zasebna kolekcija ispunjava B3 bez kandidata; nije nova presuda. |
| R10 | `SafetyNotice.tsx`, 002 T231 | Poreklo skupa nezavisno od demoMode; stvarni model + sintetički fixture su validna kombinacija. | Model režim nije dokaz porekla studija. |
| R11 | `package.json` | Build prethodi CLI data/eval/gold komandama koje koriste dist. Nema dodavanja zavisnosti u planiranju. | Pokretanje starih dist fajlova može dati pogrešan dokaz HEAD-a. |

## Registar neslaganja i razrešenja

| Izvori | Neslaganje | Razrešenje pre zavisnog zadatka |
|---|---|---|
| 001 ugovor, 002 UI, B3, EV-05 | Prazan results naspram razloga isključenja | R09, T307/T324: nova kolekcija; EV-05 proverava prazne kandidate i isključenja odvojeno; ne menjati očekivanje podobnosti. |
| Brief, 002 retry / B10 | failed terminalan, UI šalje isto telo | Potvrđen Q3: 002 retry, terminalni failed; T309 dodaje deduplikaciju. |
| 002 „stvarni podrazumevan“, config true-only | Neusklađen režim | Potvrđen Q5: live podrazumevan, mock eksplicitan u testovima. |
| 002 oko 50 kartica / C2, brief 15–20 | Obim korpusa | 50–100 sirovih, 15–20 pregledanih; 50 kartica samo sintetički UI test. |
| 002 Vercel/B9/T242, brief Faza 2 | Javni hosting | Van Faze 2; samo lokalni B8, lokalna provera tajni D3. |
| 001 [x] zadaci, stvarni kod | Četiri alata/importer/evaluator navedeni kao završeni | Statički nalazi R03/R06/R07; novi zadaci ne nasleđuju [x]. |
| EV-04 tool_calls=1, brief compute_egfr=1 | Ukupni alati naspram konkretnog alata | T327 pre zamrzavanja precizira da se meri compute_egfr; ukupni broj uključuje matcher/pitanje. Ne menjati poslovno očekivanje. |
| EV-03/06/10 opisni inputi, živi pozivi | Nisu izvršivi nizovi zahteva | T327 razrađuje postojeće profile i sledove bez promene značenja/ID-ja; ne šalje frazu „Profil iz EV-01“ kao profil modelu. |
| EV-02 tekst „Pacijent“, AC zabrana nagađanja pola | Očekivanje istih studija može zahtevati dopunu | T327 proverava dozvoljeni sled dopune prema originalnom slučaju; ako to menja očekivanje, traži ljudsku odluku pre zamrzavanja. Bez automatskog pretpostavljanja pola. |
| EV-16 implementacija, brief | Greška u evaluate/normalizaciji umesto compute_egfr | T315/T327 ubacuju grešku u stvarni handler compute_egfr. |
| REQ-B2 nepromenjeno stanje, naplativa semantička validacija | Odbijena hipoteza može potrošiti poziv | Poslovno stanje ostaje isto; zasebni resursni dnevnik zadržava potrošnju. Potvrđena 002 semantika, T309 odvaja resursni dnevnik; nije dozvoljen refund/reset. |
| 002 spec motion TODO, odluke/handoff | Stara tvrdnja o odobrenju | Važi potvrda 2026-11-10; ne pitati ponovo i ne menjati biblioteku. |
| 002 handoff naspram tasks | Istorijski početak implementacije / završene oznake | Ne tumačiti kao dokaz aktuelnog HEAD-a ili živog pregleda. |
| api/app.ts naspram 001 HTTP | internal_error kao dodatni 500 | T306 centralizuje 500 kao internal_contract_violation, uz bezbedan redigovan interni uzrok. |

Semantička podrška citata nije dokazana tačnim podnizom: automatske provere ograničavaju tvrdnje, a ljudski pregled se beleži odvojeno. Tokeni/cene ostaju nedostupni dok se ne potvrde provider mogućnosti; „naplativi pozivi“ iz stare dokumentacije znače logički aplikacioni budžet, ne garanciju fakturisanja retry-a.
