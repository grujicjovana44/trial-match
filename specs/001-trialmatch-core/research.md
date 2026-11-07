# Istraživanje i tehničke odluke

Ovaj dokument beleži odluke i otvorene tačke za plan implementacije. Oslanja se samo na `docs/project-brief.md` (odeljci 5–12 i 16), funkcionalnu specifikaciju i korisnički izabrani stek. Nije pristupano mreži. Nijedan klinički prag ili bibliografski izvor nije dopunjen nagađanjem.

## Odluke

### 1. Monorepo i granice aplikacija

**Odluka**: Koristiti pnpm workspace sa `apps/server`, `apps/web` i `packages/shared`; TypeScript je u strict režimu. Server koristi Fastify, klijent React + Vite, validacija Zod, testovi Vitest, tekstualna pretraga MiniSearch.

**Obrazloženje**: Ovaj stek je izričito zadat korisnikom i usklađen sa rasporedom iz brief-a. Zajednički ugovori smanjuju razilaženje između klijenta i servera.

**Razmotrene alternative**: Druga struktura aplikacije ili druge biblioteke nisu razmatrane jer bi menjale izričito zadati stek. Tačne verzije su izabrane i pinovane u `package.json`; potrebno je još potvrditi lockfile.

### 2. Razdvajanje profila, studija i izvršavanja

**Odluka**: Profil pripada jednom `runId` i nikada se ne ugrađuje u zapis studije, korpus ili fixture-e. Studije i pravila su lokalni, čitljivi izvori; stanje provere i odgovori na dopunu pripadaju izolovanom izvršavanju u memoriji.

**Obrazloženje**: Brief zahteva samo sintetičke profile, odvojene fixture-e, izolaciju izvršavanja i memorijsko stanje koje se resetuje pri restartu.

**Razmotrene alternative**: Baza podataka i trajno čuvanje profila nisu u obimu. Deljenje stanja između izvršavanja je zabranjeno.

### 3. Tok obrade profila i uloga modela

**Odluka**: Model može da izvuče strukturisani profil i klasifikuje nameru, uz runtime validaciju i najviše jedan pokušaj popravke nevažećeg izlaza. Model može da sastavi objašnjenje samo iz već utvrđenih statusa i dostupnih odlomaka. Mock adapter služi offline toku; živi adapter ostaje zasebna kasnija integracija.

**Obrazloženje**: Takva podela prati osnovni princip: model čita i objašnjava, dok kod odlučuje. Server određuje konačni status, validira ulaze/izlaze i sprovodi bezbednosna ograničenja.

**Razmotrene alternative**: Dozvoliti modelu da sam odredi podobnost, vrednosti ili autorizaciju nije prihvatljivo. Više modela i autonomni agenti nisu potrebni.

**Granice iz brief-a**: Limiti koji se sprovode: MAX_INPUT_CHARS=4000; MAX_CONTEXT_CHARS=12000; MAX_MODEL_CALLS_PER_RUN=4; MAX_TOOL_CALLS_PER_RUN=10; MODEL_TIMEOUT_MS=20000; RUN_TIMEOUT_MS=60000; MAX_QUESTION_ROUNDS=5; TOOL_TIMEOUT_MS=2000; 20 zahteva u minuti po klijentu u memoriji. MAX_RETRIES=2 znači dva ponovna pokušaja posle prvog poziva, samo za timeout, HTTP 429 i 5xx, sa pauzama 500 ms pa 1500 ms. Mrežni ponovni pokušaji ne ulaze u budžet naplativih poziva; jedna popravka nevalidnog strukturisanog izlaza ulazi. Broj mrežnih pokušaja beleži se odvojeno. Nevalidan izlaz se ne retry-uje kao mrežna greška. Sprovođenje se proverava na API, workflow, LLM i alatnim granicama. Mrežni retry važi samo za model-provider; lokalni deterministički alat odmah vraća kontrolisani error.

### 4. Determinističke vrednosti i kliničke reference

**Odluka**: Normalizacija jedinica, eGFR, BMI i kriterijumski matcher ostaju deterministički. Korisnik je dostavio i potvrdio bibliografske izvore, formule i kontrolne vrednosti u `docs/project-brief.md`; B-03 je razrešen.

**Obrazloženje**: Brief izričito zabranjuje medicinsko odlučivanje modela i konstante bez proverljivog izvora.

**Razmotrene alternative**: Izvođenje kliničkih vrednosti ili pragova iz opšteg znanja modela je zabranjeno.

**Potvrđeno u brief-u**: eGFR CKD-EPI 2021 (Inker et al., DOI `10.1056/NEJMoa2102953`, PMID `34554658`; implementacioni izvor NIDDK); BMI po CDC; kreatinin µmol/L → mg/dL deljenjem sa `88.4` po NIDDK; HbA1c IFCC mmol/mol → NGSP % po `0.09148 × vrednost + 2.152` po NGSP. eGFR kontrolne vrednosti su `62.11` i `60.61 mL/min/1.73 m²`; BMI kontrolna vrednost `29.04 kg/m²`; tehnička tolerancija za svaku je ±0,01.

