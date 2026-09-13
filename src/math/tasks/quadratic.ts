/**
 * Planlægger for andengradsligninger: "x^2 - 5x + 6 = 0", "2x^2 + 3x - 2 = 0",
 * "Find nulpunkterne for f(x) = x^2 - 5x + 6".
 */
import { Frac } from "../fraction";
import { Expr } from "../ast";
import { parseInput } from "../parser";
import { MathTask, PlanStep } from "./types";
import { toRat, polyIsConstant, Rat, polySub } from "../polyrat";
import { latexOfInput } from "./shared";

function collectVarNames(e: Expr, out: Set<string>): void {
  switch (e.kind) {
    case "num":
      break;
    case "var":
      out.add(e.name);
      break;
    case "add":
    case "mul":
      e.args.forEach((a) => collectVarNames(a, out));
      break;
    case "div":
      collectVarNames(e.num, out);
      collectVarNames(e.den, out);
      break;
    case "pow":
      collectVarNames(e.base, out);
      break;
    case "sqrt":
      collectVarNames(e.arg, out);
      break;
    case "eq":
      collectVarNames(e.left, out);
      collectVarNames(e.right, out);
      break;
  }
}

/** Læser koefficienterne a, b, c fra et polynomium i én variabel. */
function quadCoeffs(r: Rat, v: string): { a: Frac; b: Frac; c: Frac } {
  let a = Frac.zero;
  let b = Frac.zero;
  let c = Frac.zero;
  for (const [, t] of r.n.terms) {
    const pow = t.vars[v] ?? 0;
    if (pow === 0) c = c.add(t.coeff);
    else if (pow === 1) b = b.add(t.coeff);
    else if (pow === 2) a = a.add(t.coeff);
    else throw new Error("højere grad end 2");
  }
  const dc = polyIsConstant(r.d);
  if (dc && !dc.isZero && !dc.isOne) {
    a = a.div(dc);
    b = b.div(dc);
    c = c.div(dc);
  }
  return { a, b, c };
}

function plainFrac(c: Frac): string {
  return c.d === 1 ? `${c.n}` : `${c.n}/${c.d}`;
}

/** "3x" eller "x" eller "-2x" som plain tekst. */
function coefTerm(c: Frac, v: string): string {
  if (c.isOne) return v;
  if (c.n === -1 && c.d === 1) return `-${v}`;
  return `${plainFrac(c)}${v}`;
}

