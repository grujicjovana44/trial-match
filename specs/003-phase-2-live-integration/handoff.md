# Predaja funkcionalnosti 003

## Prvi konkretan paket: oblast B

Implementacioni paket su **T301–T310** iz [tasks.md](tasks.md): polazni offline provera, shared ugovori, server greške/metapodaci/isključenja/429/provenance, zaštita duplog izvršavanja u skladu sa 002, lokalno serving izgrađenog UI-ja. B paket čuva mock putanju i ne zahteva model key ili plaćene pozive. U implementacionoj sesiji korisnik pokreće `speckit-implement` samo za te ID-jeve i pregleda paket pre sledećeg.

### Uslovi za T301–T310

- Radna kopija u startu proverena: tada je postojala korisnikova izmena `.github/workflows/ci.yml` i nepraćeni `plan/`; ne vraćati i ne uključivati bez pregleda. Proveriti aktuelni status ponovo.
- Postojeće verzije Node 24.22.1/pnpm 12.16.1 iz planiranog setup-a; lokalni binariji mogu biti drukčiji. Prijaviti tačne komande i ishode; ne popravljati okruženje izvan odobrenog scope-a.
- Ne koristiti realne profile. Ne kontaktirati Gemini/OpenAI. Prvo paket B koristi existing mock.
- Prvo izvršiti polazne provere; ako ne prolaze, zabeležiti osnovu i ne pripisivati postojeći kvar 003 bez izolacije.
- Zatvoriti samo tasks čiji testovi/offline provere stvarno prolaze; docs ažurirati uz ponašanje. Ne commit/push.

## Ostali paketi i raspodela

| Oblast | Planirani paket | Zavisi | Budući review |
|---|---|---|---|
| C/B | T311–T316: per-run budget, provider-neutral adapter, Gemini REST, prompts, stvarni alati, retrieval | paket B; Gemini key samo za ručni live test | Budući vlasnik/pregledalac nije dodeljen. |
| C/D | T317–T323: importer, lokalni compile:rules, poreklo/review korpusa, kriterijumska metrika i ljudske oznake | `studies_50_recruiting_2026-11-12.json` i datum/vreme su dostavljeni; nedostaju endpoint/upit/paginacija/licenca i review pravila | Čovek potvrđuje tačan source/rule version. |
| A | T324–T325: UI ugovori i lokalni built preview; zatvara T220/T221/T232/T244 dokazima | B/C ugovori | Aleksa je ranije izvršio A; završni vlasnik/reviewer za 003 nije potvrđen. |
| D | T326–T335: live guard/evaluator, EV freeze, rezervacija baseline-a, odobrenja, zapis prvog baseline-a, docs/offline final; T336 je uslovan | adapter, fixtures freeze, key, zlatni skup, approval | Član tima mora biti imenovan pre CAP-08 dokaza. |

Dokumentovana istorija: Jovana je napravila osnovu i sve pre Aleksinog dela; Aleksa je izvršio UI oblast A u 002; Jelena je pregledala dosadašnji rad. To ne imenuje buduće vlasnike B/C/D ili A povezivanja. U `docs/team.md` imena za ta buduća mesta ostaju TODO dok se ne potvrde.

## Obavezni ljudski unosi

