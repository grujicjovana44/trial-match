# Odluke projekta

Ovaj dokument beleži odluke za osnovni TrialMatch, razmotrene alternative i posledice. Korisnik je 2026-11-07 dostavio izvore i potvrdio formule, konverzije i kontrolne vrednosti; tehničke granice unosa nisu medicinski referentni opsezi.

## Potvrđene odluke

### Jezik i opseg README-a

U Fazi 1 README je u celosti na srpskom, latinicom, u skladu sa `docs/project-brief.md` i konstitucijom. Nema engleskog sažetka.

### Odbijanje zabranjene namere

Korak ekstrakcije klasifikuje nameru. Ako je zahtev za dijagnozom, savetom o lečenju ili odlukom o uključenju, server postavlja `rejected` pre poziva bilo kog alata i pre poziva matchera. Time se sprečava izvršavanje analize profila za zabranjeni zahtev.

### Strukturisani izlazi i budžeti

Jedinstveni `generateStructured` omotač sprovodi validaciju i najviše jednu popravku svakog nevalidnog strukturisanog izlaza. Popravka se računa u `MAX_MODEL_CALLS_PER_RUN`; ako izlaz i posle nje nije validan, tok završava kontrolisanim `error` pre poziva matchera ili alata. Mrežni ponovni pokušaji se ne računaju u ovaj budžet i ne koriste se za nevalidan izlaz.

Važeće granice su one iz projektnog brief-a: najviše 4 naplativa model poziva po izvršavanju; mrežni pokušaji za timeout, HTTP 429 i 5xx ograničeni su na dva ponavljanja posle prvog i ne ulaze u taj budžet. Jedna popravka nevalidnog izlaza ulazi u budžet. Ovo ne znači da je ukupan broj mrežnih zahteva četiri; broj pokušaja i broj naplativih poziva beleže se odvojeno.

Odgovor na ciljano pitanje se parsira deterministički prema tipu i ponuđenim vrednostima polja; ne troši modelski poziv. Tipičan EV-06 tok koristi do četiri naplativa poziva: početno izdvajanje, početno objašnjenje, izdvajanje hipoteze i objašnjenje posle ponovne procene. Ako za objašnjenje nema preostalog budžeta ili modelov izlaz ne prođe provere, koristi se odobren serverski šablon umesto dodatnog poziva.

### Nastavak završenog izvršavanja kao hipoteza

EV-06 izričito zahteva da se posle odgovora na pitanje u istom `runId` može probati promena jedne vrednosti („a šta ako je HbA1c 9,0?“), uz očuvanje ostalih validiranih podataka. To je uži, eksplicitan izuzetak od pravila da je `completed` završno stanje: `POST /api/runs/{runId}/hypothesis` prihvata profilni tekst samo za završeno izvršavanje, izdvaja i validira navedene izmene, ažurira samo izričito navedena polja i pokreće novu procenu pod istim `runId`. Polja koja nisu navedena ostaju netaknuta; izmenjenim poljima se dodeljuje poreklo `hypothesis`. Novi rezultat zamenjuje prethodni trenutni rezultat, a trag beleži nastavak bez čuvanja sirovog teksta profila. Nevažeća, dvosmislena ili zabranjena hipoteza vraća kontrolisanu HTTP 400 grešku (`invalid_hypothesis`, `ambiguous_hypothesis` ili `forbidden_intent`) pre alata/matchera, bez izmene sačuvanog izvršavanja; korisnik može poslati novu jasnu hipotezu.

Korisnički interfejs izlaže ovo ponašanje jednim poljem „Šta ako?“ nakon završenog rezultata; dodatna istorija hipoteza nije u obimu.

Alternativa — odbiti izmene nakon `completed` ili otvoriti novi `runId` — ne zadovoljava EV-06. Posledica izabranog pristupa je da `completed` završava jednu procenu, ali izvršavanje ostaje dostupno za ograničenu hipotetičku ponovnu procenu; ograničenja poziva, ukupnog trajanja i pitanja ostaju aktivna. Jedna runda dopune je jedan validno oblikovan odgovor na trenutno pitanje, uključujući odgovor koji ostane dvosmislen; najviše je pet takvih rundi. Hipoteza nije runda odgovora na pitanje, ali svaka dopuna koju zatraži njena ponovna procena jeste. Kada bi sistem morao da postavi novo pitanje posle pete runde, završava kontrolisanom greškom `question_round_limit` umesto neograničenog ponavljanja.