Validacione granice unosa (starost 0–120, HbA1c 3–20%, kreatinin 0,1–20 mg/dL, visina 50–250 cm, težina 2–400 kg) su samo tehnički sanity check, ne medicinski ili laboratorijski referentni opsezi; za njih se ne izmišlja medicinski izvor.

### 14. Runtime i zavisnosti (B-01)

**Odluka**: Koristiti Node.js `24.22.1` LTS, pnpm `12.16.1` i tačne verzije paketa iz `package.json`. Korisnik je potvrdio uslov da se ne biraju izdanja mlađa od 14 dana u odnosu na 2026-11-07. Lockfile provera `pnpm install --frozen-lockfile --lockfile-only --offline` prolazi. U okruženju je zabeležen Node `24.20.0`, pa runtime još nije usklađen; ne pristupati mreži radi instalacije bez izričitog odobrenja.

### 5. Trovalentna logika i izlaz studije

**Odluka**: Svaki kriterijum nosi `met`, `not_met` ili `unknown`. Nedostajući, nejasan i nedovoljno potkrepljen podatak daje `unknown`. Kriterijum za ručnu procenu ostaje nepoznat. Pravilo studije iz brief-a: bilo koji `not_met` čini studiju `excluded`; inače bilo koji `unknown` čini je `pending`; u suprotnom `candidate`, uz obaveznu ljudsku proveru. Za kriterijum isključenja, `met` znači da se uslov isključenja ne odnosi na profil.

**Obrazloženje**: Ovo sprečava tiho svođenje nepoznatog na pozitivan ili negativan odgovor i ne pretvara rezultat u odluku o podobnosti.

**Razmotrene alternative**: Binarno da/ne odlučivanje i proglašavanje kandidata podobnim nisu prihvatljivi.

### 6. Pronalaženje izvora

**Odluka**: Koristiti filtriranje po metapodacima, MiniSearch nad naslovom, stanjima i odlomcima kriterijuma, pa zamenljiv reranker. Izabrani odlomci imaju stabilne ID-jeve i ulaze u kontekst kao nepouzdani tekst. Citati se potvrđuju prema skupu dostupnom konkretnom izvršavanju i izvornom tekstu.

**Obrazloženje**: Brief cilja mali pregledani korpus i izričito navodi ovaj hibridni tok. MiniSearch i deterministički filteri omogućavaju offline, ponovljivo pronalaženje.

**Razmotrene alternative**: Vektorska baza/embeddings nisu potrebni za početni mali korpus. LLM reranker nije izabran za osnovni tok jer bi menjao ponovljivost i granicu između rangiranja i presuđivanja.

**Odluka**: Polja/težine MiniSearch-a su `title=2`, `conditions=1`, `criteria=1`; do 10 kandidata, do 5 odlomaka i do 12.000 znakova konteksta. Konačni redosled rezultata je presuda (`candidate`, `pending`, `excluded`), opadajući udeo `met` kriterijuma, zatim NCT ID normalizovan na velika slova i rastuće leksikografski. Ova prezentaciona pravila ne predstavljaju klinički prag.

**Dopunsko ponašanje**: Pretraga koristi mala slova i podrazumevanu MiniSearch tokenizaciju. Jednak rezultat pretrage razrešava se po ID-ju studije. Podrazumevani reranker sortira po broju automatski proverljivih kriterijuma za koje postoji potrebna vrednost, zatim po broju kriterijuma koji mogu biti razjašnjeni dopunom, pa po ID-ju studije. Reranker služi samo odabiru izvora/kandidata i ne menja matcher presude.

### 7. Izbor pitanja

**Odluka**: Deterministički izabrati nepoznato polje koje ima nepoznate kriterijume u najvećem broju neisključenih studija; izjednačenje rešiti brojem studija gde je to polje jedino nepoznato, pa abecednim nazivom polja.

**Obrazloženje**: Ovo je pravilo dato u brief-u i predstavlja proverljivo ponašanje AC-03/AC-04.

**Razmotrene alternative**: Model ne bira pitanje. Nije definisan drugi score.

### 8. Podaci studija i poreklo

**Odluka**: Sirovi snimak postavlja čovek u `data/raw/`; priprema radi lokalno i offline. Normalizovani zapisi, pravila koja čekaju ljudski pregled i sintetički fixture-i ostaju razdvojeni. Svaki odlomak zadržava izvorni tekst i stabilan ID.

**Obrazloženje**: Brief zabranjuje crawler, HTML scraping i mrežni pristup, zahteva proverljive citate i sprečava da pravi snimak menja EV fixture ishode.

**Razmotrene alternative**: Uživo povlačenje ili mešanje sintetičkih test studija sa pravim korpusom nisu prihvatljivi.

### 9. Bezbednosne granice alata i injection

**Odluka**: Server ima fiksni registar determinističkih alata i validira ime, argumente, poslovna pravila i opseg pre pristupa podacima. Tekst korisnika i studije tretira se kao nepouzdan. Model ne dobija proizvoljne radnje; validirani citati i brojevi prolaze zasebnu proveru pre prikaza.

**Obrazloženje**: Prompt tekst sam po sebi nije bezbednosna granica; ovlašćenja sprovodi server.

