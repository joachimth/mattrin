/**
 * Planlægger for faktorisering: "Faktorisér x^2 + 5x + 6" → (x+2)(x+3).
 */
import { Expr } from "../ast";
import { parseInput } from "../parser";
import { MathTask, PlanStep } from "./types";
import { latexOfInput } from "./shared";

/** Flader nestede mul-noder ud til bladledder. */
function flattenMulFactors(e: Expr): Expr[] {
  if (e.kind === "mul") return e.args.flatMap(flattenMulFactors);
  return [e];
}

function polyCoefs(e: Expr): { b: number; c: number } | null {
  // x^2 + bx + c med hele koefficienter
  let b = 0;
  let c = 0;
  let hasQuad = false;
  const addends = e.kind === "add" ? e.args : [e];
  for (const a of addends) {
    const factors = flattenMulFactors(a);
    let coeff = 1;
    let pow = 0;
    for (const f of factors) {
      if (f.kind === "num") coeff *= f.value.toNumber();
      else if (f.kind === "var" && f.name === "x") pow += 1;
      else if (f.kind === "pow" && f.base.kind === "var" && f.base.name === "x") pow += f.exp;
      else return null;
    }
    if (coeff !== Math.round(coeff)) return null;
    if (pow === 2) hasQuad = true;
    else if (pow === 1) b += coeff;
    else if (pow === 0) c += coeff;
    else return null;
  }
  return hasQuad ? { b, c } : null;
}

function signStr(n: number): string {
  return n >= 0 ? ` + ${n}` : ` - ${-n}`;
}

export function planFactor(input: string): MathTask | null {
  const m = input.match(/(?:faktoris(?:er|ér)|sæt i parentes)\s*(.+)/i);
  let core = input.trim();
  if (m && m[1]?.trim()) core = m[1].trim();
  const fmatch = core.match(/^(?:f\(x\)|y)\s*=\s*(.+)/i);
  if (fmatch) core = fmatch[1].trim();

  let e: Expr;
  try {
    e = parseInput(core);
  } catch {
    return null;
  }
  const coefs = polyCoefs(e);
  if (!coefs) return null;
  const { b, c } = coefs;
  if (b === 0 || c === 0) return null;

  // Find r, s: r+s = b, r·s = c
  let r: number | null = null;
  let s: number | null = null;
  for (let k = 1; k <= Math.abs(c); k++) {
    if (c % k !== 0) continue;
    for (const [t1, t2] of [
      [k, c / k],
      [-k, -c / k],
    ]) {
      if (t1 + t2 === b) {
        r = t1;
        s = t2;
      }
    }
    if (r !== null) break;
  }

  const steps: PlanStep[] = [];
  if (r === null || s === null) {
    return {
      topic: "faktorisere",
      title: "Faktorisering",
      input,
      latex: latexOfInput(input),
      steps: [],
      intro: "Dette udtryk kan ikke faktoriseres med hele tal — det har ingen pæne rødder. Prøv at løse det som andengradsligning i stedet.",
    };
  }

  steps.push({
    from: "",
    to: `${r} \\text{ og } ${s}`,
    toPlain: `${r} og ${s}`,
    rule: "Find de to tal",
    question: "Kan du finde to tal, der ganges til " + c + " og lægges sammen til " + b + "?",
    explanation: `Ved faktorisering af x² + bx + c skal man finde to tal r og s med r·s = c og r + s = b. Her: ${r}·${s} = ${c} og ${r}+${s} = ${b}.`,
    hints: [
      `Start med at kigge på talfaktorer i ${c}.`,
      `To tal med produkt ${c} og sum ${b}.`,
      `Tallene er ${r} og ${s}.`,
    ],
    alsoAccept: [`${s} og ${r}`, `${r},${s}`, `${s},${r}`],
  });

  steps.push({
    from: "",
    to: `(x${signStr(r)})(x${signStr(s)})`,
    toPlain: `(x${signStr(r)})(x${signStr(s)})`,
    rule: "Skriv faktorerne",
    explanation: `De to tal sættes ind i hver sin parentes: (x ${r >= 0 ? "+" : "−"} ${Math.abs(r)})(x ${s >= 0 ? "+" : "−"} ${Math.abs(s)}).`,
    hints: ["Ét tal i hver parentes med x.", `(x + r)(x + s) med dine to tal.`],
    typicalError: "Fortegn: hvis tallet er negativt, skal parentesen bruge minus.",
  });

  return {
    topic: "faktorisere",
    title: "Faktorisering",
    input,
    latex: latexOfInput(input),
    steps,
    intro: "En faktoriseringsopgave af andengradsudtryk.",
    checkText: `Multipliser parenteserne sammen igen og tjek, at du får x²${signStr(b)}${signStr(c)} (x).`.replace(" (x)", ""),
  };
}