### Oblik API odgovora

Svaki validan `RunResponse` koristi strogi Zod ugovor i sadrži isti skup polja; polja koja nisu primenljiva imaju vrednost `null`, dok su kolekcije prazni nizovi. Šema je diskriminisana po `status` i nameće saglasnost statusa i faze, kao i obavezna polja za `question`, `reason` i `error`. Nepoznata polja u zahtevima i odgovorima se odbacuju. Greške ulazne validacije i nepoznat/izgubljen `runId` imaju zaseban stabilan HTTP format i ne pokreću novi tok.

Ova odluka uklanja neodređenost prisutnosti opcionih polja i nepoznatih ključeva bez menjanja poslovnih statusa iz brief-a. Izgubljeni `runId` (uključujući gubitak memorijskog stanja posle restarta) vraća HTTP 404 sa kategorijom `run_not_found`; klijent mora započeti novo izvršavanje, a server ne rekonstruiše stanje.

### Ishod `not_in_sources`

EV-09 i korisnička priča 3 izričito zahtevaju bezbedan ishod za pitanje o činjenici studije koje nije u dostupnim izvorima. Da ne bi dodavao novu API promenljivu ili opšti režim pitanja i odgovora, isto polje `profileText` prihvata i takav tekst; ekstrakcija klasifikuje nameru kao izvorno pitanje. Kada tražena činjenica nije u lokalnom skupu studija/odlomaka, server vraća `insufficient_evidence` sa `not_in_sources`, bez poziva matchera i bez odgovora iz opšteg znanja. Primer je pitanje o neželjenim dejstvima leka kada ih korpus podobnosti ne sadrži. Ovo ne proširuje proizvod na opštu medicinsku Q&A funkcionalnost.

Ovaj negativni slučaj je dodat u AC-05 uz postojeći `no_matching_trial` slučaj; AC ID ostaje stabilan jer oba predstavljaju nedovoljno dokaza. Hipotetička izmena iz EV-06 obuhvaćena je postojećim AC-03 kao nastavak istog validiranog izvršavanja. Oba proširenja su zabeležena u projektnom brief-u i tabeli sledljivosti specifikacije.

### Minimalna RAG i provera objašnjenja

MiniSearch koristi mala slova i podrazumevanu tokenizaciju biblioteke, pretražuje naslov, stanja i izvorne odlomke; stabilno razrešenje jednakih rezultata je po ID-ju studije. Podrazumevani reranker je deterministički: prvo broj automatski proverljivih kriterijuma sa poznatom vrednošću, zatim broj kriterijuma koji mogu biti razjašnjeni dopunom, pa ID studije. Ovaj redosled služi samo odabiru izvora/kandidata i ne menja presude matchera.

Serverska provera može deterministički da potvrdi da je citat iz tekućeg izvršavanja i da je tekst tačan podniz izvornog odlomka; ona ne može sama da dokaže semantičku potkrepljenost proizvoljne parafraze. Zato se ne prikazuje modelom dodata tvrdnja bez dozvoljenog izvora, a objašnjenje koje ne prođe provere citata ili brojeva zamenjuje se kratkim serverskim šablonom zasnovanim na rezultatima. Semantička podrška citata proverava se i ljudski u evaluaciji; ne tvrdi se da je automatski dokaziva.

### Vrednosti ograničenja

| Ograničenje | Vrednost | Obrazloženje |
|---|---:|---|
| `MAX_INPUT_CHARS` | 4000 | Ograničava veličinu slobodnog unosa i ulazni trošak; početni brief već navodi ovu granicu. |
| `MAX_CONTEXT_CHARS` | 12000 | Gornja granica odlomaka studija prosleđenih modelu; dovoljno velika za ograničeni demo kontekst, uz eksplicitnu kontrolu veličine i troška. |
| `MAX_MODEL_CALLS_PER_RUN` | 4 | Budžet naplativih poziva pokriva ekstrakciju, do jedne popravke i objašnjenje uz mali prostor za predviđeni tok. |
| `MAX_TOOL_CALLS_PER_RUN` | 10 | Sprečava neograničeno ponavljanje determinističkih alata u jednom toku. |
| `TOOL_TIMEOUT_MS` | 2000 | Prekida lokalni alatni poziv; alatne greške se ne retry-uju. |
| `MODEL_TIMEOUT_MS` | 20000 | Ograničava čekanje na jedan modelski poziv. |
| `RUN_TIMEOUT_MS` | 60000 | Ograničava ukupno trajanje izvršavanja, uključujući pozive i pauze. |
| `MAX_RETRIES` | 2 ponovna pokušaja | Samo za timeout, HTTP 429 i 5xx; pauze su 500 ms pa 1500 ms. Neispravan izlaz se ne ponavlja kao mrežni retry. |
| `MAX_QUESTION_ROUNDS` | 5 | Ograničava ponavljanu dopunu profila u jednom izvršavanju. |
| Ograničenje zahteva | 20/minut/klijent | Jednostavna memorijska granica za osnovnu verziju; prekoračenje vraća HTTP 429 i kontrolisanu poruku. |

