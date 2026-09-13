/**
 * Genererer lignende opgaver ("Vil du prøve en selv?") — samme struktur,
 * nye tal. Tal vælges så opgaverne holder sig pæne (hele/løselige svar).
 */
import { MathTask } from "./types";

function rnd(min: number, max: number): number {
  const span = max - min + 1;
  return min + Math.floor(Math.random() * span);
}

function nz(min: number, max: number): number {
  let v = 0;
  while (v === 0) v = rnd(min, max);
  return v;
}

export type SimilarGenerator = (topic: MathTask["topic"]) => string;

export function generateSimilar(task: MathTask): string {
  switch (task.topic) {
    case "ligning":
      return linearSimilar();
    case "ligning-andengrad":
      return quadraticSimilar();
    case "differentiere":
      return derivativeSimilar();
    case "faktorisere":
      return factorSimilar();
    case "procent":
      return percentSimilar();
    case "reducere":
    default:
      return reduceSimilar(task);
  }
}

function linearSimilar(): string {
  const a = nz(2, 6);
  const x = nz(-5, 6);
  const b = nz(-9, 9);
  const c = a * x + b;
  return `${a}x ${b >= 0 ? "+" : "-"} ${Math.abs(b)} = ${c}`;
}

function quadraticSimilar(): string {
  const r1 = nz(-5, 5);
  let r2 = nz(-5, 5);
  while (r2 === r1) r2 = nz(-5, 5);
  const b = -(r1 + r2);
  const c = r1 * r2;
  return `x^2 ${b >= 0 ? "+" : "-"} ${Math.abs(b)}x ${c >= 0 ? "+" : "-"} ${Math.abs(c)} = 0`;
}

function derivativeSimilar(): string {
  const a = nz(2, 4);
  const n1 = rnd(2, 3);
  const b = nz(2, 6);
  const c = nz(-5, 5);
  return `Differentier f(x) = ${a}x^${n1} ${c >= 0 ? "+" : "-"} ${Math.abs(c)}x ${b >= 0 ? "+" : "-"} ${Math.abs(b)}`;
}

function factorSimilar(): string {
  for (;;) {
    const r = nz(-5, 5);
    let s = nz(-5, 5);
    while (s === r) s = nz(-5, 5);
    const b = -(r + s);
    const c = r * s;
    if (b === 0 || c === 0) continue; // kræver både x-led og konstantled
    return `Faktorisér x^2 ${b >= 0 ? "+" : "-"} ${Math.abs(b)}x ${c >= 0 ? "+" : "-"} ${Math.abs(c)}`;
  }
}

function percentSimilar(): string {
  const pct = [5, 10, 12, 15, 20, 25, 40, 50][rnd(0, 7)];
  const base = rnd(4, 30) * 10;
  return `Hvad er ${pct}% af ${base}?`;
}

function reduceSimilar(task: MathTask): string {
  // Hvis opgaven havde brøker → ny brøkopgave, ellers ny parentesopgave
  const hadFractions = task.input.includes("/");
  if (hadFractions) {
    const a = nz(2, 4);
    const c = nz(2, 3);
    const n2 = nz(2, 5);
    const m2 = nz(2, 5);
    return `Reducer: (a+${n2}b)/${a} - (3a-${m2}b)/${c}`;
  }
  const k1 = nz(2, 4);
  const k2 = nz(2, 4);
  return `Reducer ${k1}(2x + ${nz(2, 5)}) - ${k2}x ${rnd(0, 1) ? "+" : "-"} ${nz(2, 6)}`;
}
