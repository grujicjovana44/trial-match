# Alati, pronalaženje i izvori

Server bira fiksne nazive; model i ulazni tekst ne proširuju registar. Svaki alat proverava naziv, strict Zod ulaz, poslovni opseg, izlaz i vreme ≤2000 ms i preostali run rok. Najviše 10 stvarnih izvršenja po run-u; nema mrežnog retry-a alata. Nema shell/SQL/mrežnih adresa, spoljnog upisa ni tuđih run podataka.

| Naziv | Ulaz / izlaz | Poslovni opseg i greške |
|---|---|---|
| compute_egfr | age integer 0–120, sex male/female, normalizovan kreatinin 0.1–20 mg/dL → DerivedValue eGFR sa jedinicom/formulom/izvorom | Samo poznata tri ulaza; CKD-EPI 2021 potvrđena formula; missing ne poziva handler. Nevalidno → invalid_tool_arguments; neispravan izlaz → invalid_tool_result. |
| compute_bmi | height 50–250 cm, weight 2–400 kg → DerivedValue BMI | Potvrđena CDC formula; missing znači bez poziva. |
| evaluate_criteria | strogi profil, validirani izvedeni snapshot, samo approved pravila i njihovi izvori → TrialResult[] | Nema direktnog ponovnog računanja formula; manual_review unknown; inclusion/exclusion logika ostaje. Nepregledano pravilo se odbija pre handlera. |
| select_next_question | profil, rezultati i validirana pravila relevantnih neisključenih studija → Question ili null | Score broj studija, tie broj gde je jedina nepoznanica pa abecedno polje; nema izmišljene vrednosti. |

Greške handlera → tool_error; timeout → tool_timeout; nepoznato ime → unknown_tool pre pristupa podacima. Greška ne ostavlja met kriterijume kao tekući uspešan rezultat. Trace razlikuje odbijen zahtev za alat od stvarnog izvršenja. EV-14 očekuje 0 handler poziva pri odbijanju. EV-16 simulira grešku baš u compute_egfr.

Izvedeni snapshot računa se jednom za relevantne ulazne vrednosti po run-u; retrieval, matcher i pitanje čitaju isti rezultat. EV-04 zahteva jedan compute_egfr događaj sa ispravnim argumentima i 60.61 ±0.01; EV-08 nula kada nema kreatinina. Ukupan toolCalls nije broj samo eGFR poziva. Cache bez ponovnog računanja pri izmeni HbA1c čuva budžet EV-06; nova vrednost kreatinina traži novi obračun u istom budžetu. BMI kontrola 29.04 ±0.01, muškarac eGFR 62.11 ±0.01. Izvori ostaju iz potvrđenih odluka, nisu ponovo potvrđeni ovom sesijom.

Retrieval: samo pregledan korpus ili eksplicitni fixture paket; metadata filteri koriste samo poznate podatke i validirane korisničke filtere (EV-03 bez BMI). MiniSearch title=2, conditions=1, criteria=1; najviše 10 kandidata, 5 odlomaka i 12000 karaktera. Rerank broj proverljivih kriterijuma sa poznatim vrednostima, zatim razjašnjivih, pa ID. Konačni prikaz candidate/pending/excluded, opadajući udeo met, pa uppercase NCT leksikografski. Nema hardkodovanog dijabetesa.

Odvojiti sve izvore potrebne za determinističku procenu od malog skupa poslatog modelu. Objašnjenje ne citira izvor koji nije poslat tom pozivu, čak i ako je bio u staroj proceni. Svaki prikazani kriterijumski citat proverava se prema njegovom originalnom izvoru u tekućoj proceni. Ako svih pet odlomaka ne pokriva sve kriterijume, model objašnjava samo pokriveno; ostalo su provereni deterministički rezultati. Pretraga ne sme odbaciti razloge isključenja tako da ih kasnije izmišlja; zadržati dokaz o determinističkom filteru ili oceniti relevantne pregledane studije pre izdvajanja isključenja.

Provere: granice i jedinice, izlazna validacija, četiri stvarne putanje, timeout bez retry-a, cache invalidacija, unknown/manual_review, stabilna izjednačenja, EV-03 filter, citat iz prethodne revizije/van model konteksta, originalan tekst, injection bez promene presude. Zavisnosti: T303, T310–T315 za alate/retrieval i T317–T321 za stvarni korpus; fixture provere ne čekaju čoveka.
