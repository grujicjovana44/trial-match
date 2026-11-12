# Specifikacija funkcionalnosti: Faza 2, stvarni model i proverljivi dokazi

**Funkcionalnost**: `003-phase-2-live-integration`
**Datum**: 2026-11-12
**Status**: Plan pripremljen; prvi paket B spreman uz polazne provere, živi koraci čekaju ljudske unose.
**Ulaz**: `plan/prompt_plan.md`, [brief](../../docs/project-brief.md), specifikacije 001/002 i [readiness](../../docs/phase-2-readiness.md). Ovo je planiranje, ne implementacija niti izvršni dokaz.

Jezički model čita pravila i objašnjava rezultat. Odluku donosi deterministički kod. Primarni korisnici su lekar i koordinator koji rade sa sintetičkim profilima; sekundarni korisnik je pacijent uz lekara. Članovi tima pripremaju i pregledaju korpus, pravila i evaluaciju. Nema dijagnostike, terapije ni odluke o uključivanju.

## Razjašnjenja

### Sesija 2026-11-12

- Q1 odgovornosti → A: Jovana je napravila osnovu i sve pre Aleksinog dela; Aleksa je izvršio A; Jelena je pregledala dosadašnji rad. Budući vlasnici/pregledaoci B/C/D i završnog A nisu potvrđeni.
- Q2 model → A: za testiranje Gemini 3.5 Flash Lite; dozvoljen pristup zvaničnoj dokumentaciji. Potvrđeni identifikator iz dokumentacije je `gemini-3.5-flash-lite`; OpenAI je samo moguća buduća produkciona opcija.
- Q3 ponavljanje → A: nastaviti ponašanje 002, ista putanja/telo; invalid_transition/run_not_found vode na Počni iznova. failed ostaje terminalan, bez resetovanja budžeta.
- Q4 compile → A: samo lokalno, bez modelskog generisanja pravila.
- Q5 režim → A: stvarni režim podrazumevan; predviđeni mock testovi ostaju mock. Nedostajući ključ u stvarnom režimu daje grešku.

Odluke o formulama od 2026-11-07 ostaju važeće. Detalji i lokalno potvrđivanje identiteta operacije su u [research.md](research.md).

## Korisnički scenariji i provera

### US1 — Pouzdan rezultat i očuvana dopuna (P1; B)

Lekar želi tačno poreklo podataka i vrednosti, razloge isključenja i jasnu grešku bez gubitka validiranog profila. Ovo je prvi paket jer od njegovog ugovora zavise model i UI.

Nezavisna provera: offline API provere sa sintetičkim korpusom.

1. Dat je validiran manifest; nakon provere datum, poreklo i oznaka sintetičkog skupa odgovaraju manifestu.
2. Dat je sačuvan tok; nevalidna dopuna ili hipoteza (400/413) ne menja profil, pitanje, fazu ni rezultat i ne pokreće matcher. Stvarno potrošeni modelski pokušaji tokom semantičke validacije hipoteze ne smeju se izbrisati iz evidencije budžeta.
3. Kada su sve ocenjene studije isključene, prikazuju se samo kao isključene sa razlozima; nema kandidata ni „najbliže“ studije. Pitanje van izvora ostaje zaseban ishod.
4. Posle ograničenja zahteva korisnik dobija upotrebljivo vreme čekanja. Posle terminalne greške važi 002: ponovljeni nedozvoljeni nastavak nudi Počni iznova, bez novog prelaza iz failed.

### US2 — Stvarno izdvajanje i objašnjenje (P1; C uz B)

Lekar unosi srpski latinicom/ćirilicom ili engleski, decimale sa zarezom/tačkom i podržane jedinice. Stvarni model izdvaja samo pomenute činjenice i objašnjava već izračunat rezultat.

Nezavisna provera: mock/fault ugovorni testovi; posle odobrenja zaseban živi dokaz.

1. Potpun profil daje rangirane statuse i proverljive originalne citate. Nepomenuto ostaje odsutno; nejasno ostaje `unknown`.
2. Dopuna i eksplicitna parcijalna hipoteza nastavljaju isti `runId`, čuvaju ostala polja i ne resetuju limite; pitanje bira kod.
3. Zabranjena namera završava pre svih alata/matchera; činjenica van izvora daje `not_in_sources`.
4. Nevalidan/prazan/prekinut/odbijen izlaz dobija najviše jednu popravku; nakon neuspeha nema nevalidnog ulaza u matcher. Neprovereno objašnjenje zamenjuje ograničen deterministički tekst.
5. EV-04 beleži tačno jedan stvaran `compute_egfr`; EV-08 nijedan bez potrebnog ulaza.

### US3 — Pregledan stvarni korpus (P1; C/D)

Član tima uvozi ručno dostavljen snimak i odobrava tačne verzije pravila. Nezavisna provera koristi mali sintetički sirovi uzorak; on nije dokaz kompatibilnosti sa stvarnim snimkom.

