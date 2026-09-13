# Arkitektur

MatTrin er en ren SPA: ingen backend, ingen database, ingen API-nøgler.
Alt kører i browseren — historik og progression ligger i `localStorage`.

## Lagene

```
src/
  math/                 ← Matematikmotoren (ren TypeScript, ingen UI)
    fraction.ts           Eksakt brøkregning med heltal (Frac)
    ast.ts                Syntakstræ: num/var/add/mul/div/pow/sqrt/eq
    parser.ts             Tokenizer + Pratt-parser med implicit multiplikation
    polyrat.ts            Kanonisk algebra: polynomier og rationale funktioner
    equivalent.ts         "Er elevens svar det samme som det forventede?"
    tasks/
      types.ts            PlanStep / MathTask / Verdict — det fælles format
      analyze.ts          Automatisk genkendelse af opgavetype
      reduce.ts           Reduktion: brøk- og parentes-pipelines
      linear.ts           Lineære ligninger (samle → flytte → isolere)
      quadratic.ts        Andengradsligninger (fuldstændig kvadrering, d)
      derivative.ts       Differentialregning (potensreglen pr. led)
      factor.ts           Faktorisering (de to tal → parenteser)
      percent.ts          Procent (af / del-af-hel / stigning)
      diagnose.ts         Fejlgenkendelse: fortegn, fællesnævner, regnefejl …
      similar.ts          Genererer lignende opgaver
  features/             ← Oplevelsen
    Session.tsx           Den sokratiske arbejdsfase (kernen i appen)
    Learn.tsx             "Lær"-området
    History.tsx           Enkel historik
    learn/content.ts      Tekster til Lær
  components/
    Katex.tsx             KaTeX-wrapper
  lib/
    storage.ts            localStorage: historik + progression
  App.tsx               Navigation (Opgaver / Lær / Historik), onboarding
```

## Det matematiske dataformat

Et planlagt skridt (`PlanStep`) er produktets centrale datastruktur:

```ts
{
  from: string,        // LaTeX før skridtet
  to: string,          // LaTeX efter
  toPlain: string,     // parserbar tekst, fx "(8a+9b)/6" — til validering
  rule: string,        // fx "Distributiv lov"
  explanation: string, // dansk forklaring ("Forklar reglen")
  hints: string[],     // tre niveauer, stigende konkretion
  typicalError?: string,
  alsoAccept?: string[],  // alternative korrekte svar
}
```

Det gør det nemt at (1) validere elevens mellemregning deterministisk,
(2) give målrettede hints, (3) senere lade en AI omformulere forklaringer
uden at matematikkens korrekthed afhænger af den.

## Korrekthedskæden

1. Elevens input parses (`parser.ts`) til AST.
2. AST konverteres til kanonisk rationale form (`polyrat.ts`) —
   polynomier med eksakte `Frac`-koefficienter over polynomium-nævnere.
3. To udtryk er ens ⟺ `n1·d2 == n2·d1` (krydsmultiplikation).
   Ingen flydende tal, ingen AI, ingen strengsammenligning.
4. Ved udtryk motoren ikke kan kanonisere (fx kvadratrod) falder
   `equivalent.ts` tilbage på numerisk prøve i tre punkter.

## UI-principper

- Én primær handling per skærm; hjælp foldes diskret ud.
- Eleven skriver altid sit eget næste trin først.
- "Vis fuld løsning" kræver bekræftelse — sidste udvej.
- Feedback genkender fejlmønstre i stedet for at dømme.
- Mobil-først: safe-areas, 44pt-mål, dvh, ingen faste px-bredder.
- Light/dark via `prefers-color-scheme`; premium i begge.

## Udvidelsespunkter (arkitekturen er forberedt)

- **Nye emner**: tilføj en planlægger i `src/math/tasks/` og ræk den op i
  `analyze.ts`. Formatet (`PlanStep`) er det samme.
- **OCR / billeder / håndskrift**: `analyzeTask(input: string)` er det eneste
  lags adgang til opgavetekst — et input-lag der leverer tekst (OCR o.l.)
  kan kobles på uden at røre motoren eller UI'et.
- **AI-forbedrede forklaringer**: `PlanStep.explanation` kan suppleres af en
  sprogmodel, mens validering forbliver deterministisk.
- **Login/synkronisering**: `lib/storage.ts` er det eneste persistens-lag;
  udskift det med en backend uden at røre features.
