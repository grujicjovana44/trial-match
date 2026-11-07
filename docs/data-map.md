# Mapa podataka

| Podatak               | Poreklo                                | Obrada i mesto                                                            | Ograničenja                                                    |
| --------------------- | -------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Profilni tekst        | Sintetički unos u lokalnom pregledaču  | Serverski zahtev, izdvaja se u strukturisani profil; stanje je memorijsko | Ne unositi stvarne podatke; nema trajnog skladištenja          |
| Profilna polja        | Mock izdvajanje i/ili odgovor/hipoteza | Shared Zod šeme, matcher i izvedene vrednosti                             | Nepomenuta polja ostaju odsutna; provenance beleži poreklo     |
| Studije i kriterijumi | `data/fixtures/trials.json`            | Lokalni server i retrieval                                                | T-A/T-B/T-C su sintetički                                      |
| Citati                | `sourceQuote` u lokalnim fixture-ima   | Provera u serveru, prikaz u UI-ju                                         | Samo izvor iz tekućeg izvršavanja                              |
| Evaluacioni primeri   | `eval/cases.jsonl`, sintetički         | Offline evaluator i testovi                                               | Real-model slučajevi se preskaču/dry-run-ujemo bez PASS ishoda |
| Trace evaluacije      | Generisani rezultati                   | `eval/results/<label>/traces/`                                            | Bez sirovog profila, tajni i unutrašnjeg rezonovanja           |

Pravi studijski snimak nije preuzet. Ako se koristi u kasnijoj fazi, čovek ga ručno stavlja u `data/raw/`; mrežno preuzimanje niti automatsko prikupljanje nisu dozvoljeni.
