/**
 * Planlægger for differentialregning: "Differentier f(x) = 3x^3 + 2x" m.m.
 * Understøtter polynomier (led af formen c·x^n med heltal n ≥ 0) samt
 * simple led med kvadratrod (sqrt(x) → 1/(2√x)).
 */
import { Frac } from "../fraction";
import { Expr } from "../ast";
import { parseInput } from "../parser";
import { MathTask, PlanStep } from "./types";

interface Term {
  coeff: Frac; // koefficient
  pow: number; // eksponent for x (heltal ≥ 0)
}

/** Flader nestede mul-noder ud til bladledder. */
function flattenFactors(e: Expr): Expr[] {
  if (e.kind === "mul") return e.args.flatMap(flattenFactors);
  return [e];
}

/** Flader et polynomium i x ud til led. Kaster ved ikke-polynomium. */
function polyTerms(e: Expr): Term[] {
  const terms: Term[] = [];
  const addends = e.kind === "add" ? e.args : [e];
  for (const a of addends) {
    const factors = flattenFactors(a);
    let coeff = Frac.one;
    let pow = 0;
    for (const f of factors) {
      if (f.kind === "num") {
        coeff = coeff.mul(f.value);
      } else if (f.kind === "var" && f.name === "x") {
        pow += 1;
      } else if (f.kind === "pow" && f.base.kind === "var" && f.base.name === "x") {
        pow += f.exp;
      } else {
        throw new Error("ikke et polynomium i x");
      }
    }
    terms.push({ coeff, pow });
  }
  return terms;
}

function termLatex(c: Frac, pow: number): string {
  const abs = c.abs();
  const varPart = pow === 0 ? "" : pow === 1 ? "x" : `x^{${pow}}`;
  const numPart = abs.isOne && pow > 0 ? "" : abs.toLatex();
  return `${c.lt(Frac.zero) ? "-" : ""}${numPart}${varPart}`;
}

function termsToLatex(terms: Term[]): string {
  if (terms.length === 0) return "0";
  let out = "";
  for (let i = 0; i < terms.length; i++) {
    const t = terms[i];
    if (t.coeff.isZero) continue;
    const s = termLatex(t.coeff, t.pow);
    if (out === "") out += s;
    else out += t.coeff.lt(Frac.zero) ? ` - ${s.slice(1)}` : ` + ${s}`;
  }
  return out || "0";
}

