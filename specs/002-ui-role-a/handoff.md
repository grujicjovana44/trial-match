# Predaja za implementaciju: Korisnički tok i interfejs TrialMatch (Uloga A)

**Datum**: 2026-11-10 | **Funkcionalnost**: `specs/002-ui-role-a/` | **Vlasnik**: Uloga A

Ovaj dokument predaje planiranje modelu koji implementira. Planiranje je završeno; implementacija nije počela. Ništa nije komitovano. **Predaja je spremna za novu sesiju implementacije prve grupe (T201–T214)**: okruženje je pripremljeno, tim je odobrio `motion`, zahtevi drugim ulogama su poslati i pregled kvaliteta UX zahteva je završen.

## 1. Status

| Korak SpecKit-a | Stanje | Rezultat |
|---|---|---|
| 1. `speckit-specify` | Završen | [spec.md](spec.md), ažuriran za finalni proizvod: 10 priča, FR-001–FR-034, SC-001–SC-016, 16 stanja prikaza. |
| 2. `speckit-clarify` | Završen | Sedam odgovora u odeljku „Clarifications“ (2026-11-09 i 2026-11-10). |
| 3. `speckit-plan` | Završen i odobren | [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/ui-api.md](contracts/ui-api.md), [contracts/cross-team-requests.md](contracts/cross-team-requests.md), [quickstart.md](quickstart.md). |
| 4. `speckit-tasks` | Završen | [tasks.md](tasks.md): 52 zadatka (T201–T252), 5 blokiranih, 2 ručna. |
| 5. `speckit-checklist` | Završen | [checklists/ux.md](checklists/ux.md): 64 stavke; CHK001–CHK053 pregledane i označene, CHK054–CHK064 ostaju za gotovu implementaciju. |
| 6. `speckit-analyze` | Završen, ispravke odobrene i primenjene | Vidi ispod. |
| 7. Predaja | Ovaj dokument | |

**Rezultat analize**: nijedan kritičan nalaz i nijedno odstupanje od konstitucije. Svih 34 zahteva ima bar jedan zadatak (FR-025 samo blokiran zadatak T221). Od 13 nalaza, 10 je ispravljeno u artefaktima (merenje SC-011, zavisnost T217, test adrese servisa, oba režima u T238, brisanje izbora posle neuspelog odgovora, spisak testova u planu, formulacija o jsdom-u, pravilo o opcionim poljima, proširen REQ-D2, primer u specifikaciji). Dva nalaza bila su preduslovi iz odeljka 2; oba su sada razrešena: okruženje je pripremljeno i tim je odobrio `motion`. Jedan je namerno bez izmene: brojevi zadataka počinju od T201, a šest komandnih ili ručnih zadataka nema putanju datoteke u naslovu.

## 2. Spremnost za prvu grupu (potvrđeno 2026-11-10)

| # | Preduslov | Zašto |
|---|---|---|
| 1 | **Okruženje mora biti provereno u konkretnoj implementacionoj sesiji**. Na ovom računaru su provereni Node.js `24.22.1` i pnpm `12.16.1`, ali to ne garantuje iste alate na drugom računaru ili u procesu bez profila. Prenosivo podešavanje je [setup-toolchain.ps1](setup-toolchain.ps1). | Pre T201, iz korena repozitorijuma u istom PowerShell procesu izvršiti `. .\specs\002-ui-role-a\setup-toolchain.ps1`. Skripta proverava postojeće alate; ako nedostaju, instalira tačne verzije za trenutnog korisnika, proverava SHA256/SHA512 zvaničnih arhiva i postavlja PATH. Ne traži administratorska prava. |
| 2 | **Završeno: tim je odobrio `motion` 14.6.0** (REQ-T1), prema potvrdi vlasnika 2026-11-10. Odluka i pregled uticaja zabeleženi su u `research.md`, R-16. | T246 prenosi odluku u `docs/decisions.md`; taj budući zapis ne blokira prvu grupu i ne traži novo odobrenje. |
| 3 | **Završeno: zahtevi poslati Ulogama B, C i D**, prema potvrdi vlasnika 2026-11-10: [contracts/cross-team-requests.md](contracts/cross-team-requests.md). | Njihov rad teče paralelno; poslati zahtevi ne znače da su blokirani zadaci već odblokirani. |
| 4 | **Završeno: pregled [checklists/ux.md](checklists/ux.md)**. Svih 53 stavke iz odeljaka 1–9 zadovoljavaju; 11 stavki iz odeljka 10 čeka gotovu implementaciju. | Poznate neoznačene stavke CHK054–CHK064 nisu blokada prve grupe. Vlasnik je zatražio pripremu za početak implementacije; ta provera je unapred odložena, a ne lažno označena kao završena. |

