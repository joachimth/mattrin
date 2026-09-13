/**
 * Abstrakt syntakstræ for matematiske udtryk og ligninger.
 *
 * Aktuelle noder:
 *   num   — eksakt brøk (Frac)
 *   var   — variabel, fx x, a, b
 *   add   — sum af led (n eller flere)
 *   mul   — produkt af faktorer
 *   div   — brøk: tæller / nævner
 *   pow   — potens med heltalseksponent
 *   sqrt  — kvadratrod
 *   eq    — ligning: venstre = højre
 */
export type Expr =
  | { kind: "num"; value: Frac }
  | { kind: "var"; name: string }
  | { kind: "add"; args: Expr[] }
  | { kind: "mul"; args: Expr[] }
  | { kind: "div"; num: Expr; den: Expr }
  | { kind: "pow"; base: Expr; exp: number }
  | { kind: "sqrt"; arg: Expr }
  | { kind: "eq"; left: Expr; right: Expr };

import { Frac } from "./fraction";

/** Samler en flad liste af add/mul-argumenter til ét element. */
export function flatten(kind: "add" | "mul", args: Expr[]): Expr {
  const flat: Expr[] = [];
  for (const a of args) {
    if (a.kind === kind) flat.push(...a.args);
    else flat.push(a);
  }
  if (flat.length === 0) return { kind: "num", value: kind === "add" ? Frac.zero : Frac.one };
  if (flat.length === 1) return flat[0];
  return { kind, args: flat };
}

/** Numerisk evaluering (fallback og rødder). */
export function evalNumeric(e: Expr, vars: Record<string, number>): number {
  switch (e.kind) {
    case "num":
      return e.value.toNumber();
    case "var": {
      const v = vars[e.name];
      if (v === undefined) throw new Error(`Mangler værdi for ${e.name}`);
      return v;
    }
    case "add":
      return e.args.reduce((s, a) => s + evalNumeric(a, vars), 0);
    case "mul":
      return e.args.reduce((s, a) => s * evalNumeric(a, vars), 1);
    case "div":
      return evalNumeric(e.num, vars) / evalNumeric(e.den, vars);
    case "pow":
      return Math.pow(evalNumeric(e.base, vars), e.exp);
    case "sqrt":
      return Math.sqrt(evalNumeric(e.arg, vars));
    case "eq":
      throw new Error("En ligning kan ikke evalueres som udtryk");
  }
}
