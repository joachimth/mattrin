/**
 * Fælles hjælpere for opgaveplanlæggerne.
 */
import { Expr } from "../ast";
import { parseInput } from "../parser";
import { toRat, ratToLatex } from "../polyrat";
import { Frac } from "../fraction";

/** LaTeX for et fuldt udtryk eller en ligning. */
export function latexOfExpr(e: Expr): string {
  if (e.kind === "eq") {
    const l = toRat(e.left);
    const r = toRat(e.right);
    return `${ratToLatex(l)} = ${ratToLatex(r)}`;
  }
  return ratToLatex(toRat(e));
}

/** Sikkert input → LaTeX (falder tilbage til rå tekst ved parseproblemer). */
export function latexOfInput(input: string): string {
  try {
    return latexOfExpr(parseInput(input));
  } catch {
    return input.replace(/([&%$#_{}])/g, "\\$1");
  }
}

export { parseInput };

/** Eksakt brøk som almindelig tekst: "3", "3/4", "-2/5". */
export function plainFracOf(c: Frac): string {
  return c.d === 1 ? `${c.n}` : `${c.n}/${c.d}`;
}