**Provera skripte 2026-11-10**: pokrenuta je u novom PowerShell procesu bez profila i sa sistemskim PATH-om; pre inicijalizacije Node je bio `v24.14.0`, posle nje `v24.22.1`, pnpm `12.16.1`, `pnpm exec node --version` je dao `v24.22.1`, a `pnpm exec tsc --version` `5.9.3`. Posebna provera u praznoj privremenoj fascikli uspešno je instalirala obe pinovane verzije, uključujući provere integriteta. Aplikacioni testovi nisu pokretani ovom popravkom i T201 nije označen kao završen.

**Kompatibilnost sa Windows PowerShell-om (ispravka 2026-11-10)**: skripta više ne koristi `RuntimeInformation.OSArchitecture`, koji u prijavljenom okruženju vraća praznu vrednost. Arhitektura se čita iz `PROCESSOR_ARCHITEW6432`, odnosno `PROCESSOR_ARCHITECTURE`. Provereno je pokretanje bez profila u Windows PowerShell-u `5.1.26100.9818` i PowerShell-u `7.6.9`, sa početnim Node-om `v24.14.0`: posle inicijalizacije oba prijavljuju Node `v24.22.1`, pnpm `12.16.1`, `pnpm exec node --version` daje `v24.22.1`, a TypeScript `5.9.3`.

**Prenos između terminala i računara**: `init.ps1` je lokalna datoteka, a ne deo repozitorijuma. Njeno odsustvo na drugom računaru nije razlog da se odustane od T201 pre pokušaja podešavanja. Koristiti skriptu iz ovog feature foldera; instalacija razvojnih alata je izričito odobrena zahtevom vlasnika da se ova blokada otkloni. Mreža se koristi samo za zvanične arhive Node-a i pnpm-a, ne za studije ili pozive modela. Ako agent pokreće svaku komandu u novom procesu bez profila, na početak svake komande sa proverama dodati `. .\specs\002-ui-role-a\setup-toolchain.ps1`. Posle prvog pokretanja to koristi lokalne alate bez preuzimanja. Ako skripta prijavi stvarnu grešku (mreža, dozvole, arhitektura), prijaviti njen tačan tekst i okruženje; ne menjati pinovane verzije u projektu.

**Pravilo kontrolne liste za prvu grupu**: model prijavljuje 53/64 označene UX stavke i 11 odloženih provera gotovog proizvoda. Dozvoljeno je nastaviti T201–T214 uz upravo te neoznačene stavke; ne traži ponovljeno odobrenje i ne označava ih kao završene. Ako se pojavi nova neoznačena stavka kvaliteta zahteva (CHK001–CHK053), prijavljuje je vlasniku. Očekivani ishod ovog pregleda ne tvrdi da aplikacija ili testovi već prolaze.

## 3. Redosled implementacije

Jedna grupa po sesiji ili po zahtevu vlasnika. Posle svake grupe model staje i čeka pregled.

| Grupa | Zadaci | Sadržaj | Zavisi od drugih uloga |
|---|---|---|---|
| 1 | T201–T214 | Polazno stanje, tekstovi, pomoćni graditelji za testove, tokeni i kontrast, model greške, mrežni sloj, reduktor, modeli prikaza, prelazak `App.tsx` na reduktor | Ne |
| 2 | T215–T219 | Priča 1: red kriterijuma, kartica studije, pregled studija, kartica profila, panel rezultata | Ne |
| 3 | T222–T225 | Priča 2: dopuna jednim klikom, „Šta ako?“, obrazac unosa sa proverom, „Počni iznova“ | Ne |
| 4 | T226–T229 | Priča 3: tekstovi ishoda, panel greške, odbrojavanje, prethodni rezultat posle greške | Ne |
| 5 | T230, T231, T233, T234 | Priča 4: oznaka režima, upozorenje i podnožje iz `meta`. Priča 6: red obrade, zastareo rezultat | Ne |
| 6 | T235–T238 | Priča 5: fokus, bezbedan prikaz, uski ekrani i smanjen pokret, provera internih naziva | Ne |
| 7 | T239, T240, T241, T243, T245, T246, T247, T248 | Dokumenta (tabela AC, mapa pokrivenosti, demonstracioni scenario, pokret, odluke), provera izgrađene verzije, čišćenje, završna provera | Ne |
| Ručno | T249 | Vlasnik Uloge A prolazi [quickstart.md](quickstart.md) u pregledaču | Ne |
| 8 (poslednja) | T250–T252 | Priča 9: glasovni unos (AC-13, opciono) | Ne |

