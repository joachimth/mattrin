/**
 * Obligatorisk test fra produktkravene:
 *   Input:  (4a+b)/2-(2a-3b)/3
 *   Forventet reduceret resultat: (8a+9b)/6
 * Plus de centrale matematiske flows: fortegn, parenteser, fællesnævnere,
 * lineære ligninger, faktorisering, differentialregning og edge cases.
 */
import { test, expect, describe } from "bun:test";
import { analyzeTask } from "../src/math/tasks/analyze";
import { sameAs, tryParse } from "../src/math/equivalent";
import { toRat, ratEq } from "../src/math/polyrat";
import { checkStep } from "../src/math/tasks/diagnose";
import { generateSimilar } from "../src/math/tasks/similar";
import { parseInput, ParseError } from "../src/math/parser";

const REDUCTION = "(4a+b)/2 - (2a-3b)/3";

describe("Obligatorisk: reduktion med brøker", () => {
  const task = analyzeTask(REDUCTION);

  test("opgaven analyseres som reduktion", () => {
    expect(task.topic).toBe("reducere");
    expect(task.steps.length).toBeGreaterThanOrEqual(4);
  });

  test("sidste trin er (8a+9b)/6", () => {
    const last = task.steps[task.steps.length - 1];
    expect(last.toPlain.replace(/\s/g, "")).toBe("(8a+9b)/6");
  });

  test("mellemtrin: fællesnævneren er 6", () => {
    const s0 = task.steps[0];
    expect(s0.toPlain).toBe("6");
  });

  test("mellemtrin: omskrivning med fællesnævner valideres", () => {
    const s1 = task.steps[1];
    expect(sameAs("3(4a+b)/6 - 2(2a-3b)/6", s1.toPlain)).toBe(true);
    expect(sameAs("12a/6 + 3b/6 - 4a/6 + 6b/6", s1.toPlain)).toBe(true);
    expect(sameAs("3(4a+b)/6 - 2(2a-3b)/4", s1.toPlain)).toBe(false);
  });

  test("parentes-trinnet håndterer minus korrekt", () => {
    const s2 = task.steps[2];
    expect(sameAs("12a+3b)/6 - (4a-6b)/6".replace("12a", "(12a"), s2.toPlain)).toBe(true);
    expect(sameAs("(12a+3b)/6 - (4a+6b)/6", s2.toPlain)).toBe(false);
  });

  test("samlet brøk og reduceret resultat valideres", () => {
    const s3 = task.steps[3];
    const s4 = task.steps[4];
    expect(sameAs("(12a+3b-4a+6b)/6", s3.toPlain)).toBe(true);
    expect(sameAs("(8a+9b)/6", s4.toPlain)).toBe(true);
  });
});

describe("Fortegn og parenteser", () => {
  test("minus foran parentes reduceres korrekt", () => {
    const task = analyzeTask("3(2x-4) - 2(x-5)");
    const last = task.steps[task.steps.length - 1];
    expect(sameAs("4x - 2", last.toPlain)).toBe(true);
  });

  test("-(a-b) er ikke -a-b", () => {
    expect(sameAs("-2a+3b", "-(2a-3b)")).toBe(true);
    expect(sameAs("-2a-3b", "-(2a-3b)")).toBe(false);
  });
});

describe("Lineære ligninger", () => {
  test("3x + 7 = 22 giver x = 5", () => {
    const task = analyzeTask("3x + 7 = 22");
    expect(task.topic).toBe("ligning");
    const last = task.steps[task.steps.length - 1];
    expect(sameAs(last.toPlain, "x = 5")).toBe(true);
  });

  test("x-led på begge sider: 5x - 2 = 3x + 8", () => {
    const task = analyzeTask("5x - 2 = 3x + 8");
    const last = task.steps[task.steps.length - 1];
    expect(sameAs(last.toPlain, "x = 5")).toBe(true);
  });

  test("brøkform: x/3 + 2 = 7", () => {
    const task = analyzeTask("x/3 + 2 = 7");
    const last = task.steps[task.steps.length - 1];
    expect(sameAs(last.toPlain, "x = 15")).toBe(true);
  });

  test("skrivefrihed: elevens svar accepteres i flere former", () => {
    const task = analyzeTask("3x + 7 = 22");
    const last = task.steps[task.steps.length - 1];
    expect(sameAs("x=5", last.toPlain)).toBe(true);
    expect(sameAs("x = 15/3", last.toPlain)).toBe(true);
  });
});

