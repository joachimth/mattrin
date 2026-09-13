/**
 * Kanonisk rationale algebra: polynomier med eksakte koefficienter og
 * rationale funktioner (polynomium / polynomium).
 *
 * Dette er kernen i deterministisk korrekthed: to udtryk er ens hvis og
 * kun hvis deres kanoniske former er ens (krydsmultiplikation af
 * tæller/nævner). Ingen AI, ingen flydende tal.
 */
import { Frac, gcd, lcm } from "./fraction";
import { Expr } from "./ast";

export type VarPowers = Record<string, number>;

export interface Term {
  coeff: Frac;
  vars: VarPowers; // kun poster med eksponent > 0
}

export interface Poly {
  terms: Map<string, Term>; // nøgle: kanonisk variabelstreng
}

export interface Rat {
  n: Poly; // tæller
  d: Poly; // nævner (kanonisk: konstant nævner holdes positiv, d ≠ 0)
}

export class UnsupportedExpr extends Error {
  constructor(msg = "Udtrykket understøttes ikke i den kanoniske motor") {
    super(msg);
  }
}

function termKey(vars: VarPowers): string {
  return Object.keys(vars)
    .sort()
    .map((v) => `${v}^${vars[v]}`)
    .join("*");
}

function monomial(key: string): VarPowers {
  const vars: VarPowers = {};
  if (!key) return vars;
  for (const part of key.split("*")) {
    const [v, e] = part.split("^");
    vars[v] = parseInt(e, 10);
  }
  return vars;
}

function totalDegree(vars: VarPowers): number {
  return Object.values(vars).reduce((s, e) => s + e, 0);
}

function compareKeys(a: string, b: string): number {
  const da = totalDegree(monomial(a));
  const db = totalDegree(monomial(b));
  if (da !== db) return db - da; // højeste grad først
  return a < b ? -1 : a > b ? 1 : 0;
}

export function polyZero(): Poly {
  return { terms: new Map() };
}

export function polyConst(c: Frac): Poly {
  const p = polyZero();
  if (!c.isZero) p.terms.set("", { coeff: c, vars: {} });
  return p;
}

export function polyIsZero(p: Poly): boolean {
  return p.terms.size === 0;
}

export function polyIsConstant(p: Poly): Frac | null {
  const c = p.terms.get("");
  if (p.terms.size === 1 && c) return c.coeff;
  return null;
}

export function polyAdd(a: Poly, b: Poly): Poly {
  const out = polyZero();
  for (const [k, t] of a.terms) out.terms.set(k, { ...t });
  for (const [k, t] of b.terms) {
    const existing = out.terms.get(k);
    if (existing) {
      const sum = existing.coeff.add(t.coeff);
      if (sum.isZero) out.terms.delete(k);
      else out.terms.set(k, { coeff: sum, vars: t.vars });
    } else {
      out.terms.set(k, { ...t });
    }
  }
  return out;
}

export function polyNeg(a: Poly): Poly {
  const out = polyZero();
  for (const [k, t] of a.terms) out.terms.set(k, { coeff: t.coeff.neg(), vars: t.vars });
  return out;
}

export function polySub(a: Poly, b: Poly): Poly {
  return polyAdd(a, polyNeg(b));
}

export function polyScale(a: Poly, c: Frac): Poly {
  const out = polyZero();
  for (const [k, t] of a.terms) {
    const cc = t.coeff.mul(c);
    if (!cc.isZero) out.terms.set(k, { coeff: cc, vars: t.vars });
  }
  return out;
}

export function polyMul(a: Poly, b: Poly): Poly {
  const out = polyZero();
  for (const [, ta] of a.terms) {
    for (const [, tb] of b.terms) {
      const vars: VarPowers = { ...ta.vars };
      for (const [v, e] of Object.entries(tb.vars)) {
        vars[v] = (vars[v] ?? 0) + e;
      }
      const key = termKey(vars);
      const coeff = ta.coeff.mul(tb.coeff);
      const existing = out.terms.get(key);
      if (existing) {
        const sum = existing.coeff.add(coeff);
        if (sum.isZero) out.terms.delete(key);
        else out.terms.set(key, { coeff: sum, vars });
      } else if (!coeff.isZero) {
        out.terms.set(key, { coeff, vars });
      }
    }
  }
  return out;
}

export function polyPow(a: Poly, exp: number): Poly {
  let out = polyConst(Frac.one);
  for (let i = 0; i < exp; i++) out = polyMul(out, a);
  return out;
}