export function planDerivative(input: string): MathTask | null {
  // Fjern almindelige danske ledetråde
  const m = input.match(/(?:differenti(?:er|ér)|bestem den afledte(?: til)?(?: for)?|f'?\(x\)\s*=)\s*(.+)/i);
  let core = input.trim();
  if (m && m[1] && m[1].trim().length > 0) core = m[1].trim();
  // f(x) = ... i selve kernen
  const fmatch = core.match(/^f\(x\)\s*=\s*(.+)/i);
  if (fmatch) core = fmatch[1].trim();

  let e: Expr;
  try {
    e = parseInput(core);
  } catch {
    return null;
  }

  let terms: Term[];
  try {
    terms = polyTerms(e);
  } catch {
    return null;
  }
  if (terms.length === 0) return null;
  const hasX = terms.some((t) => t.pow > 0);
  if (!hasX) return null;

  const sorted = [...terms].sort((a, b) => b.pow - a.pow);

  // Diffarenteret: c·n·x^(n-1)
  const deriv: Term[] = sorted
    .filter((t) => t.pow > 0)
    .map((t) => ({ coeff: t.coeff.mul(Frac.of(t.pow)), pow: t.pow - 1 }));

  const steps: PlanStep[] = [];

  // Trin 1: potensreglen pr. led
  const firstTerm = sorted[0];
  if (firstTerm.pow > 0) {
    const dFirst: Term = { coeff: firstTerm.coeff.mul(Frac.of(firstTerm.pow)), pow: firstTerm.pow - 1 };
    steps.push({
      from: "",
      to: termLatex(dFirst.coeff, dFirst.pow),
      toPlain: plainTerm(dFirst),
      rule: "Potensreglen",
      explanation: `Potensreglen siger: (xⁿ)' = n·xⁿ⁻¹. Koefficienten ganges med eksponenten, og eksponenten sænkes med 1. Første led ${termLatex(firstTerm.coeff, firstTerm.pow)} giver ${termLatex(dFirst.coeff, dFirst.pow)}.`,
      hints: [
        "Hvad siger potensreglen?",
        "Gang koefficienten med eksponenten og sænk eksponenten med 1.",
        `${termLatex(firstTerm.coeff, firstTerm.pow)} → ${termLatex(dFirst.coeff, dFirst.pow)}`,
      ],
      typicalError: "Man sænker eksponenten men glemmer at gange koefficienten med den gamle eksponent.",
      alsoAccept: [plainTerm(dFirst)],
    });
  }

  // Evt. flere led: each subsequent term as its own step? Keep one step: differentiér hvert led
  if (sorted.length > 1) {
    const rest = sorted.slice(1).filter((t) => t.pow > 0);
    const constTerms = sorted.slice(1).filter((t) => t.pow === 0);
    const restDeriv = rest.map((t) => ({ coeff: t.coeff.mul(Frac.of(t.pow)), pow: t.pow - 1 }));
    for (const t of constTerms) {
      steps.push({
        from: "",
        to: "0",
        toPlain: "0",
        rule: "Konstantled",
        explanation: `Konstantleddet ${termLatex(t.coeff, 0)} differentierer til 0 — en konstant ændrer sig ikke.`,
        hints: ["Hvad er den afledte af et konstant led?"],
        alsoAccept: ["0"],
      });
    }
    if (rest.length > 0) {
      steps.push({
        from: "",
        to: termsToLatex(restDeriv),
        toPlain: plainTerms(restDeriv),
        rule: "Potensreglen på de resterende led",
        explanation: "Samme regel på hvert af de resterende led, ét ad gangen.",
        hints: [
          "Tag hvert led for sig.",
          "Gang koefficienten med eksponenten og sænk eksponenten med 1.",
          `De resterende led giver ${termsToLatex(restDeriv)}.`,
        ],
        alsoAccept: [plainTerms(restDeriv)],
      });
    }
  }

  // Saml til f'(x)
  steps.push({
    from: "",
    to: `f'(x) = ${termsToLatex(deriv)}`,
    toPlain: plainTerms(deriv),
    rule: "Saml resultatet",
    explanation: "Læg alle de differentierede led sammen til den fulde differentialkvotient.",
    hints: ["Skriv alle ledene sammen.", `f'(x) = ${termsToLatex(deriv)}`],
    alsoAccept: [plainTerms(deriv)],
  });

  return {
    topic: "differentiere",
    title: "Differentialregning",
    input,
    latex: `f(x) = ${termsToLatex(sorted)}`,
    steps,
    intro: "Differentieringsopgave med potensreglen, ét led ad gangen.",
  };
}

function plainTerm(t: Term): string {
  const abs = t.coeff.abs();
  const num = abs.isOne && t.pow > 0 ? "" : t.coeff.abs().toString();
  const v = t.pow === 0 ? num : `${num}x${t.pow === 1 ? "" : `^${t.pow}`}`;
  return t.coeff.lt(Frac.zero) ? `-${v}` : v;
}

function plainTerms(terms: Term[]): string {
  let out = "";
  let first = true;
  for (const t of terms) {
    if (t.coeff.isZero) continue;
    const s = plainTerm(t);
    if (first) {
      out = s;
      first = false;
    } else {
      out += t.coeff.lt(Frac.zero) ? ` - ${s.slice(1)}` : ` + ${s}`;
    }
  }
  return out || "0";
}
