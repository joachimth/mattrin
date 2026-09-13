/**
 * Planlægger for reduktionsopgaver: "Reducer (4a+b)/2 - (2a-3b)/3" og
 * "Reducer 3(4a+b) - 2(2a-3b)".
 *
 * Der genereres to pipeline-typer:
 *  - brøk-pipeline: fællesnævner → omskriv → parenteser → én brøk → reducer
 *  - parentes-pipeline: distribuer → fortegn → reducer ens led
 */
import { Frac, lcm } from "../fraction";
import { Expr, flatten } from "../ast";
import { parseInput } from "../parser";
import { MathTask, PlanStep } from "./types";
import { polyToLatex, ratToLatex, ratToPlain, toRat } from "../polyrat";
import { latexOfExpr } from "./shared";

/** Top-niveau led med fortegn — minus-faktorer foldes ud rekursivt. */
function topAddends(e: Expr): { sign: 1 | -1; expr: Expr }[] {
  const args = e.kind === "add" ? e.args : [e];
  return args.map((a) => {
    let sign: 1 | -1 = 1;
    let cur = a;
    while (cur.kind === "mul") {
      const numFactors = cur.args.filter((f) => f.kind === "num");
      const rest = cur.args.filter((f) => f.kind !== "num");
      if (numFactors.length === 1 && numFactors[0].kind === "num" && numFactors[0].value.n < 0) {
        sign = sign === 1 ? -1 : 1;
        const absNum = { kind: "num" as const, value: numFactors[0].value.abs() };
        if (rest.length === 0) {
          // kun et negativt tal — færdig
          return { sign, expr: absNum };
        }
        // Pak enkeltelementer ud, så fx div ikke gemmer sig bag mul[1, div]
        cur = rest.length === 1 ? rest[0] : { kind: "mul" as const, args: [absNum, ...rest] };
        continue;
      }
      break;
    }
    return { sign, expr: cur };
  });
}

function polyFromInt(n: number): { terms: Map<string, { coeff: Frac; vars: Record<string, number> }> } {
  const p = { terms: new Map() };
  if (n !== 0) p.terms.set("", { coeff: Frac.of(n), vars: {} });
  return p;
}


/** Formaterer en liste af led UDEN at kombinere ens led. */
function termListToLatex(terms: { coeff: Frac; vars: Record<string, number> }[]): string {
  if (terms.length === 0) return "0";
  let out = "";
  for (const t of terms) {
    if (t.coeff.isZero) continue;
    const neg = t.coeff.lt(Frac.zero);
    const abs = neg ? t.coeff.neg() : t.coeff;
    const hasVars = Object.keys(t.vars).length > 0;
    const body = `${abs.isOne && hasVars ? "" : abs.isInt ? abs.n : abs.toLatex()}${Object.keys(t.vars).sort().map((v) => (t.vars[v] === 1 ? v : `${v}^{${t.vars[v]}}`)).join("")}`;
    if (out === "") out = `${neg ? "-" : ""}${body}`;
    else out += `${neg ? " - " : " + "}${body}`;
  }
  return out || "0";
}