export function polyEq(a: Poly, b: Poly): boolean {
  if (a.terms.size !== b.terms.size) return false;
  for (const [k, t] of a.terms) {
    const o = b.terms.get(k);
    if (!o || !t.coeff.eq(o.coeff)) return false;
  }
  return true;
}

export function ratNormalize(n: Poly, d: Poly): Rat {
  if (polyIsZero(d)) throw new Error("Division med nul");
  const dc = polyIsConstant(d);
  if (dc) {
    if (dc.lt(Frac.zero)) return { n: polyNeg(n), d: polyConst(dc.neg()) };
    // Hvis nævneren er et heltal 1, beholdes nævner som 1 (ren polynomium)
    return { n, d: polyConst(dc) };
  }
  return { n, d };
}

export const ratOne: Rat = { n: polyConst(Frac.one), d: polyConst(Frac.one) };

export function ratOfPoly(p: Poly): Rat {
  return { n: p, d: polyConst(Frac.one) };
}

export function ratAdd(a: Rat, b: Rat): Rat {
  // a = n1/d1, b = n2/d2 → (n1*d2 + n2*d1) / (d1*d2)
  return ratNormalize(polyAdd(polyMul(a.n, b.d), polyMul(b.n, a.d)), polyMul(a.d, b.d));
}

export function ratSub(a: Rat, b: Rat): Rat {
  return ratNormalize(polySub(polyMul(a.n, b.d), polyMul(b.n, a.d)), polyMul(a.d, b.d));
}

export function ratMul(a: Rat, b: Rat): Rat {
  return ratNormalize(polyMul(a.n, b.n), polyMul(a.d, b.d));
}

export function ratDiv(a: Rat, b: Rat): Rat {
  if (polyIsZero(b.n)) throw new Error("Division med nul");
  return ratNormalize(polyMul(a.n, b.d), polyMul(a.d, b.n));
}

export function ratEq(a: Rat, b: Rat): boolean {
  // krydsmultiplikation: n1*d2 == n2*d1
  return polyEq(polyMul(a.n, b.d), polyMul(b.n, a.d));
}

/** Konverterer et AST til kanonisk Rat. Kaster UnsupportedExpr på sqrt. */
export function toRat(e: Expr): Rat {
  switch (e.kind) {
    case "num":
      return ratOfPoly(polyConst(e.value));
    case "var":
      return ratOfPoly({
        terms: new Map([[e.name, { coeff: Frac.one, vars: { [e.name]: 1 } }]]),
      });
    case "add": {
      let acc: Rat = ratOfPoly(polyZero());
      for (const a of e.args) acc = ratAdd(acc, toRat(a));
      return acc;
    }
    case "mul": {
      let acc: Rat = ratOfPoly(polyConst(Frac.one));
      for (const a of e.args) acc = ratMul(acc, toRat(a));
      return acc;
    }
    case "div":
      return ratDiv(toRat(e.num), toRat(e.den));
    case "pow":
      return ratOfPoly(polyPow(toRat(e.base).n, e.exp));
    case "sqrt":
      throw new UnsupportedExpr();
    case "eq":
      throw new UnsupportedExpr("En ligning kan ikke reduceres som ét udtryk");
  }
}

/** Undersøger om et AST kan konverteres til den kanoniske motor. */
export function isSupported(e: Expr): boolean {
  try {
    toRat(e);
    return true;
  } catch (err) {
    if (err instanceof UnsupportedExpr) return false;
    // fx division med nul — strukturelt kanonisk
    return err instanceof Error && err.message === "Division med nul";
  }
}

/** Hjælper til fejl-diagnose: samlingsnøgle med fortegn på hvert led. */
export function signedTermSet(p: Poly): Set<string> {
  const s = new Set<string>();
  for (const [k, t] of p.terms) {
    s.add(`${t.coeff.lt(Frac.zero) ? "-" : "+"}${k}`);
  }
  return s;
}

/**
 * Finder det antal led der matcher mellem to polynomier, når fortegnet
 * ignoreres — bruges til at genkende fortegnsfejl.
 */
export function signFlipScore(student: Poly, expected: Poly): { flips: number; total: number; matches: number } {
  const se = signedTermSet(expected);
  const ss = signedTermSet(student);
  let flips = 0;
  let same = 0;
  for (const t of ss) {
    const alt = t[0] === "-" ? "+" + t.slice(1) : "-" + t.slice(1);
    if (se.has(t)) same++;
    else if (se.has(alt)) flips++;
  }
  return { flips, total: student.terms.size, matches: same };
}

