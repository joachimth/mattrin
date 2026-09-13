/**
 * Kernetyper for opgaveplaner og elevtrin.
 *
 * En "MathTask" er appens interne, analyserede repræsentation af en
 * opgave. En "PlanStep" er et planlagt, pædagogisk skridt med regel,
 * forklaring og tre hint-niveauer — det er dette format AI senere kan
 * bruges til at omformulere, uden at matematikkens korrekthed afhænger af den.
 */
export type Topic =
  | "reducere"
  | "ligning"
  | "ligning-andengrad"
  | "faktorisere"
  | "differentiere"
  | "procent";

export interface PlanStep {
  /** Latex af udtrykket/ligningen før skridtet (kan være tom for første). */
  from: string;
  /** Latex af det forventede resultat af skridtet. */
  to: string;
  /** Samme resultat som almindelig, parserbar matematiktekst (til validering). */
  toPlain: string;
  /** Kort regelnr., fx "Distributiv lov" eller "Flyt led over lighedstegnet". */
  rule: string;
  /** Venlig, dansk forklaring af reglen (vises ved "Forklar reglen"). */
  explanation: string;
  /** Hint i stigende konkretion (typisk tre). */
  hints: string[];
  /** Valgfri beskrivelse af en typisk fejl i netop dette skridt. */
  typicalError?: string;
  /**
   * Ekstra accepterede elevsvar ud over `to` (fx "6" når nævneren spørges til).
   * Hver streng parses og sammenlignes kanonisk med elevens svar.
   */
  alsoAccept?: string[];
  /** Er skridtet et "opdagelses"-svar (fx fællesnævneren) frem for en mellemregning? */
  question?: string;
}

export interface MathTask {
  topic: Topic;
  /** Dansk emnetitel, fx "Reduktion med brøker". */
  title: string;
  /** Elevens oprindelige input (normaliseret). */
  input: string;
  /** LaTeX-visning af opgaven. */
  latex: string;
  /** De planlagte skridt til fuld løsning. */
  steps: PlanStep[];
  /** Kort anerkendelse af hvad opgaven handler om — vises efter analyse. */
  intro: string;
  /** Valgfri afsluttende kontrol-tekst (fx "indsæt og tjek"). */
  checkText?: string;
}

export type Verdict =
  | { kind: "correct"; praise: string }
  | { kind: "later-step"; praise: string; skipTo: number }
  | { kind: "unchanged" }
  | { kind: "error"; errorType: ErrorType; message: string }
  | { kind: "invalid"; message: string };

export type ErrorType =
  | "fortegn"
  | "faellesnaevner"
  | "distribution"
  | "regnefejl"
  | "potensregel"
  | "isolation"
  | "strukturel";
