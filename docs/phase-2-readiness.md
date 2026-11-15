# Spremnost za Fazu 2 — kandidat `review-phase-2`

Ovaj dokument opisuje sadržaj grane čiji je poslednji commit bio `95f1169` (15.11.2026), uz naknadne izmene u radnoj kopiji. Ne potvrđuje stanje CI-ja na GitHub-u niti zamenjuje proveru pre merge-a.

## Šta je implementirano

- Provider-neutral LLM interfejs, Gemini REST adapter, serverska konfiguracija, validacija modelskog izlaza, ograničenja poziva, rokovi i ponovni pokušaji.
- API za profile, dopune i hipotetičke izmene; runtime validacija, ograničavanje zahteva, idempotency ključ i zaštita od konkurentnih izmena istog run-a.
- Deterministička procena kriterijuma i lokalni alati za BMI/eGFR, izbor pitanja i retrieval. Model ne donosi odluku o podobnosti.
- UI metapodaci za poreklo podataka, studije i rezultate; offline import, priprema i kompilacija pravila.
- Offline evaluacioni runner, gold-criteria metrike, testovi i CI workflow.
- Memorijsko stanje je ograničeno na 1.000 run-ova uz rok od 30 minuta; čišćenje uklanja i pripadajuće sesije/cache. Idempotency zapisi imaju rok od 60 sekundi i kapacitet 1.000; revisions se uklanjaju kad se red operacija isprazni.

## Podaci i ljudska provera

Grana sadrži lokalni paket `data/rule_sets/studies_2_approved_20261115_1539/` i izveštaj koji beleži dve studije kao odobrene, sa reviewer-om, datumom i hash-evima. To potvrđuje prisustvo review metapodataka u repozitorijumu, ali ne i nezavisnu proveru identiteta/ovlašćenja reviewer-a, licenci ili porekla izvornog snapshot-a.

Ostaje da se potvrde endpoint/izvoz, query/filteri, paginacija i uslovi korišćenja izvora. Nema čovekom označenog gold skupa za realne kriterijume ni objavljivih performansi. Gemini live transport i UI browser smoke nisu potvrđeni; live pozivi/evaluacije nisu uslov za offline razvoj.

## Provere

Prethodne provere navedene u staroj verziji ovog dokumenta odnosile su se na ranije stanje implementacije i ne treba ih tumačiti kao rezultate za kandidat `95f1169`. Za izmene upravljanja memorijom u ovoj radnoj kopiji pokrenuti su:

| Provera          | Rezultat                       |
| ---------------- | ------------------------------ |
| `pnpm test`      | PASS — 48 fajlova, 213 testova |
| `pnpm typecheck` | PASS                           |
| `pnpm lint`      | PASS                           |

Ovaj kandidat je offline implementacija sa lokalnim paketom pravila i review metapodacima; ne predstavlja validiranu live integraciju, potvrđenu licencu niti klinički validiran sistem.
