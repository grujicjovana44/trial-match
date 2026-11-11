# Pokret u interfejsu (motion)

Interfejs koristi biblioteku [`motion`](https://motion.dev) (`motion/react`, verzija zaključana u `package.json`). Pokret je isključivo prezentacioni sloj: ne menja podatke, redosled, tekst ni ishod provere, i nikada ne odlaže prikaz rezultata.

## Načela

- **Pokret objašnjava promenu stanja.** Animiraju se samo prelazi koje korisnik treba da primeti: pojava rezultata, nastavak iste provere posle dopune, izbor odgovora, sažetak kriterijuma.
- **Bez slavljeničkih efekata.** Ishod studije se ne naglašava pokretom; konačnu odluku donosi lekar.
- **Tekst nosi značenje.** Boja i pokret samo prate tekstualnu oznaku statusa; čitači ekrana dobijaju pun tekst (npr. „3 od 4 ispunjeno, 1 nepoznato“), a animirani brojač je `aria-hidden`.
- **Smanjen pokret se poštuje.** `MotionConfig reducedMotion="user"` gasi pomeranja i skaliranja, a CSS animacije (`.pulse-dot`, `.shimmer-text`) su isključene u `prefers-reduced-motion: reduce`.
- **Ograničeno kašnjenje.** Kartice studija kasne najviše `8 × 0,04 s`; redovi kriterijuma se ne animiraju pojedinačno, da lista od 50 studija ne kasni.
- **Trajanje do ~0,6 s**, zajednička kriva i varijante u `apps/web/src/motion/motion-presets.ts`.

## Gde se koristi

| Element                        | Pokret                                              | Datoteka                                                                              |
| ------------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Oznaka režima                  | spora pulsirajuća tačka                             | `components/ModeBadge.tsx`, `styles.css`                                              |
| Red obrade                     | prelivajući tekst; poruka o dužem čekanju posle 5 s | `components/ProcessingStatus.tsx`, `styles.css`                                       |
| Panel rezultata i panel greške | ulazak (`enter`)                                    | `components/ResultPanel.tsx`, `components/ErrorPanel.tsx`, `motion/motion-presets.ts` |
| Kartice studija                | ulazak sa kašnjenjem `min(indeks, 8) × 0,04 s`      | `components/TrialCard.tsx`                                                            |
| Sažetak kriterijuma            | brojač i širenje segmenata                          | `motion/CriteriaSummaryBar.tsx`, `motion/AnimatedNumber.tsx`                          |
| Ponuđeni odgovor               | pritisak i trajno označen izbor (`aria-pressed`)    | `components/ClarificationForm.tsx`                                                    |
| Potvrda dopune                 | iscrtavanje kvačice i potvrda nastavka iste provere | `motion/SavedNotice.tsx`                                                              |
| Zastareo rezultat              | prelaz providnosti 0,2 s                            | `components/ResultPanel.tsx`, `styles.css`                                            |

Sažetak brojeva po studiji računa čista funkcija `summarizeCriteria` u `result-view-model.ts` (pokrivena jediničnim testom).

## Testovi

U jsdom okruženju `requestAnimationFrame` ne postoji, pa `motion` ne izvršava animacije; sav sadržaj je ipak odmah u DOM-u, tako da testovi ne zavise od pokreta. Ne uvoditi prikaz koji zavisi od završetka izlazne animacije (`AnimatePresence mode="wait"`), jer bi u testovima ostao nevidljiv.