**Razmotrene alternative**: Alati, SQL, shell ili mrežne adrese koje bira model nisu dozvoljeni.

### 10. Testiranje i evaluacija

**Odluka**: Vitest proverava determinističke domenske delove, granice podataka, ugovore i simulirane greške. Offline evaluacija koristi neizmenljivih 16 sintetičkih slučajeva; živa evaluacija je odvojena i zahteva izričitu potvrdu troška. Baseline se nikada ne prepisuje.

**Obrazloženje**: Ovo daje reproduktivne dokaze bez poziva plaćenog modela u testovima i sprečava izbor najboljih pokušaja.

**Izveštavanje**: EV-01–EV-09 se prikazuju kao funkcionalni prolazi/k ukupno stvarno izvršenih slučajeva; dry-run EV-07–EV-09 se izostavlja iz brojanja. U Fazi 1 imaju samo dry-run sa skriptovanim mock odgovorom i nikada se ne prikazuju kao izvršeni/prošli EV slučajevi; EV-10 se izveštava kao bezbednosni slučaj, a `EV-10-offline provera` je odvojen offline test i nikada se ne broji kao EV-10; EV-11–EV-16 kao determinističke/fault provere. U Fazi 1 napraviti format, učitavač i metrike za zlatni skup sa 6–10 početnih primera; oko 30 ručno obeleženih kriterijuma pripada Fazi 2. Odvojeno izveštavati parser preciznost/odziv na zlatnom skupu, podršku citata, trajanje, pozive alata/modela i dostupne tokene. Beležiti commit, verzije slučajeva/podataka/prompta/šeme/modela i podešavanja. Cena je procena uz model, cenovnik i datum. Poređenja koriste isti case ID skup i prijavljuju regresije; mali skup nije statistički dokaz.

**Razmotrene alternative**: Jedinstvena metrika „AI tačnost“, baseline rekonstruisan posle činjenice i testovi koji pozivaju live model nisu prihvatljivi.

### 11. Pružalac modela i pokušaji

**Odluka**: Faza 1 koristi mock adapter. Živi provajder ostaje neizabran i konfiguriše se odvojeno u kasnijoj fazi.

**Obrazloženje**: Brief navodi da korisnik naknadno bira provajdera. API ključ nikada ne prelazi na klijent niti u repozitorijum.

**Neizvesnosti**: Tačan model i cenovnik za budući živi adapter nisu određeni. Vrednosti retry-a, model timeout-a i `TOOL_TIMEOUT_MS=2000` su potvrđene; mrežni retry važi samo za pozive modela.

### 12. Hipotetička nastavna procena i API ugovor

**Odluka**: Odgovor na trenutno pitanje koristi `POST /api/runs/{runId}/answer`. EV-06 dodatno zahteva hipotetičku izmenu posle završenog rezultata; nju obrađuje `POST /api/runs/{runId}/hypothesis`. Ruta je dozvoljena samo za `completed`, validirani patch menja samo eksplicitno navedena polja, zadržava ostala polja i isti `runId`, a poreklo izmene je `hypothesis`. Jedna procena završava u `completed`, ali samo eksplicitan hipoteza-događaj može pokrenuti novu procenu pod istim ID-jem; `failed` i `rejected` ostaju terminalni.

**Obrazloženje**: Ovo čuva proverljiv odgovor na pitanje od odvojene promene korisničke pretpostavke i zadovoljava EV-06 bez tihe izmene profila.

**API ugovor**: Stroga Zod diskriminisana unija statusa; sva polja odgovora su prisutna, neprikladna polja su `null`, kolekcije su prazni nizovi. Nepoznata polja zahteva/odgovora se odbacuju. Izgubljeni ili nepostojeći `runId` vraća `404 run_not_found`, bez automatskog novog izvršavanja.

### 13. Provera citata i ograničenja automatizacije

**Odluka**: Serverska validacija proverava da `sourceId` pripada tekućem izvršavanju i da citat odgovara tačnom izvornom tekstu; numeričko uzemljenje proverava brojeve prema izračunatim vrednostima. Ove provere same ne dokazuju semantičku podršku parafraze. Neproverljivo ili nevažeće objašnjenje zamenjuje se serverskim šablonom; semantička potkrepljenost proverava se ljudskim pregledom evaluacionih tragova.

**Ograničenje**: Ne tvrditi da provera podniza ili numeričkih tokena dokazuje da je svaka prirodnojezička tvrdnja potkrepljena.

## Otvorene odluke za razjašnjenje

1. Pružalac i identifikator modela za živu fazu.
2. Pre implementacije omogućiti Node.js `24.22.1`; trenutno okruženje koristi `24.20.0`.
3. Licenca/uslovi korišćenja stvarnog snimka, pre nego što se tvrdi da su potvrđeni.

## Beleška o izvršenom istraživanju

Plan se zasniva na lokalnim projektnim dokumentima. Mreža nije korišćena. API oblik, ponašanje hipoteze i minimalna politika rerankera sada su eksplicitne odluke; bibliografska provera formula i licenca stvarnog snimka ostaju ljudske obaveze.