export function planQuadratic(input: string): MathTask | null {
  let e: Expr;
  try {
    e = parseInput(input);
  } catch {
    return null;
  }
  if (e.kind !== "eq") return null;

  const vars = new Set<string>();
  collectVarNames(e, vars);
  if (vars.size !== 1) return null;
  const v = [...vars][0];

  try {
    const left = toRat(e.left);
    const right = toRat(e.right);
    const std = { n: polySub(left.n, right.n), d: { terms: new Map([["", { coeff: Frac.one, vars: {} }]]) } };
    const { a, b, c } = quadCoeffs(std, v);

    if (a.isZero) return null;
    if (b.isZero && c.isZero) return null;

    const steps: PlanStep[] = [];
    const p = b.div(a);
    const q = c.div(a);

    // Trin 0: normaliser med a = 1
    if (!a.isOne) {
      const toPlain = `${v}^2${p.lt(Frac.zero) ? " - " : " + "}${coefTerm(p.abs(), v)}${q.lt(Frac.zero) ? " - " : " + "}${plainFrac(q.abs())} = 0`;
      steps.push({
        from: "",
        to: `${v}^2${p.lt(Frac.zero) ? "-" : "+"}${coefTerm(p.abs(), v) === v ? v : coefTerm(p.abs(), v)}${q.lt(Frac.zero) ? "-" : "+"}${plainFrac(q.abs())} = 0`,
        toPlain,
        rule: "Del med koefficienten",
        explanation: `Divider alle led med ${plainFrac(a)} — det ændrer ikke løsningerne, men gør formlen enklere.`,
        hints: ["Hver koefficient, også konstantleddet, skal divideres.", `Divider med ${plainFrac(a)} på begge sider.`],
      });
    }

    // d = (p/2)² - q
    const half = p.div(Frac.of(2));
    const disc = half.mul(half).sub(q);

    steps.push({
      from: "",
      to: `d = \\left(${plainFrac(half)}\\right)^2 - \\left(${plainFrac(q)}\\right) = ${plainFrac(disc)}`,
      toPlain: `(${plainFrac(half)})^2 - (${plainFrac(q)})`,
      rule: "Beregn d",
      explanation: `Med p = ${plainFrac(p)} og q = ${plainFrac(q)} fra ${v}² + p${v} + q = 0 er d = (p/2)² − q.`,
      hints: [
        "Formlen er d = (p/2)² − q.",
        `Her er p = ${plainFrac(p)} og q = ${plainFrac(q)}.`,
        `(p/2)² − q = (${plainFrac(half)})² − (${plainFrac(q)}) = ${plainFrac(disc)}`,
      ],
      typicalError: "Man glemmer at halvere p, før man kvadrerer.",
      alsoAccept: [plainFrac(disc)],
    });

    if (disc.lt(Frac.zero)) {
      steps.push({
        from: "",
        to: "\\text{Ingen reelle løsninger}",
        toPlain: "ingen losninger",
        rule: "Fortolk d",
        explanation: `d = ${plainFrac(disc)} < 0, og man kan ikke tage kvadratroden af et negativt tal. Ligningen har derfor ingen reelle løsninger — parablen skærer aldrig x-aksen.`,
        hints: ["Er d positiv eller negativ?"],
      });
      return {
        topic: "ligning-andengrad",
        title: "Andengradsligning",
        input,
        latex: latexOfInput(input),
        steps,
        intro: "En andengradsligning. Lad os undersøge diskriminanten.",
        checkText: "d < 0 betyder ingen reelle nulpunkter — parablen ligger helt over eller under x-aksen.",
      };
    }

    const sqNum = Math.sqrt(Math.abs(disc.n));
    const sqDen = Math.sqrt(disc.d);
    const isPerfect = disc.n >= 0 && Number.isInteger(sqNum) && Number.isInteger(sqDen) && sqNum * sqNum === disc.n && sqDen * sqDen === disc.d;

    if (isPerfect) {
      const s = sqNum / sqDen; // eksakt, da begge er kvadrat
      const sFrac = Frac.of(sqNum, sqDen);
      steps.push({
        from: "",
        to: `\\sqrt{d} = ${s}`,
        toPlain: `${s}`,
        rule: "Kvadratroden af d",
        explanation: `d = ${plainFrac(disc)} er et perfekt kvadrat, så √d = ${s}.`,
        hints: [`Hvilket tal i anden giver ${plainFrac(disc)}?`],
        alsoAccept: [`${s}`],
      });
      const root1 = half.neg().add(sFrac);
      const root2 = half.neg().sub(sFrac);
      steps.push({
        from: "",
        to: `${v}_1 = ${plainFrac(root1)},\\quad ${v}_2 = ${plainFrac(root2)}`,
        toPlain: `${v}_1 = ${plainFrac(root1)}`,
        rule: "Begge rødder",
        explanation: `${v} = −p/2 ± √d. Med de to fortegn fås ${v}₁ = ${plainFrac(root1)} og ${v}₂ = ${plainFrac(root2)}.`,
        hints: [
          "Udregn både plus- og minusvarianten.",
          `${v} = ${plainFrac(half.neg())} ± ${plainFrac(sFrac)}`,
          `${v}₁ = ${plainFrac(root1)} og ${v}₂ = ${plainFrac(root2)}`,
        ],
        alsoAccept: [`${v}_2 = ${plainFrac(root2)}`, `${v} = ${plainFrac(root1)}`, plainFrac(root1), plainFrac(root2)],
      });
    } else {
      const sq = sqNum / sqDen;
      const r1 = half.neg().toNumber() + sq;
      const r2 = half.neg().toNumber() - sq;
      steps.push({
        from: "",
        to: `${v} = ${plainFrac(half.neg())} \\pm \\sqrt{${plainFrac(disc)}}`,
        toPlain: `${v} = ${plainFrac(half.neg())} ± sqrt(${plainFrac(disc)})`,
        rule: "Tag kvadratroden",
        explanation: `√d = √${plainFrac(disc)} ≈ ${(Math.round(sq * 1000) / 1000).toString().replace(".", ",")}. Rødderne er ${v} = −p/2 ± √d.`,
        hints: ["Husk ± — der er to løsninger.", `${v} = −p/2 ± √d med p/2 = ${plainFrac(half)} og d = ${plainFrac(disc)}.`],
      });
      steps.push({
        from: "",
        to: `${v}_1 ≈ ${fmtApprox(r1)},\\quad ${v}_2 ≈ ${fmtApprox(r2)}`,
        toPlain: `${v}_1 ≈ ${fmtApprox(r1)}`,
        rule: "Begge rødder",
        explanation: `Udregn begge fortegn: ${v}₁ ≈ ${fmtApprox(r1)} og ${v}₂ ≈ ${fmtApprox(r2)}.`,
        hints: ["Sæt plus og minus ind hver for sig."],
      });
    }

    return {
      topic: "ligning-andengrad",
      title: "Andengradsligning",
      input,
      latex: latexOfInput(input),
      steps,
      intro: "En andengradsligning. Vi finder nulpunkterne trin for trin.",
      checkText: "Kontrollér ved at indsætte begge rødder i ligningen — begge skal give 0.",
    };
  } catch {
    return null;
  }
}

function fmtApprox(x: number): string {
  return (Math.round(x * 1000) / 1000).toString().replace(".", ",");
}