export function planReduce(input: string): MathTask | null {
  let e: Expr;
  try {
    e = parseInput(input);
  } catch {
    return null;
  }
  if (e.kind === "eq") return null;

  // Er der konstante nævnere (brøker)? → brøk-pipeline
  const addends = topAddends(e);
  const denominators: (Frac | null)[] = addends.map(({ expr }) => {
    if (expr.kind === "div") {
      try {
        const den = toRat(expr.den).n;
        const c = [...den.terms.values()][0];
        if (den.terms.size === 1 && c && Object.keys(c.vars).length === 0) return c.coeff;
      } catch {
        return null;
      }
    }
    return null;
  });
  const hasFractions = denominators.some((d) => d !== null && !d.isOne);

  if (hasFractions) {
    const dens = denominators.map((d) => (d === null ? Frac.one : d.isOne ? Frac.one : d));
    let common = Frac.one;
    for (const d of dens) common = Frac.of(lcm(common.n, d.n), 1);
    const finalRat = toRat(e);

    // Trin 2: omskriv med fællesnævner
    const rewritten = addends.map((a, i) => {
      const factor = common.div(dens[i]);
      const inner = addends[i].expr.kind === "div" ? addends[i].expr.num : addends[i].expr;
      const innerLatex = polyToLatex(toRat(inner).n);
      const num = factor.isOne ? innerLatex : `${factor.isInt ? factor.n : factor.toLatex()}(${innerLatex})`;
      return {
        sign: a.sign,
        latex: `\\dfrac{${num}}{${common.n}}`,
        plain: `(${num})/${common.n}`,
      };
    });

    // Trin 3: parenteser ud i tællerne (fortegnet holder udenfor brøken)
    const expandedNums = addends.map((a, i) => {
      const inner = a.expr.kind === "div" ? a.expr.num : a.expr;
      const factor = common.div(dens[i]);
      const r = toRat({ kind: "mul", args: [{ kind: "num", value: factor }, inner] });
      return { sign: a.sign, latex: polyToLatex(r.n) };
    });

    // Trin 4: én samlet brøk — tællerne lagt sammen MED fortegn, men uden
    // at reducere ens led endnu (det er næste trin)
    const foldedTerms: { coeff: Frac; vars: Record<string, number> }[] = [];
    addends.forEach((a, i) => {
      const inner = a.expr.kind === "div" ? a.expr.num : a.expr;
      const factor = common.div(dens[i]);
      const r = toRat({ kind: "mul", args: [{ kind: "num", value: factor }, inner] });
      for (const [, t] of r.n.terms) {
        foldedTerms.push({ coeff: a.sign === -1 ? t.coeff.neg() : t.coeff, vars: t.vars });
      }
    });
    const foldedNum = polyFromInt(0); // placeholder — bruger foldedTerms til visning
    void foldedNum;
    const foldedLatex = termListToLatex(foldedTerms);

    const steps: PlanStep[] = [
      {
        from: "",
        to: `${common.n}`,
        toPlain: `${common.n}`,
        rule: "Fællesnævner",
        question: "Hvad bliver fællesnævneren?",
        explanation: `Fællesnævner er det mindste tal, som alle nævnerne (${dens.map((d) => d.n).join(", ")}) går op i. Det finder man ved at tage det mindste fælles multiplum.`,
        hints: [
          "Kig på nævnerne.",
          `Du skal finde et tal, som både ${dens.map((d) => d.n).join(" og ")} går op i.`,
          `Fællesnævneren er ${common.n}. Prøv at skrive den.`,
        ],
        typicalError: "Et multiplum (fx 36) er teknisk set rigtigt, men det mindste fælles multiplum holder regningen enklere.",
      },
      {
        from: "",
        to: rewritten.map((r, i) => `${i === 0 ? (r.sign === -1 ? "-" : "") : r.sign === -1 ? "-" : "+"}${r.latex}`).join(""),
        toPlain: rewritten.map((r, i) => `${i === 0 ? (r.sign === -1 ? "-" : "") : r.sign === -1 ? "-" : "+"}${r.plain}`).join(""),
        rule: "Omskrivning til fællesnævner",
        question: "Hvordan omskriver du brøkerne, så de får fællesnævneren?",
        explanation: `Tælleren ganges med det samme tal som nævneren, så brøkens værdi ikke ændres: ${dens.map((d) => `${d.n === common.n ? "den uændrede" : `${d.n} · ${common.div(d).n}`} → nævner ${common.n}`).join(", ")}.`,
        hints: [
          "Hvad skal hver nævner ganges med for at blive " + common.n + "?",
          "Tælleren skal ganges med præcis det samme tal som nævneren.",
          `Første brøk: gang tæller og nævner med ${common.div(dens[0]).n}.`,
        ],
        typicalError: "Glemmer at gange tælleren med — kun nævneren må ikke ændres.",
      },
      {
        from: "",
        to: rewritten.map((r, i) => `${i === 0 ? (r.sign === -1 ? "-" : "") : r.sign === -1 ? "-" : "+"}\\dfrac{${expandedNums[i].latex}}{${common.n}}`).join(""),
        toPlain: rewritten.map((r, i) => `${i === 0 ? (r.sign === -1 ? "-" : "") : r.sign === -1 ? "-" : "+"}(${expandedNums[i].latex})/${common.n}`).join(""),
        rule: "Parentes og fortegn",
        explanation: "Nu ganges faktoren ind i parentesen (distributiv lov). Husk: minus foran en parentes vender fortegnet på alle led indeni.",
        hints: [
          "Gang faktoren ind på hvert led i parentesen.",
          "Pas på: hvad sker der med hvert led, når der står minus foran parentesen?",
          `Første tæller bliver ${expandedNums[0].latex}.`,
        ],
        typicalError: "Fortegnsfejl: -(2a-3b) er -2a+3b, ikke -2a-3b.",
      },
      {
        from: "",
        to: `\\dfrac{${foldedLatex}}{${common.n}}`,
        toPlain: `(${foldedLatex.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)").replace(/\^\{(\d+)\}/g, "^$1")})/${common.n}`,
        rule: "Samle brøkerne",
        explanation: "Med samme nævner lægges tællerne sammen (eller trækkes fra) — nævneren skrives én gang.",
        hints: [
          "Skriv alt over én fælles brøkstreg.",
          "Minus foran en parentes rammer alle led i parentesen.",
          `Tælleren bliver ${foldedLatex}, og nævneren er ${common.n}.`,
        ],
      },
      {
        from: "",
        to: ratToLatex(finalRat),
        toPlain: ratToPlain(finalRat),
        rule: "Reducer ens led",
        explanation: "Led med samme variable lægges sammen: 12a-4a = 8a og 3b+6b = 9b.",
        hints: [
          "Hvilke led indeholder de samme variable?",
          "Samulær tællerens led: a-ledene for sig, b-ledene for sig.",
          `Tælleren reduceres til ${polyToLatex(finalRat.n)}.`,
        ],
      },
    ];
    // Fjern overflødige trin, hvis resultatet allerede er reduceret undervejs
    return {
      topic: "reducere",
      title: "Reduktion med brøker",
      input,
      latex: inputToLatex(input),
      steps: dedupeSteps(steps),
      intro: "En reduktionsopgave med brøker. Lad os tage den ét skridt ad gangen.",
    };
  }

  // Parentes-pipeline uden brøker
  const finalRat = toRat(e);
  const expanded = expandNoCollect(e);
  const expandedLatex = polyToLatex(toRat(expanded).n);
  const needsExpand = expandedLatex !== ratToLatex(finalRat);

  const steps: PlanStep[] = [];
  if (needsExpand) {
    steps.push({
      from: "",
      to: expandedLatex,
      toPlain: ratToPlain(toRat(expanded)),
      rule: "Distributiv lov",
      explanation: "Gang faktoren ind i parentesen: hvert led i parentesen ganges med faktoren udenfor.",
      hints: [
        "Hvad betyder det, at faktoren står lige foran parentesen?",
        "Gang faktoren med hvert enkelt led i parentesen — husk minusset.",
        `Alle parenteser skal væk, fx bliver første led ${expandedLatex.split(/ [+-] /)[0]}.`,
      ],
      typicalError: "Fortegnsfejl: minus foran parentesen vender fortegnet på alle led indeni.",
    });
  }
  steps.push({
    from: "",
    to: ratToLatex(finalRat),
    toPlain: ratToPlain(finalRat),
    rule: "Reducer ens led",
    explanation: "Led med samme variable kombineres: fx 6a-4a = 2a.",
    hints: ["Hvilke led er 'ens'?", "Led med samme variabel og potens lægges sammen.", `Resultatet er ${ratToLatex(finalRat)}.`],
  });

  return {
    topic: "reducere",
    title: "Reduktion af udtryk",
    input,
    latex: inputToLatex(input),
    steps: dedupeSteps(steps),
    intro: "En reduktionsopgave. Prøv selv det første skridt.",
  };
}


