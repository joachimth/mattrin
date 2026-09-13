# Contribution guide

Tak for din interesse! MatTrin er et lille produkt med en stor idé:
eleven skal selv tænke. Alle bidrag skal forholde sig til det.

## Produktreglen

Ved alle beslutninger skal du spørge:

> "Hjælper denne funktion eleven med selv at tænke og lære, eller gør den
> bare det lettere at få facit?"

Hvis den primært gør det lettere at få facit, redesign den.

## Kom godt i gang

```bash
bun install
bun run dev        # udviklingsserver
bun test           # tests (bun test)
bun run typecheck  # tsc --noEmit
bun run lint       # eslint
bun run build      # produktionsbyg til dist/
```

Krav: [Bun](https://bun.sh) ≥ 1.1.

## Retningslinjer

- **Matematikkens kerne (`src/math/`) skal forblive deterministisk.**
  Ingen AI, ingen flydende tal i sammenligninger — kun eksakt brøkregning.
  Nye emner skal have planlæggere med trin, forklaringer og tre hint-niveauer.
- **Alt UI på dansk.** Brug danske begreber (tæller, nævner, fællesnævner,
  fortegn, isoler x …). Tonen er kort, rolig og hjælpsom — aldrig belærende.
- **Feedback er pædagogisk.** Aldrig bare "forkert". Genkend fejlmønstre
  (fortegn, fællesnævner, distribution, regnefejl) og målret beskeden.
- **Én primær handling per skærm.** Hjælp foldes diskret ud — ti knapper
  fra start er et designbrud.
- **Tests for alle nye matematiske flows**, inklusive mindst ét typisk
  elevfejltrin og et par edge cases.
- TypeScript strict + `bun run typecheck` + `bun run lint` skal være rene.

## Pull requests

1. Fork, opret en branch (`feature/min-funktion`).
2. Hold ændringerne små og fokuserede.
3. Sørg for at tests, typecheck og lint er grønne.
4. Beskriv *hvorfor* — ikke kun *hvad*.
