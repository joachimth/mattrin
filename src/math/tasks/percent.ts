/**
 * Planlægger for procentregning: "Hvad er 15% af 240?", "12 er 30% af hvad?".
 */
import { Frac } from "../fraction";
import { MathTask, PlanStep } from "./types";
import { plainFracOf } from "./shared";

export interface ParsedPercent {
  kind: "af" | "del-af-hel" | "stigning";
  pct: number; // procenttal
  value: number; // det kendte tal
}

export function parsePercentTask(input: string): ParsedPercent | null {
  const s = input.toLowerCase().replace(/,/g, ".");
  const pctMatch = s.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!pctMatch) return null;
  const pct = parseFloat(pctMatch[1]);

  // "15% af 240" / "hvad er 15% af 240"
  const af = s.match(/(\d+(?:\.\d+)?)\s*%\s*(?:af|of)\s*(\d+(?:\.\d+)?)/);
  if (af) return { kind: "af", pct, value: parseFloat(af[2]) };

  // "12 er 30% af hvad" / "240 udgør 15% af ..."
  const del = s.match(/(\d+(?:\.\d+)?)\s*(?:er|udgør|udgor)\s*(\d+(?:\.\d+)?)\s*%/);
  if (del) return { kind: "del-af-hel", pct, value: parseFloat(del[1]) };

  // "240 stiger med 15%" / "240 + 15%"
  const stig = s.match(/(\d+(?:\.\d+)?)\s*(?:stiger|stiger med|plus|\+)\s*(?:med\s*)?(\d+(?:\.\d+)?)\s*%/);
  if (stig) return { kind: "stigning", pct, value: parseFloat(stig[1]) };

  return null;
}

export function planPercent(input: string): MathTask | null {
  const parsed = parsePercentTask(input);
  if (!parsed) return null;
  const { kind, pct, value } = parsed;
  const p = Frac.of(Math.round(pct * 100), 100); // eksakt procent som brøk
  const val = Frac.of(Math.round(value * 100), 100);

  const steps: PlanStep[] = [];

  if (kind === "af") {
    const result = val.mul(p).div(Frac.of(100));
    steps.push({
      from: "",
      to: `${plainFracOf(p.div(Frac.of(100)))}`,
      toPlain: plainFracOf(p.div(Frac.of(100))),
      rule: "Procent som brøk",
      explanation: `${pct} % betyder ${pct}/100. Percent betyder "per hundrede".`,
      hints: ["Hvad betyder procent?", `${pct} % = ${pct}/100`],
      alsoAccept: [`${pct}/100`],
    });
    steps.push({
      from: "",
      to: `${plainFracOf(result)}`,
      toPlain: plainFracOf(result),
      rule: "Gang med grundtallet",
      explanation: `"${pct} % af ${value}" betyder ${pct}/100 · ${value} = ${plainFracOf(result)}.`,
      hints: [
        "'af' betyder gange.",
        `${pct}/100 · ${value}`,
        `Svaret er ${plainFracOf(result)}.`,
      ],
      alsoAccept: [plainFracOf(result), result.isInt ? `${result.n}` : `${result.toNumber()}`],
    });
    return {
      topic: "procent",
      title: "Procentregning",
      input,
      latex: `${pct}\\,\\% \\text{ af } ${value}`,
      steps,
      intro: "En procentopgave af typen 'procent af et tal'.",
    };
  }

  if (kind === "del-af-hel") {
    const hel = val.mul(Frac.of(100)).div(p);
    steps.push({
      from: "",
      to: `\\dfrac{${plainFracOf(val)}}{\\dfrac{${pct}}{100}}`,
      toPlain: `${plainFracOf(val)}/(${pct}/100)`,
      rule: "Opskr formlen",
      explanation: `Hvis ${value} er ${pct} % af det hele, så er det hele = del · 100 / procent.`,
      hints: [
        "Del skal dividere med procentfraktionen.",
        `Det hele = ${value} · 100/${pct}`,
        `Svaret er ${plainFracOf(hel)}.`,
      ],
      alsoAccept: [plainFracOf(hel), hel.isInt ? `${hel.n}` : `${hel.toNumber()}`],
    });
    return {
      topic: "procent",
      title: "Procentregning",
      input,
      latex: `${value} \\text{ er } ${pct}\\,\\% \\text{ af } x`,
      steps,
      intro: "En procentopgave: find hele tallet ud fra en del og en procentsats.",
    };
  }

  // stigning
  const after = val.add(val.mul(p).div(Frac.of(100)));
  const frac = val.mul(p).div(Frac.of(100));
  steps.push({
    from: "",
    to: plainFracOf(frac),
    toPlain: plainFracOf(frac),
    rule: "Beregn ændringen",
    explanation: `Stigningen er ${pct} % af ${value}: ${pct}/100 · ${value} = ${plainFracOf(frac)}.`,
    hints: [`${pct} % af ${value}`, `Svaret er ${plainFracOf(frac)}.`],
    alsoAccept: [plainFracOf(frac)],
  });
  steps.push({
    from: "",
    to: plainFracOf(after),
    toPlain: plainFracOf(after),
    rule: "Læg stigningen til",
    explanation: `Nyt tal = ${value} + ${plainFracOf(frac)} = ${plainFracOf(after)}.`,
    hints: [`Svaret er ${plainFracOf(after)}.`],
    alsoAccept: [plainFracOf(after), after.isInt ? `${after.n}` : `${after.toNumber()}`],
  });
  return {
    topic: "procent",
    title: "Procentregning",
    input,
    latex: `${value} \\text{ stiger med } ${pct}\\,\\%`,
    steps,
    intro: "En procentopgave med stigning.",
  };
}
