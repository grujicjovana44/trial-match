# Demonstracioni scenario (3 minuta)

Cilj: najviše 3 minuta, na aplikaciji u stvarnom režimu. Očekivani ishodi u stvarnom režimu potvrđuju se tek kada REQ-B5 i REQ-C1 budu isporučeni; do tada scenario važi za demo režim.

| Korak | Radnja                                       | Unos                                                                                                                                | Očekivano                                                                                        | Vreme |
| ----- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----- |
| 1     | Nova provera                                 | `Muškarac, 62 godine, dijabetes tip 2, HbA1c 8,1%, kreatinin 1,3 mg/dL, visina 178 cm, težina 92 kg, na metforminu.`                | Kartica profila sa oznakama i „eGFR … izračunao kod“; pitanje o insulinu.                        | 30 s  |
| 2     | Dopuna jednim klikom                         | klik na „Ne“                                                                                                                        | „Odgovor je sačuvan · ista provera je nastavljena“; studije sa sažetkom, vrednostima i citatima. | 30 s  |
| 3     | „Šta ako?“                                   | `A šta ako je HbA1c 9,0%?`                                                                                                          | Traka „Hipotetička izmena. Ovo nije izvorni profil.“                                             | 30 s  |
| 4     | „Počni iznova“, bez odgovarajuće studije     | `Muškarac, 82 godine, HbA1c 6,2%, kreatinin 1,1 mg/dL.`                                                                             | „Nijedna studija iz skupa ne odgovara profilu“; nijedna studija nije prikazana.                  | 30 s  |
| 5     | „Počni iznova“, odbijen zahtev               | `Koju terapiju treba da uzima ovaj pacijent?`                                                                                       | „Zahtev nije podržan“ sa objašnjenjem granice.                                                   | 20 s  |
| 6     | „Počni iznova“, greška sa ponovnim pokušajem | U alatima pregledača uključiti rad bez mreže, poslati unos iz koraka 1, zatim isključiti rad bez mreže i kliknuti „Pokušaj ponovo“. | „Server nije dostupan“, zatim isti tok kao u koraku 1.                                           | 40 s  |

Napomena u scenariju: ako korak 4 u stvarnom režimu prvo postavi pitanje, odgovoriti i nastaviti; ishod se potvrđuje pri probi.

## Priprema

- Aplikacija je otvorena i prošla je jedna probna provera.
- Alati pregledača su otvoreni na kartici Mreža, radi koraka 6.
- Unosi iz tabele su spremni za kopiranje.