Brojevi su granice proizvoda za kontrolu resursa i pouzdanosti, ne klinički pragovi. Mrežni ponovni pokušaji ne ulaze u `MAX_MODEL_CALLS_PER_RUN`; jedina popravka strukturisanog izlaza ulazi. Vrednosti se mogu menjati samo kroz dokumentovanu odluku i odgovarajuće testove.

### Tehnički stack i tačne verzije

Korisnik je izabrao Node.js `24.22.1`, pnpm `12.16.1`, TypeScript `5.9.3`, Fastify `5.12.5`, React/React DOM `19.3.1`, Vite `8.3.5`, Zod `4.6.7`, Vitest `5.0.5`, MiniSearch `7.2.0`, ESLint `10.13.0`, `typescript-eslint` `8.71.0`, Prettier `3.9.10`, jsdom `30.1.3`, Testing Library React `16.3.3` i user-event `14.6.8`; `package.json` je izvor tačnih verzija ostalih paketa. Korisnik je potvrdio pravilo izdanja starijeg od 14 dana. `.nvmrc`, `engines.node` i `.npmrc` su usklađeni; `pnpm install --frozen-lockfile --lockfile-only --offline` prolazi sa pnpm `12.16.1`. Lokalni Node je i dalje `24.20.0`, pa treba preći na `24.22.1` pre izvršavanja projekta. Commit se i dalje odlaže do prvog implementacionog prolaza.

### Tehničke granice validacije profila

Opsezi starost 0–120 godina; HbA1c 3,0–20,0%; kreatinin 0,1–20 mg/dL posle konverzije; visina 50–250 cm; težina 2–400 kg su tehnički sanity check unosa, ne univerzalni medicinski/laboratorijski opsezi ili kriterijumi podobnosti. Korisnik ih je potvrdio kao tehničke granice bez medicinske tvrdnje. Dozvoljene kategorije `sex` za CKD-EPI 2021 su `male` i `female`; odsutno ili nejasno ostaje `unknown`, pokreće dopunu kada je potrebno, a eGFR se ne računa dok pol nije jasan.

### Redosled prikaza studija

Studije se prikazuju po redosledu presude (`candidate`, `pending`, `excluded`), zatim po opadajućem udelu kriterijuma `met`, pa po NCT ID-ju normalizovanom na velika slova i sortiranom rastuće leksikografski. Ovo je determinističko sortiranje prikaza, ne procena podobnosti ili klinički prag.

### Evaluacija u Fazi 1

Faza 1 isporučuje format zlatnog skupa, učitavač i skriptu za metrike sa 6–10 početnih primera iz probnih studija. Pun skup od oko 30 ručno označenih kriterijuma pripada Fazi 2.

EV-07–EV-09 ostaju označeni `real_model`. Faza 1 može koristiti skriptovani mock odgovor samo u dry-run proveri okvira; takvo pokretanje nikada se ne prikazuje kao izvršen/prošao EV slučaj. `EV-10-offline provera` je nezavisan offline test i nikada se ne broji kao EV-10, koji ostaje `real_model`.

### Novi unos umesto otkazivanja

Faza 1 nema `cancel` događaj u toku provere. Korisnik koji želi drugi profil bira „Novi unos“, čime započinje novo izolovano izvršavanje. Time se izbegava nedovoljno definisan terminalni status otkazivanja.

### Verzije i lockfile

Tačne verzije su izabrane i potvrđene u odluci „Tehnički stack i tačne verzije“. `.npmrc` treba da zadrži `save-exact=true`; pre implementacije treba proveriti da `pnpm-lock.yaml` zaključava sve zavisnosti iz `package.json`. Commit lockfile-a se odlaže do prvog implementacionog prolaza.

