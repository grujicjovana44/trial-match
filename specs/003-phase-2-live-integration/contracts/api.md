# Ugovor API-ja i pouzdanosti

Status: nezavisne promene B1/B2/B3/B4/B6/B7 su planirane; oporavak B10 zadržava 002 po Q3, stvarni režim je podrazumevan po Q5. Rute ostaju POST /api/runs, /api/runs/{runId}/answer, /api/runs/{runId}/hypothesis, tela iz 001. Nijedna nova ruta nije implicitno odobrena. Zavisnosti: shared šeme, manifest loader, servis/store i A klijent.

Ulaz je strogi objekat sa jednim tekstom, 1–4000 karaktera; runId neprazan validiran parametar. Nevalidan JSON/ključevi/polja 400, predug unos 413 pre modela, alata i promene stanja. Ograničenje bajtova HTTP tela mora prihvatiti validan ćirilični unos od 4000 karaktera plus JSON omotač; karakteri nisu UTF-8 bajtovi. Testirati granične dužine na sva tri endpoint-a.

Poslovni statusi ostaju HTTP 200; 404 run_not_found; 429 rate_limit_exceeded sa `Retry-After` celim sekundama ceil(preostali prozor/1000), najmanje 1 i najviše 60 pri prozoru 60000 ms. UI čita zaglavlje i iz tela greške i iz transport fallback-a; kod odvojenih lokalnih origin-a omogućiti čitanje zaglavlja kroz ograničenu CORS konfiguraciju. HTTP 500 samo internal_contract_violation, bez izlaganja izuzetka. Sve omotače runtime validirati centralno.

## Kategorije nezavisnog prvog paketa

| Kategorija | HTTP / retryable | Bezbedna poruka / radnja |
|---|---|---|
| invalid_request | 400 / false | „Zahtev nije ispravan. Proverite unos.“ |
| invalid_profile | 400 / false | „Podaci profila nisu ispravni. Proverite vrednosti i jedinice.“ |
| invalid_hypothesis | 400 / false | „Hipotetička izmena nije ispravna. Proverite unos.“ |
| ambiguous_hypothesis | 400 / false | „Hipotetička izmena nije jasna. Navedite vrednost i jedinicu.“ |
| forbidden_intent | 400 hipoteza / false | „Ovaj zahtev nije podržan. Unesite samo izmenu sintetičkog profila.“ |
| input_too_large | 413 / false | „Unos je duži od dozvoljene granice.“ |
| run_not_found | 404 / false | „Provera nije pronađena. Počnite iznova.“ |
| invalid_transition | 400 / false | „Ova radnja nije dostupna u trenutnom stanju provere.“ |
| rate_limit_exceeded | 429 / true | „Prekoračen je broj zahteva. Sačekajte prikazano vreme.“ |
| internal_contract_violation | 500 / false | „Odgovor nije prošao internu proveru. Počnite novu proveru.“ |

Odbijanje zabranjene namere na početku je poslovni rejected, ne HTTP forbidden_intent. Postojeći internal_error se centralno mapira bez sirovog izuzetka.

## Kategorije izvršavanja i Q3

`model_call_limit`, `tool_call_limit`, `question_round_limit`, `run_timeout`, `unknown_tool`, `invalid_tool_arguments`, `invalid_tool_result`, `tool_error`, `tool_timeout`, `invalid_model_output`, `provider_auth_error`, `provider_config_error` nisu automatski ponovljivi. Poruke: ograničenje → „Provera je dostigla dozvoljeno ograničenje.“; alat → „Obrada nije završena zbog greške alata.“; nevalidan model → „Odgovor modela nije prošao proveru.“; konfiguracija → „Stvarni model nije pravilno podešen.“ Sve su običan srpski tekst bez tajni, nijedna ne tvrdi da server ništa nije izračunao.

`model_timeout`, `provider_rate_limit`, `provider_unavailable` imaju ograničeni mrežni retry samo u adapteru. Posle iscrpljivanja imaju retryable=true, kao 002 servisna greška. Ponovljeni nastavak failed run-a vraća invalid_transition i UI nudi Počni iznova; ne uvodi se nastavak failed. `retryable` nikad ne znači dozvolu da se naslepo ponovi terminalna mutacija. Provera invalid_source/invalid_quote/numeric_grounding beleži se u trace-u, a prikaz koristi provereni šablon, ne nevalidan citat.

Zaštita dupliranja: A dodaje `Idempotency-Key` (UUID) uz istu putanju i isto telo iz 002. Jedna korisnička radnja dobija ključ; retry iste radnje koristi isti ključ, novi unos/dopuna/izmena dobija novi. Server validira ključ i pamti ključ+putanja+hash tela+odgovor u memoriji tokom života procesa; ograničen cache do 1000 operacija, bez izbacivanja aktivnih. Posle isteka run deadline-a može očistiti završene operacije, ali poznati runId u terminalnom stanju nikad se ne rekonstruiše ili ponovo obrađuje. Restart gubi memoriju kao i postojeći store.

Ista aktivna operacija deli jedno obećanje/rezultat, bez novog poziva; isti ključ sa drugim telom/putanjom je 400 invalid_request. Različite operacije nad istom revizijom zaključavaju run; posle promene revizije zastareo zahtev dobija 400 invalid_transition pre modela. Za klijente bez ključa očuvati postojeći ugovor uz zaključavanje; UI 003 uvek šalje ključ. Cache sačuva i kontrolisani neuspeh pa ponovljen transport ne resetuje budžet. Ako je run već terminalno `failed`, ponovljeni zahtev vraća `invalid_transition` umesto novog izvršavanja, što zadržava korisnički tok 002; ako je prethodni uspešan odgovor izgubljen, vraća se isti sačuvani uspešan odgovor. Uspešno završen odgovor vraća se iz cache-a kada je odgovor izgubljen.

Novi start posle izgubljenog odgovora bez cache-a (npr. restart) ne može imati garantovanu deduplikaciju kroz procese; UI mora jasno ponuditi novi unos, bez automatskog slanja. Pri popunjenom cache-u odbiti novo izvršavanje pre modela kontrolisanim 429 i Retry-After; ne izbaciti aktivnu operaciju radi novog zahteva. Nema baze ni javnog endpoint-a za cache.

## Metapodaci i isključenja

Primeniti data-model.md: manifest određuje date/origin/synthetic/version; ne poistovećivati demoMode i sintetičnost. Nema izmišljenog statusa/faze ako izvor nema podatak. `observedOrigin` ne menja profile.provenance. `excludedTrials` ispunjava REQ-B3 uz results=[] za insufficient_evidence. Isključenja ne menjaju deterministički redosled niti se nude kao kandidati. Bez izvora ide not_in_sources sa obe prazne kolekcije; ako filter isključi studiju, razlog se može prikazati samo uz stvarno validirano pravilo/izvor, nikad izmišljen matcher rezultat.

## Provere

Strogi zahtevi/odgovori svih statusa, 400/413 snapshot pre/posle, 429 zaglavlje, ćirilični limit, missing manifest vrednosti, sintetički/live kombinacije, null jedinice, provenance dopune/hipoteze, sve isključene naspram praznih izvora, kontrakt sa postojećim UI parserom. Q3 dodaje konkurenciju, izgubljen odgovor i identično ponavljanje bez dupliranja i resetovanja budžeta.