1. Od oko 50–100 sirovih zapisa, u matcher ulazi oko 15–20 ljudski pregledanih studija. Greške zapisa su prijavljene, izvorni tekst sačuvan.
2. Starost/pol iz strukturisanog izvora postaju pravila bez modela; nepouzdana podela je `needs_manual_split`; neproverljivi kriterijumi ostaju `manual_review/unknown`.
3. Promena izvora ili pravila poništava primenljivost starog odobrenja. Nepregledana studija se ne ocenjuje.

### US4 — Povezan postojeći interfejs (P2; A)

Korisnik vidi jedinice i poreklo, status/fazu studije, datum, isključenja i kontrolisane greške bez promene postojećeg dizajna. Nezavisna provera: UI integracioni testovi ugovora, zatim stvarni pregled u pregledaču.

1. Podaci koji nedostaju nisu izmišljeni; profilno poreklo `initial_input/answer/hypothesis` ostaje vidljivo uz oznaku izvedene vrednosti.
2. Ključne kontrole imaju nazive, fokus i tastaturni tok; status nije samo boja. Citati ostaju u originalu, pitanja/objašnjenja su običan srpski tekst.
3. T220/T221/T232 iz 002 zatvaraju se dokazima iste isporuke 003; T244 zahteva stvarni model, a ne mock odgovor sa `demoMode:false`.

### US5 — Pošten prvi baseline (P1; D uz C/B)

Tim želi sačuvan prvi potpuni živi pokušaj sa svim neuspesima. Nezavisna provera: offline evaluator sa lažnim transportom i testovima upisa, pa posebno odobrena evaluacija.

1. Pre prvog punog živog pokretanja očekivanja/verzije su zamrznute, odredište rezervisano i obim/trošak odobreni; postojeći baseline sprečava pozive i upis.
2. Svih 16 EV slučajeva koristi T-A/T-B/T-C. EV-01–EV-10 imaju živi režim (EV-07 sme završiti pre modela); EV-11–EV-16 ostaju offline/fault. Preskočeno i dry-run nije prolaz.
3. Prekinuto pokretanje čuva delimične rezultate; baseline se ne briše, ne preimenuje niti bira među boljim pokušajima.
4. Oko 30 ljudski označenih kriterijuma poredi se sa zasebnim verzionisanim predikcijama; postojeći profilni mock skup nije dokaz živog parsiranja kriterijuma.

### Granični slučajevi

Konkurentne dopune/hipoteze i izgubljen odgovor ne smeju duplirati obradu. Restart gubi memorijski `runId` i daje 404. Čekanje korisnika troši postojeći ukupni rok 60000 ms; prekoračenje nije novi budžet. Nepoznati ključevi se odbijaju. Prazan korpus nije isto što i ocenjene isključene studije. Nepodržani izvor, netačan citat i nepodržana tvrdnja ne postaju dokaz. Alatna greška nema mrežni retry. Nedostajući ključ ne uključuje tiho mock.

## Zahtevi

### Funkcionalni zahtevi