/** Ekspanderer uden at samle ens led — bevarer de enkelte mellemregninger. */
export function expandNoCollect(e: Expr): Expr {
  switch (e.kind) {
    case "num":
    case "var":
      return e;
    case "add":
      return flatten("add", e.args.map(expandNoCollect));
    case "div":
      return { kind: "div", num: expandNoCollect(e.num), den: expandNoCollect(e.den) };
    case "sqrt":
      return e;
    case "pow": {
      const base = expandNoCollect(e.base);
      let acc: Expr = { kind: "num", value: Frac.one };
      for (let i = 0; i < e.exp; i++) acc = { kind: "mul", args: [acc, base] };
      return expandNoCollect(acc);
    }
    case "mul": {
      const args = e.args.map(expandNoCollect);
      // find første sum og fordel
      const sums = args.filter((a) => a.kind === "add");
      if (sums.length === 0) return flatten("mul", args);
      const rest = args.filter((a) => a.kind !== "add");
      const sum = sums[0];
      const parts = sum.kind === "add" ? sum.args : [];
      const distributed = parts.map((p) => expandNoCollect(flatten("mul", [ ...rest, p ])));
      return expandNoCollect(flatten("add", distributed));
    }
    case "eq":
      return e;
  }
}

/** Fjerner trin med identiske resultater (nøjagtig tekst — pædagogiske
 * mellemformer der er kanonisk ens, men forskelligt skrevne, skal beholdes). */
export function dedupeSteps(steps: PlanStep[]): PlanStep[] {
  const out: PlanStep[] = [];
  for (const s of steps) {
    const norm = s.toPlain.replace(/\s+/g, "");
    const prev = out.length > 0 ? out[out.length - 1].toPlain.replace(/\s+/g, "") : null;
    if (norm !== "" && norm === prev) continue;
    out.push(s);
  }
  return out;
}


function inputToLatex(input: string): string {
  try {
    return latexOfExpr(parseInput(input));
  } catch {
    return input;
  }
}

