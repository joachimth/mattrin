/**
 * Planlægger for lineære ligninger: "3x + 7 = 22", "5(x-2) = 3x + 4", "x/3 + 2 = 7".
 */
import { Frac } from "../fraction";
import { Expr, flatten } from "../ast";
import { parseInput } from "../parser";
import { MathTask, PlanStep } from "./types";
import { polyToLatex, ratToLatex, toRat, Rat, polyIsConstant } from "../polyrat";
import { latexOfInput } from "./shared";

function linearCoeffs(r: Rat, v: string): { a: Frac; b: Frac } {
  // a*x + b hvor a og b er konstanter
  let a = Frac.zero;
  let b = Frac.zero;
  for (const [, t] of r.n.terms) {
    const pow = t.vars[v] ?? 0;
    if (pow === 0) b = b.add(t.coeff);
    else if (pow === 1) a = a.add(t.coeff);
    else throw new Error("ikke-lineært led");
  }
  const dc = polyIsConstant(r.d);
  if (dc && !dc.isZero) {
    // (ax + b) / c = ax/c + b/c
    a = a.div(dc);
    b = b.div(dc);
  } else if (!dc) {
    throw new Error("ikke-lineær nævner");
  }
  return { a, b };
}

export function planLinear(input: string): MathTask | null {
  let e: Expr;
  try {
    e = parseInput(input);
  } catch {
    return null;
  }
  if (e.kind !== "eq") return null;

  // Find ubekendt: den variabel der forekommer
  const vars = new Set<string>();
  collectVarNames(e, vars);
  if (vars.size !== 1) return null;
  const v = [...vars][0];

  try {
    const left = toRat(e.left);
    const right = toRat(e.right);
    const L = linearCoeffs(left, v);
    const R = linearCoeffs(right, v);
    // Saml: (L.a - R.a) x = R.b - L.b
    const a = L.a.sub(R.a);
    const b = R.b.sub(L.b);
    if (a.isZero) return null;

    const steps: PlanStep[] = [];
    // Trin 1: flyt x-led (hvis der er x-led på begge sider)
    if (!R.a.isZero) {
      const newLeft = toRat(flatten("add", [e.left, { kind: "mul", args: [{ kind: "num", value: R.a.neg() }, { kind: "var", name: v }] }]));
      const newRight = toRat(flatten("add", [e.right, { kind: "mul", args: [{ kind: "num", value: R.a.neg() }, { kind: "var", name: v }] }]));
      steps.push({
        from: "",
        to: `${ratToLatex(newLeft)} = ${ratToLatex(newRight)}`,
        toPlain: `${plainRat(newLeft)} = ${plainRat(newRight)}`,
        rule: "Flyt x-ledene",
        explanation: `Ligningen forbliver løst hvis man gør det samme på begge sider. Træk ${fmtTerm(R.a, v)} fra på begge sider, så alle x-led samles på venstre side.`,
        hints: [
          "Hvad skal der til, for at alle x-led står på venstre side?",
          "Gør det samme på begge sider af lighedstegnet.",
          `Træk ${fmtTerm(R.a, v)} fra på begge sider.`,
        ],
        typicalError: "Man husker kun den ene side — hvad der gøres på den ene side, skal gøres på den anden.",
      });
    }
    // Trin 2: flyt konstantled (hvis der er konstanter på venstre side)
    {
      const curLeftConst = steps.length > 0 ? L.b.sub(R.b) : L.b;
      if (!curLeftConst.isZero) {
        const op = curLeftConst.lt(Frac.zero) ? "add" : "sub";
        const leftNow: Expr = steps.length > 0 ? { kind: "num", value: Frac.zero } : e.left;
        const rightNow: Expr = steps.length > 0 ? e.right : e.right;
        // Byg næste tilstand direkte fra a og b i stedet:
        void leftNow;
        void rightNow;
        const afterMoveB = op === "sub" ? R.b.sub(L.b) : R.b.sub(L.b); // = b
        const afterMoveLatex = `${fmtTerm(a, v)} = ${ratToLatex({ n: polyFromConst(afterMoveB), d: polyFromConst(Frac.one) })}`;
        steps.push({
          from: "",
          to: afterMoveLatex,
          toPlain: afterMoveLatex,
          rule: "Flyt konstantleddene",
          explanation: `Flyt konstantleddene over på højre side ved at ${op === "sub" ? "lægge" : "trække"} ${fmtConst(curLeftConst)} ${op === "sub" ? "til" : "fra"} på begge sider.`,
          hints: [
            "Konstanterne skal over på højre side — uden x.",
            "Gør det samme på begge sider af lighedstegnet.",
            `${curLeftConst.lt(Frac.zero) ? "Læg" : "Træk"} ${fmtConst(curLeftConst.abs())} ${curLeftConst.lt(Frac.zero) ? "til" : "fra"} på begge sider.`,
          ],
          typicalError: "Fortegn ved flytning: et led skifter fortegn, når det kommer over lighedstegnet.",
        });
      }
    }
    // Trin 3: divider med a (hvis a ≠ 1)
    if (!a.isOne) {
      const sol = b.div(a);
      steps.push({
        from: "",
        to: `${v} = ${ratToLatex({ n: polyFromConst(sol), d: polyFromConst(Frac.one) })}`,
        toPlain: `${v} = ${plainFrac(sol)}`,
        rule: "Isoler x",
        explanation: `Dividér begge sider med ${fmtConst(a)} — så står x alene til venstre.`,
        hints: [
          "Hvad skal der gøres med koefficienten foran x?",
          "Modoperationen mod gang er division.",
          `Dividér begge sider med ${fmtConst(a)}.`,
        ],
        typicalError: "Man dividerer kun den ene side, eller dividerer med det forkerte tal.",
      });
    } else if (!b.isZero) {
      const sol = b;
      steps.push({
        from: "",
        to: `${v} = ${ratToLatex({ n: polyFromConst(sol), d: polyFromConst(Frac.one) })}`,
        toPlain: `${v} = ${plainFrac(sol)}`,
        rule: "Aflæs løsningen",
        explanation: "x står allerede alene — løsningen står på højre side.",
        hints: ["Hvad står x lig med?"],
      });
    }

    // Afsluttende: kontrol forklares som tekst i Session UI (ikke interaktivt trin)
    const sol = b.div(a);
    const checkText = `Indsæt ${v} = ${plainFrac(sol)} i opgaven og tjek, at begge sider giver samme værdi.`;

    return {
      topic: "ligning",
      title: "Lineær ligning",
      input,
      latex: latexOfInput(input),
      steps,
      intro: `En lineær ligning med ${v} som ubekendt. Prøv selv første trin.`,
      checkText,
    };
  } catch {
    return null;
  }
}

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

function polyFromConst(c: Frac): Rat["n"] {
  const p = { terms: new Map() };
  if (!c.isZero) p.terms.set("", { coeff: c, vars: {} });
  return p;
}

function fmtConst(c: Frac): string {
  return c.d === 1 ? `${c.n}` : `${c.n}/${c.d}`;
}

function fmtTerm(c: Frac, v: string): string {
  const cc = c.abs();
  const body = cc.isOne ? v : `${fmtConst(cc)}${v}`;
  return c.lt(Frac.zero) ? `-${body}` : body;
}

function plainFrac(c: Frac): string {
  return c.d === 1 ? `${c.n}` : `${c.n}/${c.d}`;
}

function plainRat(r: Rat): string {
  const s = polyToLatex(r.n)
    .replace(/\^\{(\d+)\}/g, "^$1")
    .replace(/\\dfrac\{([^}]*)\}\{([^}]*)\}/g, "($1)/($2)");
  const dc = polyIsConstant(r.d);
  if (dc && !dc.isOne) return `(${s})/${dc.n}`;
  return s;
}