| Potrebno od čoveka | Kada se traži | Dokaz / posledica ako nedostaje |
|---|---|---|
| Izbor provajdera/modela i dozvola za potreban mrežni pristup | Potvrđeno za test: Gemini `gemini-3.5-flash-lite`; pre budućeg provider koraka proveriti izmenu izbora | Gemini dokumentacija je čitana uz odobrenje; nema živog pristupa. Izbor OpenAI za produkciju ostaje budući predlog. |
| Serverski API ključ, unet lokalno van verzionisanih fajlova | Pre prvog stvarnog poziva | Proveriti samo prisustvo; live ostaje blokiran ako nedostaje. |
| Poreklo dostavljenog JSON-a `data/raw/studies_50_recruiting_2026-11-12.json` | Pre nego što se snimak smatra ponovljivim ili usklađenim korpusom | Lokalni statički pregled nalazi 50 jedinstvenih NCT zapisa i `nextPageToken`; korisnik je potvrdio datum 2026-11-12, a filesystem creation time je 01:47:55 +01:00. Endpoint, tačan upit/filtere, status drugih stranica i uslovi korišćenja još nisu zabeleženi. T317 lokalno proverava importer, T319 traži čovekovu potvrdu preostalih metapodataka. Sadržaj fajla nije menjan. |
| Pregled uslova korišćenja registra | Pre tvrdnje da su potvrđeni | Status ostaje TODO. |
| Pregled odlomaka i pravila za oko 15–20 studija | Pre matcher uključenja | Nepregledane studije se ne ocenjuju; odobrenje vezano za hash. |
| Ručno označavanje/pregled oko 30 kriterijuma | Pre metrika zahteva Faze 2 | Existing gold osam primera su profilna mock ekstrakcija; nisu zamena. |
| Potvrda novih/izmenjenih formula, pragova i izvora | Pre upotrebe kao potvrđenih | Oznaka „PROVERITI prema originalnoj publikaciji“. Potvrđene eGFR/BMI/jedinice se ne otvaraju bez razloga. |
| Dozvola/cap za živi poziv | Neposredno pre svakog poziva; T332 UI smoke i T331 evaluator su odvojeni scope-ovi | Prikazati komandu, model, sintetički ulaz ili tačno 16 EV slučajeva, pokušaje/token cap i cenovnik/datum ako poznat. Bez scope-specifičnog odobrenja nema poziva. |
| Pregled citata, objašnjenja i UI toka u pregledaču | Posle integracije | Stvarni reviewer, datum, browser i nalazi; ne označavati unapred. |
| Buduća raspodela vlasnika/pregledalaca B/C/D/A | Pre CAP-08 atribucije i paralelnog paketa | Ne pretpostavljati iz git autorstva; tasks napreduju bez imena, review claim ostaje otvoren. |

## Poznate granice plana

- Stvarni Gemini ključ, token usage i cenu nisam proverio. Provider doc navodi podršku za structured output; Zod/business validation i dalje odlučuju da li sadržaj važi. Vidi [zvaničnu stranicu modela](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite) i [REST ugovor](https://ai.google.dev/api/generate-content).
- `compile:rules` je potvrđen kao isključivo lokalni. Ne pravi se model prompt za pravila.
- Testovi/CI eksplicitno mock; produkcioni režim je live podrazumevano, missing key daje grešku.
- `failed` ostaje terminalan. Retry koristi isti path/body iz 002; invalid_transition/run_not_found nude Počni iznova. Idempotency zaštita sprečava duplikate i ne resetuje budžet.
- T332 stvarni UI smoke i T331 live baseline su odvojeni plaćeni koraci, svaki sa zasebnom prethodnom dozvolom i ograničenjem. Live baseline je T331. Provereno 2026-11-12: `eval/results/baseline/` ne postoji u ovoj radnoj kopiji. Ponovo proveriti neposredno pre poziva; ako se u međuvremenu pojavi, stati i prijaviti poreklo.
- Nema public deploy, Vercel, naloga, baze, vector DB, voice/AC-13, realizacije AC-11 ili faze 3/4 rada.

## Prompt za buduću implementaciju paketa B

> Pročitaj `AGENTS.md`, konstituciju i dokumentaciju `specs/003-phase-2-live-integration/`. Koristi `speckit-implement` samo za prvi spreman paket oblasti B, zadatke T301–T310 iz `tasks.md`. Najpre proveri aktuelni git status, granu, verzije alata i polazne offline provere. Poštuj korisnikovu izmenu i tuđe fajlove; ne vraćaj ih. Koristi Gemini samo ako je kasniji zadatak iz paketa; za T301–T310 ostani na postojećem mock režimu. Ne traži niti prikazuj tajnu u razgovoru. Prati potvrđene ugovore iz decisions/research/contracts: live je podrazumevan, mock testovi eksplicitni, failed terminalan, isti path/body retry uz zaštitu dupliranja, compile:rules je lokalni. Za bilo koju promenu koja traži mrežu, sirovi snimak, ručni pregled ili plaćeni model poziv stani dok čovek ne dostavi potreban unos ili odobrenje. Implementiraj samo T301–T310, pokreni relevantne offline provere, ažuriraj task/spec/docs/evidence prema stvarnim rezultatima. Ne pokreći živi baseline, ne commit/push. Na kraju prijavi tačne rezultate i naredni paket.
