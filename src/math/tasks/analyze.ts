/**
 * Automatisk opgaveanalyse: bestemmer emne og planlægger skridt — eleven
 * skal aldrig vælge opgavetype selv.
 */
import { MathTask } from "./types";
import { planReduce } from "./reduce";
import { planLinear } from "./linear";
import { planQuadratic } from "./quadratic";
import { planDerivative } from "./derivative";
import { planFactor } from "./factor";
import { planPercent } from "./percent";

export class CannotAnalyze extends Error {
  constructor(public reason: string) {
    super(reason);
  }
}

export function analyzeTask(input: string): MathTask {
  const s = input.trim();
  const lower = s.toLowerCase();

  // Procent først (før procenttegnet forveksles med andet)
  if (lower.includes("%")) {
    const t = planPercent(s);
    if (t) return t;
  }

  // Differentialregning
  if (/differenti|afledt|deriver/.test(lower)) {
    const t = planDerivative(s);
    if (t) return t;
    throw new CannotAnalyze(
      "Jeg kan differentiere polynomier, fx 'Differentier f(x) = 3x^3 + 2x'. Kan du skrive opgaven sådan?"
    );
  }

  // Faktorisering
  if (/faktoris|sæt i parentes|saet i parentes/.test(lower)) {
    const t = planFactor(s);
    if (t) return t;
    throw new CannotAnalyze(
      "Jeg kan faktorisere udtryk som x^2 + 5x + 6. Prøv at skrive udtrykket direkte."
    );
  }

  // Ligninger
  if (s.includes("=")) {
    const quad = planQuadratic(s);
    if (quad) return quad;
    const lin = planLinear(s);
    if (lin) return lin;
    throw new CannotAnalyze(
      "Jeg kan hjælpe med lineære ligninger (3x + 7 = 22) og andengradsligninger (x^2 - 5x + 6 = 0). Kan du skrive ligningen sådan?"
    );
  }

  // Reduktion
  let red: ReturnType<typeof planReduce>;
  try {
    red = planReduce(s);
  } catch (err) {
    if (err instanceof Error && err.message === "Division med nul") {
      throw new CannotAnalyze("Man kan ikke dividere med nul — tjek nævnerne i opgaven.");
    }
    throw new CannotAnalyze(
      "Jeg kunne ikke analysere opgaven. Prøv fx:\n  3x + 7 = 22\n  Reducer: (4a+b)/2 - (2a-3b)/3\n  Differentier f(x) = 3x^3 + 2x"
    );
  }
  if (red) return red;

  throw new CannotAnalyze(
    "Jeg kunne ikke analysere opgaven. Prøv fx:\n  3x + 7 = 22\n  Reducer: (4a+b)/2 - (2a-3b)/3\n  Differentier f(x) = 3x^3 + 2x\n  Faktorisér x^2 + 5x + 6\n  Hvad er 15% af 240?"
  );
}

/** Eksempler der vises på startskærmen. */
export const EXAMPLE_TASKS = [
  "3x + 7 = 22",
  "Reducer: (4a+b)/2 - (2a-3b)/3",
  "Find nulpunkterne for f(x) = x^2 - 5x + 6",
  "Differentier f(x) = 3x^3 + 2x",
  "Faktorisér x^2 + 5x + 6",
  "Hvad er 15% af 240?",
];
