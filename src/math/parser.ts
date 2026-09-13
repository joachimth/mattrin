/**
 * Tokenizer + Pratt-parser for almindelig matematisk tekst.
 *
 * Understøtter implicit multiplikation ("3x", "2(4a+b)", "ab"),
 * heltalspotenser ("x^2", "x²"), brøker ("(4a+b)/2"), kvadratrod
 * ("sqrt(x)" / "√x") og ligninger ("3x + 7 = 22").
 *
 * Danske decimaler med komma accepteres ("0,5"), men et komma efter
 * et heltal efterfulgt af ciffer behandles som decimaltegn.
 */
import { Frac } from "./fraction";
import { Expr, flatten } from "./ast";

type Tok =
  | { t: "num"; v: Frac }
  | { t: "var"; v: string }
  | { t: "op"; v: "+" | "-" | "*" | "/" | "^" | "=" }
  | { t: "lp" }
  | { t: "rp" };

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
  }
}

function tokenize(src: string): Tok[] {
  const s = src
    .replace(/\s+/g, " ")
    .replace(/√/g, "sqrt")
    .replace(/·|×/g, "*")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/:/g, "/");
  const toks: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === " ") {
      i++;
      continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9]/.test(s[j])) j++;
      // Dansk decimal: 0,5 eller 3,14 — men kun hvis komma følges af ciffer
      if (s[j] === "," && /[0-9]/.test(s[j + 1] ?? "")) {
        j++;
        while (j < s.length && /[0-9]/.test(s[j])) j++;
        toks.push({ t: "num", v: decimalFrac(s.slice(i, j).replace(",", ".")) });
        i = j;
        continue;
      }
      toks.push({ t: "num", v: Frac.of(parseInt(s.slice(i, j), 10)) });
      i = j;
      continue;
    }
    if (c === ",") {
      throw new ParseError("Jeg forstår ikke kommaet — prøv med punktum eller drop det");
    }
    if (/[a-zA-ZæøåÆØÅ]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-zA-ZæøåÆØÅ]/.test(s[j])) j++;
      const word = s.slice(i, j).toLowerCase();
      // Danske nøgleord der må optræde i input — alt andet (fx "hej med dig")
      // afvises med en hjælpsom besked i stedet for at blive læst som variable.
      const KEYWORDS = new Set([
        "sqrt", "reducer", "reducér", "reduceret", "find", "nulpunkterne", "nulpunkter",
        "for", "differentier", "differentiér", "differentiere", "afledte", "den", "til",
        "faktoriser", "faktorisér", "faktorisering", "sæt", "i", "parentes", "hvad", "er",
        "af", "og", "stiger", "faldt", "med", "udgør", "udgor", "procent", "ligning",
      ]);
      if (word.length >= 2 && !KEYWORDS.has(word)) {
        throw new ParseError(`Jeg forstår ikke ordet "${word}" i denne sammenhæng — prøv at skrive opgaven matematisk.`);
      }
      if (word === "sqrt") {
        // Behandl som funktion: sæt lp/rp omkring næste primære
        const rest = s.slice(j);
        const m = rest.match(/^\s*\(([^]*)/);
        if (m) {
          toks.push({ t: "var", v: "__sqrt__" });
          i = j;
          continue;
        }
        // sqrt uden parentes: fx sqrtx — tag ét tegn
        toks.push({ t: "var", v: "__sqrt__" });
        i = j;
        continue;
      }
      // Én bogstav-variabel pr. identifikator (a, b, x, ...) —
      // "ab" læses som a*b
      for (const ch of s.slice(i, j)) {
        toks.push({ t: "var", v: ch });
      }
      i = j;
      continue;
    }
    if ("+-*/^=".includes(c)) {
      toks.push({ t: "op", v: c as "+" | "-" | "*" | "/" | "^" | "=" });
      i++;
      continue;
    }
    if (c === "(") {
      toks.push({ t: "lp" });
      i++;
      continue;
    }
    if (c === ")") {
      toks.push({ t: "rp" });
      i++;
      continue;
    }
    throw new ParseError(`Tegnet "${c}" kender jeg ikke`);
  }
  return toks;
}

