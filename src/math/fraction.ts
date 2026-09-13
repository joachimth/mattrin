/**
 * Eksakte brøkregning med heltal.
 *
 * Al matematik i motoren bruger Frac — aldrig flydende tal — så alle
 * sammenligninger af mellemtrin kan være deterministiske.
 */
export class Frac {
  readonly n: number; // tæller
  readonly d: number; // nævner (> 0, reduceret)

  private constructor(n: number, d: number) {
    this.n = n;
    this.d = d;
  }

  static of(n: number, d: number = 1): Frac {
    if (d === 0) throw new Error("Division med nul");
    if (!Number.isInteger(n) || !Number.isInteger(d)) {
      throw new Error(`Frac kræver heltal, fik ${n}/${d}`);
    }
    if (d < 0) {
      n = -n;
      d = -d;
    }
    const g = gcd(Math.abs(n), d) || 1;
    return new Frac(n / g, d / g);
  }

  static get zero(): Frac {
    return new Frac(0, 1);
  }

  static get one(): Frac {
    return new Frac(1, 1);
  }

  add(o: Frac): Frac {
    return Frac.of(this.n * o.d + o.n * this.d, this.d * o.d);
  }

  sub(o: Frac): Frac {
    return Frac.of(this.n * o.d - o.n * this.d, this.d * o.d);
  }

  mul(o: Frac): Frac {
    return Frac.of(this.n * o.n, this.d * o.d);
  }

  div(o: Frac): Frac {
    if (o.n === 0) throw new Error("Division med nul");
    return Frac.of(this.n * o.d, this.d * o.n);
  }

  neg(): Frac {
    return new Frac(-this.n, this.d);
  }

  abs(): Frac {
    return this.n < 0 ? new Frac(-this.n, this.d) : this;
  }

  get isZero(): boolean {
    return this.n === 0;
  }

  get isOne(): boolean {
    return this.n === 1 && this.d === 1;
  }

  get isInt(): boolean {
    return this.d === 1;
  }

  eq(o: Frac): boolean {
    return this.n === o.n && this.d === o.d;
  }

  lt(o: Frac): boolean {
    return this.n * o.d < o.n * this.d;
  }

  /** Returnerer heltalsværdien hvis brøken er et heltal, ellers null. */
  toIntOrNull(): number | null {
    return this.isInt ? this.n : null;
  }

  toNumber(): number {
    return this.n / this.d;
  }

  toString(): string {
    return this.d === 1 ? `${this.n}` : `${this.n}/${this.d}`;
  }

  /** LaTeX, fx \frac{3}{4} eller -2 */
  toLatex(): string {
    if (this.d === 1) return `${this.n}`;
    return `\\frac{${this.n}}{${this.d}}`;
  }
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}

export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
}