**Na čekanju** (ne ulaze ni u jednu grupu dok zahtev ne bude isporučen; tada se rade kao zasebna mala grupa):

| Zadatak | Čeka | Šta tačno |
|---|---|---|
| T220 | Uloga B | REQ-B7: jedinica i poreklo uočene vrednosti po kriterijumu u `CriterionResultSchema` |
| T221 | Uloga B i Uloga C | REQ-B6: status regrutacije i faza u `TrialResultSchema`; REQ-C2: stvarni snimak sa tim podacima |
| T232 | Uloga B | REQ-B1: datum snimka u `MetaSchema` |
| T242 | Uloga B | REQ-B8 i REQ-B9: javna isporuka i čuvanje provere na platformi Vercel |
| T244 | Uloga B i Uloga C | REQ-B5: stvarni režim na serveru; REQ-C1: stvarni model u glavnom toku |

Kada model stigne do zadatka sa oznakom `[BLOCKED]`, preskače ga, navodi u izveštaju šta čeka i ne pokušava da uradi posao druge uloge.

## 4. Pravila za model koji implementira

1. Pročitaj i poštuj `AGENTS.md` i `.specify/memory/constitution.md`. Ne menjaj konstituciju.
2. Dizajn je zadat u [plan.md](plan.md), odeljak 5, a tekstovi u odeljku 6. Ne uvodi novu boju, veličinu, razmak, tekst ni komponentu. Ako nešto nedostaje, stani i pitaj.
3. Diraj samo `apps/web/**` i dokumenta navedena u zadacima: `docs/spec.md`, `docs/ac-coverage.md`, `docs/demo-script.md`, `docs/ui-motion.md`, `docs/decisions.md`. U `specs/002-ui-role-a/` smeš samo da označiš završene zadatke u `tasks.md`.
4. Nikad ne menjaj `packages/shared/**`, `apps/server/**`, `eval/**`, `scripts/**`, `data/**`, `README.md`, `package.json`, `pnpm-lock.yaml`, `vite.config.ts`, `vitest.config.ts`, `tsconfig*.json`, `eslint.config.js` ni `.github/**`. Ako je izmena tamo neophodna, napiši zahtev za odgovarajuću ulogu u izveštaju i stani.
5. Ne dodaj zavisnosti. `motion` 14.6.0 je jedina biblioteka za animaciju.
6. Radna kopija sadrži nekomitovan rad (sloj pokreta, sažetak, potvrda dopune). To je polazna osnova: ne vraćaj je i ne prepisuj ono što već radi.
7. Testovi ne pozivaju mrežu ni plaćene API-je modela. `fetch` se uvek zamenjuje lažnim.
8. Bez `any`. Bez `dangerouslySetInnerHTML`, `innerHTML` i pretvaranja Markdown-a u HTML. Sav tekst iz odgovora servera je običan tekst.
9. Nazivi kontrola koje testovi koriste ostaju: „Opis profila ili pitanje“, „Proveri kriterijume“, „Pošalji dopunu“, „Ponovi proveru“, „Unesite samo hipotetičku izmenu profila“ i dugmad ponuđenih odgovora.
10. Posle svakog zadatka pokreni `pnpm typecheck`, `pnpm lint` i `pnpm test`. Posle svake grupe pokreni i `pnpm build` i `pnpm format:check`. Pre provera u istom PowerShell procesu učitaj `. .\specs\002-ui-role-a\setup-toolchain.ps1`; ona radi i kada lokalni `init.ps1` ne postoji. Zatim proveri `node --version` i `pnpm --version`. Na ovom računaru Python se zove `python`, ne `python3`.
11. Prijavi tačne rezultate: koja komanda, koliko testova je prošlo i palo, i tekst greške ako je bilo. Ne tvrdi da provera prolazi ako nije pokrenuta.
12. Ne komituj i ne šalji na udaljeni repozitorijum dok vlasnik to izričito ne zatraži. Ako vlasnik zatraži komit, poruka ne sadrži red `Co-Authored-By` ni bilo kakvu oznaku da je alat pomagao.
13. Posle grupe stani. Ne počinji sledeću grupu bez odobrenja vlasnika.