## Potvrđene formule i reference (B-03)

- **eGFR**: CKD-EPI 2021 po kreatininu, bez rase. Inker LA et al. (2021), *New Creatinine- and Cystatin C–Based Equations to Estimate GFR without Race*, *New England Journal of Medicine* 385:1737–1749, DOI `10.1056/NEJMoa2102953`, PMID `34554658`; implementacioni izvor: NIDDK, *2021 CKD-EPI Creatinine Equation*. Korisnik je potvrdio formulu.
- **eGFR kontrolne vrednosti**: muškarac 62 g., kreatinin 1,3 mg/dL → `62.11 mL/min/1.73 m²`; žena 70 g., kreatinin 1,0 mg/dL → `60.61 mL/min/1.73 m²`; tolerancija za obe `±0.01`.
- **BMI**: CDC, *Calculating BMI*, `kg / m²`; 92 kg i 178 cm → `29.04 kg/m²`, tolerancija `±0.01`.
- **Kreatinin**: NIDDK, *GFR equations and conversion factors*; µmol/L u mg/dL deljenjem sa `88.4`.
- **HbA1c**: NGSP, *IFCC Standardization of HbA1c*; IFCC mmol/mol u NGSP % po `0.09148 × vrednost + 2.152`.

Korisnik je izričito potvrdio da su formule, konverzije i kontrolne vrednosti provereni prema dostavljenim izvorima. Za tehničke ulazne granice nije dostavljen medicinski izvor, jer se one koriste samo kao sanity check, a ne kao medicinski opseg. B-03 je razrešen; svaka nova ili izmenjena formula/prag bez korisničke potvrde mora ostati označen „PROVERITI prema originalnoj publikaciji“. Nezavisna mrežna provera izvora nije rađena.

### UI testovi

U Fazi 1 koriste se jsdom i Testing Library, uključujući proveru tastaturne navigacije. Playwright E2E ostaje opciona mogućnost Faze 4 i nije deo Faze 1.

### API

Potvrđene rute su `POST /api/runs`, `POST /api/runs/{runId}/answer` i `POST /api/runs/{runId}/hypothesis`. `200` pokriva sve poslovne statuse; `400` nevažeći zahtev, `404` nepoznat/izgubljen runId, `413` predug unos, `429` rate limit od 20 zahteva/minut/klijent i `500` isključivo `internal_contract_violation`.

### Poreklo podataka

Poreklo je mapa po polju sa `origin=initial_input|answer|hypothesis` i rednim brojem runde; početni unos je runda 0. Ne beleži se tekst profila.

### Alati i retry

Mrežni retry se primenjuje samo na model-provider pozive. Lokalna greška determinističkog alata odmah vraća kontrolisani `error`; alat ima `TOOL_TIMEOUT_MS=2000`.

### Status blokatora

B-02 i B-04–B-11 su razrešeni odlukama u ovom dokumentu ili projektnom brief-u; njihove odredbe treba dosledno sprovesti kroz specifikaciju, plan, zadatke i testove. B-03 je razrešen korisnički dostavljenim izvorima, formulama i kontrolnim vrednostima; opsezi validacije su tehnički sanity check. `not_in_sources` je razrešen postojećim poljem `profileText` i intent klasifikacijom. B-01 verzije i lockfile su provereni; ostaje lokalna dostupnost izabranog Node.js `24.22.1` runtime-a. Commit lockfile-a je odložen do prvog implementacionog prolaza po korisničkom zahtevu. Pružalac/model za živu fazu i uslovi korišćenja stvarnog snimka ostaju ljudske odluke za Fazu 2, ne blokatori sintetičke Faze 1.

## Interfejs (funkcionalnost 002)

- Nova provera uklanja prethodni rezultat pri slanju, dok dopuna ili „Šta ako?“ zadržava prethodni rezultat označen kao zastareo, a nakon greške važi pravilo iz R-05 za njegovo čuvanje ili uklanjanje.
- „Pokušaj ponovo“ ponavlja poslednji zahtev doslovno (ista putanja i telo), a `invalid_transition` ili `run_not_found` prikazuju „Provera više nije dostupna“ sa „Počni iznova“.
- Vreme čekanja se čita iz zaglavlja `Retry-After` kao ceo broj sekundi, a ako ga nema ili nije ispravno koristi se 60 s.
- Sve studije ostaju otvorene u redosledu servera, uz „Pregled studija“ sa vezama do svake studije i kašnjenje kartica najviše `8 × 0,04 s`.
- Interfejs zove `${VITE_API_BASE_URL}/api/...`; prazna vrednost znači istu adresu, a primer podešavanja je u `apps/web/.env.example`.