describe("Andengradsligninger", () => {
  test("x^2 - 5x + 6 = 0 har rødderne 2 og 3", () => {
    const task = analyzeTask("x^2 - 5x + 6 = 0");
    expect(task.topic).toBe("ligning-andengrad");
    const rootStep = task.steps.find((s) => s.toPlain.includes("x_1"));
    expect(rootStep).toBeDefined();
    expect(rootStep!.to).toContain("= 2");
    expect(rootStep!.to).toContain("= 3");
  });

  test("diskriminanten beregnes som mellemtrin", () => {
    const task = analyzeTask("x^2 - 5x + 6 = 0");
    const dStep = task.steps.find((s) => s.rule === "Beregn d");
    expect(dStep).toBeDefined();
    expect(dStep!.toPlain).toContain("(−5/2)".replace("−", "-"));
  });

  test("negativ diskriminant: ingen reelle løsninger", () => {
    const task = analyzeTask("x^2 + x + 5 = 0");
    expect(task.steps.some((s) => s.to.includes("Ingen"))).toBe(true);
  });
});

describe("Differentialregning", () => {
  test("f(x) = 3x^3 + 2x differentierer til 9x^2 + 2", () => {
    const task = analyzeTask("Differentier f(x) = 3x^3 + 2x");
    expect(task.topic).toBe("differentiere");
    const last = task.steps[task.steps.length - 1];
    expect(sameAs(last.toPlain, "9x^2 + 2")).toBe(true);
  });

  test("konstantled differentierer til 0", () => {
    const task = analyzeTask("Differentier f(x) = 2x^2 + 7");
    expect(task.steps.some((s) => s.rule === "Konstantled")).toBe(true);
    const last = task.steps[task.steps.length - 1];
    expect(sameAs(last.toPlain, "4x")).toBe(true);
  });
});

describe("Faktorisering", () => {
  test("x^2 + 5x + 6 = (x+2)(x+3)", () => {
    const task = analyzeTask("Faktorisér x^2 + 5x + 6");
    expect(task.topic).toBe("faktorisere");
    const last = task.steps[task.steps.length - 1];
    expect(sameAs(last.toPlain, "(x+2)(x+3)")).toBe(true);
  });
});

describe("Procent", () => {
  test("15% af 240 er 36", () => {
    const task = analyzeTask("Hvad er 15% af 240?");
    expect(task.topic).toBe("procent");
    const last = task.steps[task.steps.length - 1];
    expect(sameAs(last.toPlain, "36")).toBe(true);
  });
});

describe("Fejl-genkendelse (sokratisk feedback)", () => {
  test("fortegnsfejl genkendes og bekræftes ikke som korrekt", () => {
    const task = analyzeTask(REDUCTION);
    const s2 = task.steps[2];
    const v = checkStep("(12a+3b)/6 - (4a+6b)/6", s2, task.topic);
    expect(v.kind).not.toBe("correct");
    if (v.kind === "error") {
      expect(["fortegn", "regnefejl", "strukturel"]).toContain(v.errorType);
    }
  });

  test("svar fra et senere trin afvises blidt", () => {
    const task = analyzeTask(REDUCTION);
    const s0 = task.steps[0];
    const v = checkStep("(8a+9b)/6", s0, task.topic);
    expect(v.kind).toBe("error");
  });

  test("tomt input er ugyldigt, ikke forkert", () => {
    const task = analyzeTask(REDUCTION);
    const v = checkStep("", task.steps[0], task.topic);
    expect(v.kind).toBe("invalid");
  });
});

describe("Edge cases", () => {
  test("uigenkendelig opgave giver en hjælpsom dansk besked", () => {
    expect(() => analyzeTask("hej med dig")).toThrow(/hjælpe|prøv/i);
  });

  test("ukendt tegn giver ParseError, ikke crash", () => {
    expect(() => parseInput("3x + ?")).toThrow(ParseError);
  });

  test("danske decimaler: 0,5x er 0,5 gange x", () => {
    const e = tryParse("0,5x");
    expect(e).not.toBeNull();
    const task = analyzeTask("0,5x + 2x");
    const last = task.steps[task.steps.length - 1];
    expect(sameAs(last.toPlain, "5/2x")).toBe(true);
  });

  test("implicit multiplikation: 2(4a+b) og 3x", () => {
    const task = analyzeTask("2(4a+b) + a");
    const last = task.steps[task.steps.length - 1];
    expect(sameAs(last.toPlain, "9a+2b")).toBe(true);
  });

  test("led med nul koefficient forsvinder", () => {
    const a = toRat(tryParse("3x - 3x + 5")!);
    const b = toRat(tryParse("5")!);
    expect(ratEq(a, b)).toBe(true);
  });

  test("division med nul opdages", () => {
    expect(() => parseInput("5/0")).not.toThrow();
    expect(() => analyzeTask("5/0 + 2")).toThrow(/nul/i);
  });

  test("lignende opgaver kan genereres og analyseres", () => {
    for (let i = 0; i < 20; i++) {
      for (const seed of ["3x + 7 = 22", "Differentier f(x) = 3x^3 + 2x", "Faktorisér x^2 + 5x + 6", "Hvad er 15% af 240?", "x^2 - 5x + 6 = 0"]) {
        const task = analyzeTask(seed);
        const next = generateSimilar(task);
        const analyzed = analyzeTask(next);
        expect(analyzed.topic).toBe(task.topic);
      }
    }
  });
});
