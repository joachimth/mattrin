/**
 * Målrettet fejl-diagnose: når et elevsvar ikke matcher, forsøger vi at
 * genkende den typiske fejltype — fortegn, fællesnævner, distribution,
 * regnefejl — så feedbacken bliver konkret i stedet for bare "forkert".
 */
import { tryParse } from "../equivalent";
import { toRat, ratEq, ratSub, ratMul, polyIsZero, polySub, signFlipScore, coeffMismatch, polyIsConstant } from "../polyrat";
import { Frac } from "../fraction";
import { ErrorType, PlanStep, Verdict } from "./types";
import { sameAs } from "../equivalent";

export function checkStep(studentInput: string, step: PlanStep, _topic: string): Verdict {
  const input = studentInput.trim();
  if (!input) return { kind: "invalid", message: "Skriv dit forslag først — gæt gerne." };

  const accepted = [step.toPlain, ...(step.alsoAccept ?? [])];
  for (const a of accepted) {
    if (sameAs(input, a)) {
      return { kind: "correct", praise: praiseFor(step) };
    }
  }

  // Svar der matcher et senere trin — eleven sprang frem
  return { kind: "error", errorType: "strukturel", message: notYetMessage(step) };
}

export function diagnose(studentInput: string, expectedPlain: string, rule: string): { errorType: ErrorType; message: string } {
  const student = tryParse(studentInput);
  if (!student) {
    return {
      errorType: "strukturel",
      message: "Jeg kan ikke læse det som matematik. Prøv at skrive det som fx 12a+3b eller (4a+b)/2.",
    };
  }

  const expected = tryParse(expectedPlain);
  if (!expected) return { errorType: "strukturel", message: notYetGeneric(rule) };

  try {
    const s = toRat(student);
    const e = toRat(expected);

    // Hele svaret med modsat fortegn → klassisk fortegnsfejl
    const neg = ratMul(e, { n: { terms: new Map([["", { coeff: Frac.of(-1), vars: {} }]]) }, d: { terms: new Map([["", { coeff: Frac.one, vars: {} }]]) } });
    if (ratEq(s, neg)) {
      return {
        errorType: "fortegn",
        message: "Der er taget fejl i hele udtrykkets fortegn. Kig på, hvad minusset gør ved hvert led — og prøv igen.",
      };
    }

    // Forskel der svarer til et fortegnsvendt led → delvis fortegnsfejl
    const diff = ratSub(s, e);
    if (!polyIsZero(diff.n) && polyIsConstant(diff.d)) {
      // Sammenlign led-sætninger uden fortegn
      const { flips, total, matches } = signFlipScore(s.n, e.n);
      if (flips > 0 && flips + matches >= Math.max(1, total - 1)) {
        return {
          errorType: "fortegn",
          message: `Næsten. Du har vendt fortegnet på ${flips === 1 ? "ét led" : `${flips} led`}. Husk: minus foran en parentes vender fortegnet på alle led indeni. Prøv igen.`,
        };
      }
      const mism = coeffMismatch(s.n, e.n);
      if (mism >= 1 && mism <= 2) {
        return {
          errorType: "regnefejl",
          message: "Næsten — der er sneget sig en lille regnefejl ind. Prøv at regne koefficienterne efter én gang.",
        };
      }
    }

    // Forkert nævner: samme tæller som forventet ved fælles nævner-multiple
    if (polyIsConstant(e.d) && polyIsConstant(s.d)) {
      const ed = e.d.terms.size === 1 ? [...e.d.terms.values()][0].coeff : Frac.one;
      const sd = s.d.terms.size === 1 ? [...s.d.terms.values()][0].coeff : Frac.one;
      if (!ed.eq(sd)) {
        const ratio = ed.div(sd);
        const scaled = ratMul(e, { n: { terms: new Map([["", { coeff: ratio, vars: {} }]]) }, d: { terms: new Map([["", { coeff: Frac.one, vars: {} }]]) } });
        if (ratEq(s, scaled)) {
          return {
            errorType: "faellesnaevner",
            message: `Tælleren er god, men nævneren passer ikke helt. Prøv at se nævnerten efter — hvad skal de alle kunne gå op i?`,
          };
        }
      }
    }

    // Manglende distribution: elevens led ligner forventede led minus nogle
    const missing = polySub(e.n, s.n);
    if (!polyIsZero(missing) && s.n.terms.size >= 1 && e.n.terms.size > s.n.terms.size) {
      return {
        errorType: "distribution",
        message: "Det ser ud som om, et led er forsvundet undervejs. Hvert led i parentesen skal ganges med — prøv igen.",
      };
    }
  } catch {
    // kanonisk sammenligning ikke mulig — generel besked
  }

  return { errorType: "strukturel", message: notYetGeneric(rule) };
}

function notYetMessage(step: PlanStep): string {
  if (step.question) {
    return "Godt bud, men det er ikke svaret på netop dette trin. Læs spørgsmålet en gang til.";
  }
  return "Ikke helt — det svar hører til et senere trin. Tag det ene skridt ad gangen.";
}

function notYetGeneric(rule: string): string {
  const lower = rule.toLowerCase();
  return `Ikke helt. Kig lige på ${lower.includes("nævner") ? "nævnerne" : lower.includes("fortegn") ? "fortegnet" : lower.includes("parentes") || lower.includes("distributiv") ? "parenteserne" : lower.includes("isoler") ? "isoleringen af x" : "det sidste skridt"} — og prøv igen.`;
}

function praiseFor(step: PlanStep): string {
  if (step.question) return "Korrekt!";
  return "Korrekt — godt tænkt.";
}