## 5. Otvorena pitanja i zahtevi drugim ulogama

Pun tekst zahteva je u [contracts/cross-team-requests.md](contracts/cross-team-requests.md).

| Zahtev | Kome | Šta je potrebno | Koji zadatak čeka |
|---|---|---|---|
| REQ-T1 | Tim / Uloga A | **Odobreno 2026-11-10**; preostaje prenos zapisa u `docs/decisions.md` kroz T246 | Nijedan; odobrenje više nije otvoreno |
| REQ-B1 | Uloga B | Datum snimka skupa u `meta` | T232 |
| REQ-B2 | Uloga B | Konačna lista kategorija grešaka, `retryable` za svaku, potvrda da je `message` bezbedan za prikaz | Nijedan; nepoznata kategorija dobija opštu poruku |
| REQ-B3 | Uloga B | Isključene studije sa razlozima za `no_matching_trial` | Nijedan sada; kasniji rad |
| REQ-B4 | Uloga B | Vreme čekanja uz HTTP 429 (zaglavlje `Retry-After`) | Nijedan; bez zaglavlja odbrojavanje je 60 s |
| REQ-B5 | Uloga B | Stvarni režim na serveru, tačan `meta` | T244 |
| REQ-B6 | Uloga B | Status regrutacije i faza u rezultatu po studiji | T221 |
| REQ-B7 | Uloga B | Jedinica i poreklo uočene vrednosti po kriterijumu | T220 |
| REQ-B8 | Uloga B | Kako se izgrađeni interfejs služi uz server; pristup sa druge adrese | T242 |
| REQ-B9 | Uloga B | Čuvanje provere i ograničenje broja zahteva na platformi Vercel | T242 |
| REQ-B10 | Uloga B | Nastavak provere posle greške koja se može ponoviti u dopuni ili hipotezi | Nijedan; do tada „Pokušaj ponovo“ u tom slučaju vodi do „Počni iznova“ |
| REQ-C1 | Uloga C | Stvarni model u glavnom toku | T244 |
| REQ-C2 | Uloga C | Stvarni snimak sa NCT identifikatorima, statusom i fazom | T221 |
| REQ-C3 | Uloga C | Citat je rečenica kriterijuma, ne ceo blok | Nijedan |
| REQ-C4 | Uloga C | Objašnjenje i pitanje su običan tekst, bez Markdown-a | Nijedan |
| REQ-D1 | Uloga D | Mapa dokaza upućuje na `docs/ac-coverage.md` | Nijedan |
| REQ-D2 | Uloga D | README: izgrađena verzija, `VITE_API_BASE_URL`, usklađen opis toka | Nijedan |
| REQ-D3 | Uloga D | Bezbednosna provera javne isporuke | Nijedan |
| REQ-D4 | Uloga D | Ponovljiv način da se na živoj aplikaciji izazovu istek vremena i servisna greška | Ručna provera stanja 10 i 11 |

**Otvoreno, a nije zahtev**:

- Predlozi veštine `taste` koji nisu ugrađeni (tamna tema, biblioteka ikona, zamena preostale duge crte u podnožju) su u [plan.md](plan.md), odeljak 5.1. Odlučuje vlasnik Uloge A.
- Nije provereno pristupom mreži: oblik adrese `https://clinicaltrials.gov/study/{NCT}` (potvrđuje se ručno), skup vrednosti statusa regrutacije i faze (potvrđuje Uloga C), ishodi unosa iz [quickstart.md](quickstart.md) u stvarnom režimu.

## 6. Prompt za sesiju implementacije (spreman za lepljenje)

