/**
 * Sammenligning af elevens svar med det forventede skridt — altid via den
 * kanoniske motor, aldrig via strengsammenligning.
 *
 * Planlagte skridt gemmer det forventede resultat som almindelig tekst
 * (`toPlain`, fx "(8a+9b)/6"), som parses og sammenlignes kanonisk med
 * elevens input. Elevens svar accepteres uanset skrivemåde, hvis det er
 * det samme tal/polynomium.
 */
import { parseInput } from "./parser";
import { Expr, evalNumeric } from "./ast";
import { ratEq, toRat } from "./polyrat";

/** Parser elevens input som udtryk — null hvis det ikke kan læses. */
export function tryParse(src: string): Expr | null {
  try {
    return parseInput(src);
  } catch {
    return null;
  }
}

function compareExpr(student: Expr, expectedPlain: string): boolean {
  const e = tryParse(expectedPlain);
  if (!e) return false;
  try {
    return ratEq(toRat(student), toRat(e));
  } catch {
    // fx kvadratrod — numerisk prøve i tre tilfældige punkter
    return numericSame(student, e);
  }
}

function numericSame(a: Expr, b: Expr): boolean {
  const vars = new Set<string>();
  collectVars(a, vars);
  collectVars(b, vars);
  const names = [...vars].slice(0, 3);
  const points = [1.7, -2.3, 3.1];
  for (const p of points) {
    const env: Record<string, number> = {};
    names.forEach((n, i) => (env[n] = p + i + 1.3));
    try {
      const va = evalNumeric(a, env);
      const vb = evalNumeric(b, env);
      if (!Number.isFinite(va) || !Number.isFinite(vb)) return false;
      if (Math.abs(va - vb) > 1e-9 * Math.max(1, Math.abs(va))) return false;
    } catch {
      return false;
    }
  }
  return true;
}

function collectVars(e: Expr, out: Set<string>): void {
  switch (e.kind) {
    case "num":
      break;
    case "var":
      out.add(e.name);
      break;
    case "add":
    case "mul":
      e.args.forEach((a) => collectVars(a, out));
      break;
    case "div":
      collectVars(e.num, out);
      collectVars(e.den, out);
      break;
    case "pow":
      collectVars(e.base, out);
      break;
    case "sqrt":
      collectVars(e.arg, out);
      break;
    case "eq":
      collectVars(e.left, out);
      collectVars(e.right, out);
      break;
  }
}

/** Elevens svar indsendt som ligning? Returnerer de to sider. */
export function splitSides(s: string): [Expr, Expr] | null {
  const parts = s.split("=");
  if (parts.length !== 2) return null;
  const l = tryParse(parts[0]);
  const r = tryParse(parts[1]);
  return l && r ? [l, r] : null;
}

/**
 * Tjekker om elevens input svarer til det forventede resultat.
 * `expectedPlain` kan indeholde "=" (ligningstrin) — så sammenlignes siderne.
 */
export function sameAs(studentInput: string, expectedPlain: string): boolean {
  const student = studentInput.trim();
  const studentSides = splitSides(student);
  const expectedSides = splitSides(expectedPlain);

  if (expectedSides && studentSides) {
    return compareExpr(studentSides[0], partsToPlain(expectedPlain, 0)) && compareExpr(studentSides[1], partsToPlain(expectedPlain, 1));
  }
  if (!expectedSides && !studentSides) {
    const s = tryParse(student);
    return s !== null && compareExpr(s, expectedPlain);
  }
  return false;
}

function partsToPlain(plain: string, side: 0 | 1): string {
  const parts = plain.split("=");
  return parts[side] ?? parts[0];
}
