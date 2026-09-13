# MatTrin

**Hjælp til matematik — trin for trin. Du tænker, appen guider.**

MatTrin er en interaktiv matematikvejleder for HTX-elever. Den er ikke en
facitmaskine: eleven skriver selv sit næste trin, og appen kontrollerer det,
hintter, forklarer og holder processen i gang — indtil eleven selv finder
løsningen.

Live: **https://joachimth.github.io/mattrin/**

## Princippet

Opgave → analyse → *"Hvad tror du selv, næste trin er?"* → elevens svar →
kontrol → ros eller målrettet hint → næste trin → … → løsning →
*"Vil du prøve en selv?"*

Hele løsningen er altid tilgængelig, men aldrig den primære handling — den
kræver bekræftelse og er sidste udvej.

## Emner (v1)

- Reduktion af algebraiske udtryk (herunder brøker og fællesnævner)
- Lineære ligninger
- Andengradsligninger (diskriminant, nulpunkter)
- Faktorisering
- Differentialregning (potensreglen)
- Procentregning

Matematikkens korrekthed er **deterministisk**: en egen algebra-motor
(eksakte brøker + kanonisk rationale form) verifierer hvert mellemtrin.
Ingen AI, ingen flydende tal i sammenligninger.

## Teknologi

| Valg | Hvorfor |
| --- | --- |
| [Vite](https://vite.dev) + [React](https://react.dev) + TypeScript | Hurtig, moderne, typesikker SPA — ingen backend nødvendig |
| [Bun](https://bun.sh) | Pakkehåndtering, testrunner og byg med én toolchain |
| [KaTeX](https://katex.org) | Flotte formler i rigtig matematisk notation |
| Egen CAS-kerne (`src/math/`) | Deterministisk korrekthed uden eksterne tjenester |
| `localStorage` | Historik og progression uden login |
| GitHub Pages + Actions | Automatisk deploy ved push til `main` |

Valget mod Next.js er bevidst: appen er 100% klient-side (ingen serverbehov),
og en statisk build deployes sekundbehandlet til GitHub Pages.

## Kom godt i gang

```bash
git clone https://github.com/joachimth/mattrin.git
cd mattrin
bun install
bun run dev
```

Åbn http://localhost:5173. Krav: [Bun](https://bun.sh) ≥ 1.1.

## Kommandoer

| Kommando | Formål |
| --- | --- |
| `bun run dev` | Udviklingsserver med hot reload |
| `bun run build` | Typecheck + produktionsbyg til `dist/` |
| `bun run preview` | Serv byggem fra `dist/` lokalt |
| `bun test` | Testrunner (29+ tests af matematiske flows) |
| `bun run typecheck` | `tsc --noEmit` (strict) |
| `bun run lint` | ESLint |
| `bun run format` | Prettier |

## Test

```bash
bun test
```

Tests dækker motoren og de pædagogiske flows:

- **Obligatorisk case**: `(4a+b)/2-(2a-3b)/3` → `(8a+9b)/6`, inkl. validering
  af hvert korrekt mellemtrin (fællesnævner, omskrivning, fortegn, samling).
- Fortegn og parenteser (minus foran parentes)
- Lineære ligninger i flere skrivemåder (`x = 15/3` ≡ `x = 5`)
- Andengradsligninger (perfekte kvadrater, irrational diskriminant, d < 0)
- Faktorisering, differentialregning, procent
- Fejlgenkendelse (fortegnsfejl afvises med målrettet besked, ikke "forkert")
- Edge cases: danske decimaler (`0,5x`), implicit multiplikation,
  division med nul, uigenkendeligt input

## Arkitektur

Se [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for lagene, det matematiske
dataformat (`PlanStep`) og udvidelsespunkterne (OCR, AI-forklaringer, nye
emner, login/synkronisering).

## Bidrag

Se [CONTRIBUTING.md](CONTRIBUTING.md) — og husk produktreglen:

> Hjælper denne funktion eleven med selv at tænke og lære, eller gør den bare
> det lettere at få facit?

## Licens

[MIT](LICENSE)