| ID | Obavezno ponašanje | AC / REQ |
|---|---|---|
| F2-01 | Manifest određuje datum, poreklo, sintetičku oznaku i verziju; rezultat prenosi postojeće status/fazu, jedinice i dva nivoa porekla. | AC-01/02/08; B1/B6/B7 |
| F2-02 | Stroga validacija svih granica i bezbedne srpske kategorije grešaka; 400/413 čuvaju poslovno stanje; 429 daje sekunde čekanja. | AC-07/10; B2/B4 |
| F2-03 | Nema kandidata kod `no_matching_trial`; isključenja imaju razloge; `not_in_sources` ne izmišlja odgovor. | AC-05; B3 |
| F2-04 | Stvarni adapter i mock su odvojeni, režim i metapodaci istiniti, ključ samo na serveru; Gemini gemini-3.5-flash-lite je početni adapter, stvarni režim podrazumevan, mock eksplicitan u testovima. | AC-01/07/10; B5/C1 |
| F2-05 | Zadržati retry iz 002 (ista putanja/telo), failed terminalan, invalid_transition/run_not_found vode na novi unos; sprečiti dupliranje iste operacije bez resetovanja budžeta. | AC-03/10; B10 |
| F2-06 | Jedan run ima ulaz ≤4000, kontekst ≤12000, model ≤4 logička poziva uključujući popravku, alat ≤10, model ≤20000 ms, run ≤60000 ms, alat ≤2000 ms, dopuna ≤5; 20 zahteva/minut/klijent. Samo timeout/429/5xx imaju dva retry-a 500/1500 ms, zasebno evidentirana. | AC-03/07/10 |
| F2-07 | Model izdvaja samo navedene vrednosti na tri jezička oblika, prepoznaje nameru i parcijalni patch; kod normalizuje, odlučuje, rangira i bira pitanje. | AC-01–07; C1/C4 |
| F2-08 | Sva četiri alata zaista se koriste kroz validirani registar, bez proizvoljnih operacija; nema izmišljanja izvedenih vrednosti. | AC-02/04/09/10 |
| F2-09 | Retrieval filtrira metapodatke, pretražuje reči, rerangira i ograničava izvore; citat vezan za kriterijum ima dozvoljen ID i tačan tekst; podrška tvrdnji se proverava odvojeno, brojevi prema rezultatu. | AC-01/05/08/09; C3/C4 |
| F2-10 | Lokalni importer i pregled pravila čuvaju stabilne izvore, sve kriterijume i verzionisano odobrenje 15–20 studija; compile proces je isključivo lokalni, bez modelskog generisanja pravila. | AC-01/08/09; C2/C3 |
| F2-11 | UI povezuje nove ugovore, očuva dizajn, sva stanja, bezbedan tekst i pristupačnost; lokalno pokretanje izgrađenog UI/API je dokumentovano. | AC-01/03/05/10/12; B8/D2 |
| F2-12 | Evaluator prolazi stvarni aplikacioni tok; potvrdni flag, ograničenje poziva/troška, zamrznuti slučajevi, prvo rezervisanje baseline-a i zapis delimičnih rezultata. | AC-01–10; CAP-05 |
| F2-13 | Oko 30 ljudski označenih kriterijuma ima odvojene predikcije i verzije; preciznost/odziv nisu mock skripta predstavljena kao živi kvalitet. | AC-07/08; CAP-05 |
| F2-14 | Tragovi čuvaju stvarne pokušaje/alate/vreme/tokene kada dostupni, verzije i git stanje; nema tajni ni sirovog profila; lokalna fault simulacija nije javni endpoint. | AC-08–10; D3/D4 |
| F2-15 | Mape dokaza, uputstva, stvarni doprinosi i pregled tuđeg rada prate isporuku; istorijski rezultati ostaju vezani za tadašnju verziju. | CAP-01/07/08; D1/D2 |

### Ključni entiteti

Izvršavanje sa profilom, poreklom i kumulativnim budžetom; manifest i verzija korpusa; izvorni odlomak; pregledano pravilo vezano za verziju; rezultat kriterijuma i studije; modelski/alatni događaj; ljudska oznaka i zasebna predikcija; evaluaciono pokretanje sa rezultatima i tragovima. Tehnički oblici su u [data-model.md](data-model.md).

## Kriterijumi uspeha

- **F2-SC1**: Sačuvan živi trag pokazuje stvarnu ekstrakciju i objašnjenje glavnog toka, a kod određuje sve kriterijumske statuse; offline rad ne zahteva ključ ni trošak.
- **F2-SC2**: Svaka uključena studija u korpusu od oko 15–20 ima pregled tačne verzije; nijedna nepregledana ne ulazi u matcher.
- **F2-SC3**: Oko 30 kriterijuma ima ljudske oznake, zasebne predikcije i reproduktivan obračun metrika; neizračunljiva metrika nije 0% niti uspeh.
- **F2-SC4**: Prvi potpuni živi pokušaj svih 16 fiksnih slučajeva sačuvan je kao nepromenljiv baseline, uključujući neuspehe i režime; prekid je vidljiv kao nepotpun pokušaj.
- **F2-SC5**: Stvarni pregled glavnog UI toka, dopune, hipoteze, isključenja i grešaka beleži pregledaoca, datum i nalaze, uz pristupačnost AC-12.
- **F2-SC6**: Dokumentacija jasno razlikuje implementaciju spremnu za živo pokretanje od izvršene Faze 2 sa baseline-om; nijedan blokiran/preskočen zadatak nije završen.

## Pretpostavke i granice

AC-01–AC-10 zadržavaju značenje iz [001](../001-trialmatch-core/spec.md) i brief-a; AC-12 iz [002](../002-ui-role-a/spec.md) ostaje pristupačnost. AC-11 je samo opisano buduće proširenje; AC-13 se ne realizuje. Detaljna sledljivost je u readiness mapi.

Memorijsko stanje i postojeći stek ostaju. Nema javnog hostinga/Vercel-a (B9, javni deo B8/D3), naloga, baze, embeddings, glasa ni autonomnih agenata u aplikaciji. Faza 3 (optimizacija/poređenje), čist checkout drugog člana, tag i odbrana iz Faze 4 ne izvršavaju se. X-01–X-03 nisu primenljivi jer nema spoljnog upisa.

Imena vlasnika/pregledalaca ostaju TODO do potvrde. Samo sintetički profili; pravi studijski snimak postavlja čovek. Potvrđene formule i kontrolne vrednosti se ne otvaraju ponovo; nove/izmenjene nose izvor i „PROVERITI prema originalnoj publikaciji“ do potvrde.