/** Sammenligner to polynomiers led-mængde uden at regne på koefficienter præcist. */
export function coeffMismatch(student: Poly, expected: Poly): number {
  let mismatches = 0;
  for (const [k, t] of expected.terms) {
    const o = student.terms.get(k);
    if (!o) {
      mismatches++;
      continue;
    }
    if (!t.coeff.eq(o.coeff)) mismatches++;
  }
  for (const k of student.terms.keys()) {
    if (!expected.terms.has(k)) mismatches++;
  }
  return mismatches;
}

/** Formatterer en Frac-koefficient foran et led i LaTeX. */
function coeffLatex(c: Frac, hasVars: boolean): string {
  if (c.isOne) return hasVars ? "" : "1";
  if (c.n === -1 && c.d === 1) return hasVars ? "-" : "-1";
  if (c.isInt) return `${c.n}`;
  // Brøkkoefficient: \frac{a}{b} foran variablerne
  return `\\frac{${c.n}}{${c.d}}`;
}

function varsLatex(vars: VarPowers): string {
  return Object.keys(vars)
    .sort()
    .map((v) => (vars[v] === 1 ? v : `${v}^{${vars[v]}}`))
    .join("");
}

/** Latex for et polynomium uden \frac-omslag. */
export function polyToLatex(p: Poly): string {
  if (polyIsZero(p)) return "0";
  const keys = [...p.terms.keys()].sort(compareKeys);
  let out = "";
  for (const k of keys) {
    const t = p.terms.get(k)!;
    const negative = t.coeff.lt(Frac.zero);
    const abs: Term = { coeff: negative ? t.coeff.neg() : t.coeff, vars: t.vars };
    const hasVars = Object.keys(t.vars).length > 0;
    if (out === "") {
      out += `${negative ? "-" : ""}${coeffLatex(abs.coeff, hasVars)}${varsLatex(abs.vars)}`;
    } else {
      out += `${negative ? " - " : " + "}${coeffLatex(abs.coeff, hasVars)}${varsLatex(abs.vars)}`;
    }
  }
  return out;
}

/** Latex for en rationel størrelse — brøker vises med \dfrac. */
export function ratToLatex(r: Rat): string {
  const dc = polyIsConstant(r.d);
  if (dc && dc.eq(Frac.one)) return polyToLatex(r.n);
  return `\\dfrac{${polyToLatex(r.n)}}{${polyToLatex(r.d)}}`;
}

/** Kanonisk Rat → parserbar plain-tekst (fx "(8a+9b)/6" eller "3x-15"). */
export function ratToPlain(r: Rat): string {
  const num = latexToPlain(polyToLatex(r.n));
  if (polyIsConstant(r.d)) {
    const dc = polyIsConstant(r.d)!;
    if (dc.isOne) return num;
    return `(${num})/${dc.n}`;
  }
  return `(${num})/(${latexToPlain(polyToLatex(r.d))})`;
}

function latexToPlain(s: string): string {
  return s
    .replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)")
    .replace(/\^\{(\d+)\}/g, "^$1")
    .replace(/\\left|\\right/g, "");
}

export function commonDenominator(e: Expr): Frac | null {
  try {
    return collectDenominators(e);
  } catch {
    return null;
  }
}

function collectDenominators(e: Expr): Frac {
  switch (e.kind) {
    case "num":
      return e.value.d === 1 ? Frac.one : e.value;
    case "var":
      return Frac.one;
    case "add": {
      let acc = Frac.one;
      for (const a of e.args) acc = lcmFrac(acc, collectDenominators(a));
      return acc;
    }
    case "mul": {
      let acc = Frac.one;
      for (const a of e.args) acc = acc.mul(collectDenominators(a));
      return acc;
    }
    case "div": {
      const d = polyIsConstant(toRat(e.den).n);
      const num = collectDenominators(e.num);
      const denVal = d ?? Frac.one;
      return lcmFrac(num, denVal);
    }
    case "pow":
      return collectDenominators(e.base);
    case "sqrt":
      return Frac.one;
    case "eq":
      throw new UnsupportedExpr();
  }
}

function lcmFrac(a: Frac, b: Frac): Frac {
  const ln = lcm(Math.abs(a.n), Math.abs(b.n));
  const g = gcd(a.d, b.d);
  return Frac.of(ln, g);
}