function decimalFrac(s: string): Frac {
  const [int, dec = ""] = s.split(".");
  const d = Math.pow(10, dec.length);
  return Frac.of(parseInt(int, 10) * d + parseInt(dec || "0", 10), d);
}

class Parser {
  private pos = 0;
  constructor(private toks: Tok[]) {}

  private peek(): Tok | undefined {
    return this.toks[this.pos];
  }

  private next(): Tok | undefined {
    return this.toks[this.pos++];
  }

  parse(): Expr {
    const e = this.parseFull();
    if (this.pos < this.toks.length) throw new ParseError("Der står noget ekstra i slutningen");
    return e;
  }

  /** parseAdd men med "=" som lavest precedence — bygger eq-noden. */
  private parseFull(): Expr {
    const left = this.parseAdd();
    const t = this.peek();
    if (t && t.t === "op" && t.v === "=") {
      this.next();
      const right = this.parseAdd();
      return { kind: "eq", left, right };
    }
    return left;
  }

  private parseAdd(): Expr {
    let left = this.parseMul();
    for (;;) {
      const t = this.peek();
      if (t && t.t === "op" && (t.v === "+" || t.v === "-")) {
        this.next();
        const op = t.v as "+" | "-";
        const right = this.parseMul();
        const rightArgs = right.kind === "add" ? right.args : [right];
        if (op === "+") {
          left = flatten("add", [left, ...rightArgs]);
        } else {
          left = flatten("add", [left, { kind: "mul", args: [{ kind: "num", value: Frac.of(-1) }, ...rightArgs] }]);
        }
      } else {
        return left;
      }
    }
  }

  private parseMul(): Expr {
    let left = this.parseUnary();
    for (;;) {
      const t = this.peek();
      if (t && t.t === "op" && (t.v === "*" || t.v === "/")) {
        this.next();
        const right = this.parseUnary();
        if (t.v === "*") {
          left = flatten("mul", [left, right]);
        } else {
          left = { kind: "div", num: left, den: right };
        }
      } else if (t && (t.t === "num" || t.t === "var" || t.t === "lp")) {
        // implicit multiplikation: 3x, 2(4a+b), (x+1)(x+2)
        const right = this.parseUnary();
        left = flatten("mul", [left, right]);
      } else {
        return left;
      }
    }
  }

  private parseUnary(): Expr {
    const t = this.peek();
    if (t && t.t === "op" && t.v === "-") {
      this.next();
      return { kind: "mul", args: [{ kind: "num", value: Frac.of(-1) }, this.parseUnary()] };
    }
    if (t && t.t === "op" && t.v === "+") {
      this.next();
      return this.parseUnary();
    }
    return this.parsePow();
  }

  private parsePow(): Expr {
    const base = this.parsePrimary();
    const t = this.peek();
    if (t && t.t === "op" && t.v === "^") {
      this.next();
      const e = this.parseUnary();
      if (e.kind === "num" && e.value.isInt && e.value.n >= 0 && e.value.n <= 6) {
        return { kind: "pow", base, exp: e.value.n };
      }
      throw new ParseError("Jeg kan kun regne med heltalseksponenter fra 0 til 6 her");
    }
    return base;
  }

  private parsePrimary(): Expr {
    const t = this.next();
    if (!t) throw new ParseError("Udtrykket slutter uventet");
    if (t.t === "num") return { kind: "num", value: t.v };
    if (t.t === "var") {
      if (t.v === "__sqrt__") {
        const arg = this.parsePrimary();
        return { kind: "sqrt", arg };
      }
      return { kind: "var", name: t.v };
    }
    if (t.t === "lp") {
      const e = this.parseAdd();
      const close = this.next();
      if (!close || close.t !== "rp") throw new ParseError("Der mangler en slutparentes");
      return e;
    }
    throw new ParseError("Jeg kan ikke læse udtrykket lige der");
  }
}

/** Parser et fuldt input som enten udtryk eller ligning. */
export function parseInput(src: string): Expr {
  const cleaned = src.trim();
  if (!cleaned) throw new ParseError("Der står ingenting");
  return new Parser(tokenize(cleaned)).parse();
}