```text
Ti implementiraš prvu grupu zadataka funkcionalnosti 002 (interfejs, Uloga A) u projektu TrialMatch, u lokalnoj fascikli D:\Trial_Match. Ne kloniraj repozitorijum sa GitHub-a: najnoviji rad postoji samo lokalno.

Pre bilo kakve izmene pročitaj, ovim redom:
1. specs/002-ui-role-a/handoff.md (ceo; odeljak 4 su pravila koja važe za tebe)
2. specs/002-ui-role-a/tasks.md
3. specs/002-ui-role-a/plan.md (odeljak 5 je dizajn, odeljak 6 su svi tekstovi interfejsa)
4. AGENTS.md
5. docs/ui-motion.md
Kada zadatak uputi na data-model.md, research.md, contracts/ ili quickstart.md u istoj fascikli, pročitaj navedeni odeljak.

Ne otvaraj i ne pretražuj node_modules/, dist/, .claude/, .specify/scripts/, .specify/templates/ ni ceo pnpm-lock.yaml.

Preduslovi su završeni: tim je odobrio motion 14.6.0, zahtevi drugim ulogama su poslati, a UX zahtevi CHK001–CHK053 su pregledani. CHK054–CHK064 su provere gotove implementacije i namerno ostaju neoznačene. Imaš odobrenje da počneš prvu grupu uz upravo tih 11 odloženih stavki; prijavi ih, ne označavaj ih kao završene i ne traži isto odobrenje ponovo. Ako se pojavi druga neoznačena stavka kvaliteta zahteva, prijavi je vlasniku.

Zatim pokreni veštinu speckit-implement (.agents/skills/speckit-implement/SKILL.md; ako se ne učita sama, pročitaj je i prati je doslovno) SAMO za grupu 1 iz handoff.md, odeljak 3: zadaci T201–T214, redom kojim su navedeni u tasks.md.

Pravila:
- Radi zadatak po zadatak. Svaki zadatak ima tačne datoteke, tačnu izmenu, test i uslov „Gotovo kada“. Ne dodaj ništa što u zadatku ne piše.
- Posle svakog zadatka pokreni pnpm typecheck, pnpm lint i pnpm test. Zadatak označi kao završen u tasks.md tek kada sve tri prolaze. Pre T201 u istom PowerShell procesu izvrši . .\specs\002-ui-role-a\setup-toolchain.ps1, pa proveri node --version i pnpm --version. Skripta sme da instalira pinovane razvojne alate za ovog korisnika; ne menja repozitorijumske zavisnosti. Ako svaki poziv terminala počinje nov proces bez profila, učitaj skriptu na početku svakog poziva sa proverama. Python se ovde zove python.
- T201 je prvi zadatak. Najpre pokušaj pripremu okruženja navedenom skriptom; samo odsustvo lokalnog init.ps1 nije razlog za zaustavljanje. Ako priprema ne uspe, ili posle nje verzije nisu tačne ili bilo koja polazna komanda padne, stani i prijavi tačan ishod. Ne menjaj aplikacioni kod van apps/web/.
- Diraj samo apps/web/** i dokumenta navedena u zadacima. Nikad ne menjaj packages/shared, apps/server, eval, scripts, data, README.md, package.json, pnpm-lock.yaml ni korenske konfiguracije. Ako ti se čini da je to neophodno, stani i napiši zahtev za odgovarajuću ulogu.
- Ne dodaj zavisnosti. Ne pozivaj mrežu ni plaćene API-je modela u testovima.
- Svi tekstovi interfejsa su u plan.md, odeljak 6; prepiši ih doslovno i ne smišljaj nove.
- Nekomitovan rad u radnoj kopiji je polazna osnova; ne vraćaj ga.
- Zadatke sa oznakom [BLOCKED] ili [RUČNO] preskoči i navedi u izveštaju.
- Ne komituj i ne šalji na udaljeni repozitorijum. Nigde ne dodaj red Co-Authored-By.
- Ako speckit-implement prijavi poznate neoznačene CHK054–CHK064, primeni izričito odobrenje iz ovog prompta za početak prve grupe. Kontrolne liste ne menjaj; završne provere ostaju za posle implementacije.

Kada završiš T214, pokreni još pnpm build i pnpm format:check, pa STANI. Ne počinji grupu 2.

Izveštaj na kraju (najviše 20 redova): koji su zadaci završeni; tačan ishod svake komande (broj testova koji su prošli i pali); spisak izmenjenih i novih datoteka; svako odstupanje od zadatka i zašto; sve što u kodu protivreči planu.
```

Za sledeće grupe isti prompt se koristi uz zamenu broja grupe i raspona zadataka iz odeljka 3.