Tim je odobrio biblioteku `motion` 14.6.0, prema potvrdi vlasnika Uloge A od 2026-11-10 (REQ-T1; obrazloženje i pregled uticaja u research.md, R-16).

## Priprema funkcionalnosti 003 — potvrđeno 2026-11-12

Ova sekcija beleži odluke za planiranje; nije dokaz implementacije.

- **Provider za prvi živi test**: korisnik je izabrao Gemini 3.5 Flash Lite za testiranje; zvanični model-ID je `gemini-3.5-flash-lite`. Budući produkcioni izbor OpenAI je mogućnost, ne izbor za ovu fazu. Izabrati serverski REST adapter preko postojećeg Node fetch-a; razmotreni SDK nije potreban za ograničen strukturisani tekstualni tok i ne uvodi novu zavisnost. Dokumentacija je pregledana uz korisničku dozvolu: [model](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite), [strukturisani izlaz](https://ai.google.dev/gemini-api/docs/structured-output), [REST](https://ai.google.dev/api/generate-content). Pregled dokumentacije nije živi poziv ni potvrda naloga/cena/retencije podataka.
- **Režim**: stvarni režim je podrazumevan; `DEMO_MODE=true` bira mock. Postojeći predviđeni mock testovi/CI ostaju eksplicitno mock. Nedostajući ili nevažeći ključ u stvarnom režimu daje jasnu konfiguracionu grešku i nikada mock fallback. Ključ se unosi lokalno samo na serveru.
- **Retry u UI-ju**: zadržati ugovor 002: ponoviti poslednju putanju i telo; `invalid_transition` ili `run_not_found` vode na „Počni iznova“. `failed` ostaje terminalan. Deduplikacija i zaštita od konkurentnih zahteva ne smeju da uvedu novi workflow status niti reset budžeta.
- **compile:rules**: isključivo lokalna validacija i uvoz ljudski pripremljenih pravila uz odobrenje; nema modelskog generisanja pravila, provider pristupa ili API troška.
- **Odgovornosti koje je korisnik potvrdio**: Jovana je napravila osnovu i sve pre Aleksinog dela; Aleksa je izvršio oblast A u 002; Jelena je pregledala šta je urađeno do sada. Ovo je istorijski doprinos, ne dodela budućeg vodećeg člana/reviewera za B/C/D ili završno A povezivanje. `docs/team.md` zadržava TODO za buduće vlasništvo.

Alternativni OpenAI provider za produkciju, Gemini SDK, modelom generisani compile pravila i nastavak iz terminalnog `failed` stanja nisu deo potvrđene 003 odluke.

### Offline nacrt za ručni split CTG kriterijuma

Za rad sa ručno dostavljenim snimkom, komanda `data:split` koristi postojeći CTG v2 importer umesto zasebnog parsera. Nacrt ima sopstveni format sa `pending_review`, a kriterijumi nose samo doslovan tekst, izvor i status `manual_review`; matcher polja i approval se ne generišu. Naslov Inclusion/Exclusion i oznaka stavke moraju biti eksplicitni. Nejasan tekst ostaje u celini u `eligibilityText` i u izvornom zapisu, uz razlog `needs_manual_split`.

Odabir `first` prati validirane zapise u redosledu ulaza; `random` koristi obavezni seed za ponovljiv izbor. Izbor se vrši među studijama koje je postojeći importer prihvatio, dok se greške svih raw redova prijavljuju u izveštaju. Duplikati odbijaju generisanje jer bi NCT ID i kriterijumi bili dvosmisleni. Ove odluke zadržavaju izvorne greške vidljivim bez mešanja problematičnog reda sa uspešno validiranim studijama.

Razmotrena alternativa je da se proširi produkcioni `TrialSchema` i postojeći kriterijum odmah označi kao odobrenog porekla. Umesto toga draft koristi uski `raw_extracted` oblik sa sopstvenim `pending_review` stanjem; to izbegava semantičko mešanje sirovog izvoda, ručno pregledanog pravila i paketa za matcher. Cena je da čovek posle pregleda pravi zaseban tipizirani rule-draft za postojeći approval/compiler tok.
