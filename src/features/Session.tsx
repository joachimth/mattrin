/**
 * Session — den sokratiske opgaveoplevelse.
 *
 * Flow: opgave → analyse → elevens eget næste trin → kontrollér →
 * ros/hint → næste trin → ... → løsning → "Vil du prøve en selv?".
 * "Vis fuld løsning" er altid sidste udvej og bekræftes først.
 */
import { useEffect, useRef, useState } from "react";
import { analyzeTask, CannotAnalyze } from "../math/tasks/analyze";
import { MathTask, PlanStep, Verdict } from "../math/tasks/types";
import { checkStep, diagnose } from "../math/tasks/diagnose";
import { generateSimilar } from "../math/tasks/similar";
import { Katex } from "../components/Katex";
import { recordAttempt, saveHistoryItem } from "../lib/storage";

type Phase = "analyzing" | "working" | "done" | "failed";

interface Feedback {
  kind: "correct" | "almost" | "off";
  title: string;
  body: string;
}

interface SessionProps {
  initialInput?: string;
  onFinished?: (solved: boolean) => void;
  onExit?: () => void;
}

export function Session({ initialInput, onFinished, onExit }: SessionProps) {
  const [input, setInput] = useState(initialInput ?? "");
  const [phase, setPhase] = useState<Phase>("analyzing");
  const [task, setTask] = useState<MathTask | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [attempt, setAttempt] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [hintLevel, setHintLevel] = useState(0); // 0 = ingen, 1..3 = hint-niveauer
  const [showHelp, setShowHelp] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [confirmFull, setConfirmFull] = useState(false);
  const [usedFull, setUsedFull] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [similarInput, setSimilarInput] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const stepRef = useRef<HTMLDivElement>(null);

  // Analyse af opgaven
  useEffect(() => {
    if (!initialInput) return;
    runAnalyze(initialInput);
  }, []);

  useEffect(() => {
    if (phase === "working") inputRef.current?.focus();
  }, [phase, stepIndex]);

  function runAnalyze(text: string) {
    setAnalyzing(true);
    setErrorMsg(null);
    // Bevidst lille ventetid: analysen føles omsorgsfuld, ikke blikkende
    window.setTimeout(() => {
      try {
        const t = analyzeTask(text);
        setTask(t);
        setPhase("working");
        saveHistoryItem({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          input: text,
          topic: t.topic,
          title: t.title,
          at: Date.now(),
          hintsUsed: 0,
          stepsDone: 0,
          solved: false,
          usedFullSolution: false,
        });
      } catch (err) {
        setPhase("failed");
        setErrorMsg(err instanceof CannotAnalyze ? err.reason : "Noget gik galt under analysen. Prøv at skrive opgaven på en ny måde.");
      } finally {
        setAnalyzing(false);
      }
    }, 350);
  }

  function currentStep(): PlanStep | null {
    if (!task || stepIndex >= task.steps.length) return null;
    return task.steps[stepIndex];
  }

  function submit() {
    if (!task || !attempt.trim()) return;
    const step = currentStep();
    if (!step) return;
    const v: Verdict = checkStep(attempt, step, task.topic);

    if (v.kind === "correct") {
      setFeedback({ kind: "correct", title: v.praise, body: step.rule });
      setHintLevel(0);
      advance();
    } else if (v.kind === "invalid") {
      setFeedback({ kind: "off", title: "Prøv lige igen", body: v.message });
    } else {
      const d = diagnose(attempt, step.toPlain, step.rule);
      setFeedback({
        kind: d.errorType === "regnefejl" ? "almost" : "off",
        title: "Næsten",
        body: d.message,
      });
      setHintLevel(1);
    }
  }

  function advance() {
    if (!task) return;
    const next = stepIndex + 1;
    setAttempt("");
    if (next >= task.steps.length) {
      setPhase("done");
      recordAttempt(task.topic, hintsUsed, true, usedFull);
      updateHistory(task, usedFull ? false : true, usedFull, hintsUsed, task.steps.length);
      onFinished?.(true);
    } else {
      setStepIndex(next);
      // Feedback bliver stående kort, derefter ryddes den
      window.setTimeout(() => setFeedback(null), 2400);
    }
  }

  function showHint() {
    const step = currentStep();
    if (!step) return;
    const nextLevel = Math.min(hintLevel + 1, 3);
    setHintLevel(nextLevel);
    setHintsUsed((h) => h + 1);
    setFeedback(null);
  }

  function showNextStep() {
    if (!task) return;
    const step = currentStep();
    if (!step) return;
    setHintLevel(0);
    setAttempt("");
    advance();
  }

  function revealFull() {
    if (!task) return;
    setShowFull(true);
    setConfirmFull(false);
    setUsedFull(true);
    setPhase("done");
    recordAttempt(task.topic, hintsUsed, false, true);
    updateHistory(task, false, true, hintsUsed, stepIndex);
    onFinished?.(false);
  }

  function updateHistory(t: MathTask, solved: boolean, usedFullSolution: boolean, hintsUsed: number, stepsDone: number) {
    // Historikken genindlæses i Historik-fanen; her gemmes slutstatus
    try {
      const raw = localStorage.getItem("mattrin.history.v1");
      if (!raw) return;
      const items = JSON.parse(raw) as { input: string; solved: boolean; usedFullSolution: boolean; hintsUsed: number; stepsDone: number; at: number }[];
      // find seneste item med samme input
      for (let i = items.length - 1; i >= 0; i--) {
        if (items[i].input === t.input && !items[i].solved && !items[i].usedFullSolution) {
          items[i] = { ...items[i], solved, usedFullSolution, hintsUsed, stepsDone };
          break;
        }
      }
      localStorage.setItem("mattrin.history.v1", JSON.stringify(items));
    } catch {
      // persistens er valgfri
    }
  }

  function trySimilar() {
    if (!task) return;
    const next = generateSimilar(task);
    setSimilarInput(next);
    setInput(next);
    setTask(null);
    setStepIndex(0);
    setAttempt("");
    setFeedback(null);
    setHintLevel(0);
    setShowFull(false);
    setUsedFull(false);
    setHintsUsed(0);
    setPhase("analyzing");
    runAnalyze(next);
  }

  // ---------- Render ----------

  if (phase === "analyzing" && !task) {
    return (
      <section className="session" aria-live="polite">
        <div className="session-card">
          <p className="session-question">Lad mig se på opgaven først…</p>
          {analyzing && <div className="pulse-dot" aria-hidden="true" />}
          <div className="input-row">
            <input
              ref={inputRef}
              className="math-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && input.trim() && runAnalyze(input)}
              placeholder="Skriv din opgave her…"
              aria-label="Din opgave"
              autoComplete="off"
              autoCapitalize="off"
            />
            <button className="btn-primary" onClick={() => input.trim() && runAnalyze(input)} disabled={!input.trim() || analyzing}>
              Hjælp mig
            </button>
          </div>
          {errorMsg && <p className="soft-error" role="alert">{errorMsg}</p>}
          {onExit && (
            <button className="link-btn" onClick={onExit}>
              Tilbage
            </button>
          )}
        </div>
      </section>
    );
  }

  if (phase === "failed") {
    return (
      <section className="session">
        <div className="session-card">
          <p className="soft-error" role="alert">
            {errorMsg ?? "Jeg kunne ikke læse opgaven."}
          </p>
          <div className="input-row">
            <input
              className="math-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && input.trim() && runAnalyze(input)}
              placeholder="Skriv din opgave her…"
              aria-label="Prøv opgaven igen"
            />
            <button className="btn-primary" onClick={() => input.trim() && runAnalyze(input)} disabled={!input.trim()}>
              Hjælp mig
            </button>
          </div>
          {onExit && (
            <button className="link-btn" onClick={onExit}>
              Tilbage
            </button>
          )}
        </div>
      </section>
    );
  }

  if (!task) return null;

  const step = phase === "working" ? currentStep() : null;

  return (
    <section className="session" aria-live="polite">
      <div className="session-card">
        <p className="task-title">{task.title}</p>
        <div className="task-math">
          <Katex tex={task.latex} block />
        </div>
        <p className="task-intro">{task.intro}</p>

        {phase === "working" && step && (
          <div ref={stepRef} className="step-block">
            <p className="step-question">{step.question ?? "Hvad tror du selv, næste trin er?"}</p>
            <div className="input-row">
              <input
                ref={inputRef}
                className="math-input"
                value={attempt}
                onChange={(e) => setAttempt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Skriv din mellemregning…"
                aria-label="Dit næste trin"
                autoComplete="off"
                autoCapitalize="off"
              />
              <button className="btn-primary" onClick={submit} disabled={!attempt.trim()}>
                Kontrollér
              </button>
            </div>

            {feedback && (
              <div className={`feedback feedback-${feedback.kind}`} role="status">
                <p className="feedback-title">{feedback.title}</p>
                <p className="feedback-body">{feedback.body}</p>
              </div>
            )}

            {hintLevel > 0 && !feedback && (
              <div className="hint-stack" role="status">
                {step.hints.slice(0, hintLevel).map((h, i) => (
                  <p key={i} className="hint">
                    {h}
                  </p>
                ))}
              </div>
            )}

            {step.typicalError && hintLevel >= 2 && (
              <p className="typical-error" role="status">
                Typisk fejl: {step.typicalError}
              </p>
            )}

            <div className="help-area">
              <button className="link-btn" aria-expanded={showHelp} onClick={() => setShowHelp((s) => !s)}>
                {showHelp ? "Skjul hjælp" : "Brug for hjælp?"}
              </button>
              {showHelp && (
                <div className="help-actions">
                  <button className="help-btn" onClick={showHint} disabled={hintLevel >= 3}>
                    {hintLevel === 0 ? "Giv mig et hint" : hintLevel < 3 ? "Et hint mere" : "Alle hints brugt"}
                  </button>
                  <button className="help-btn" onClick={() => setFeedback({ kind: "off", title: step.rule, body: step.explanation })}>
                    Forklar reglen
                  </button>
                  <button className="help-btn" onClick={showNextStep}>
                    Vis næste trin
                  </button>
                  {!showFull && (
                    <button className="help-btn help-last" onClick={() => setConfirmFull(true)}>
                      Vis hele løsningen
                    </button>
                  )}
                </div>
              )}
              {confirmFull && (
                <div className="confirm-full" role="alertdialog" aria-label="Bekræft fuld løsning">
                  <p>
                    Hele løsningen er sidste udvej — du lærer mest af selv at finde næste trin. Er du sikker?
                  </p>
                  <div className="confirm-row">
                    <button className="btn-secondary" onClick={() => setConfirmFull(false)}>
                      Nej, jeg prøver selv
                    </button>
                    <button className="help-btn help-last" onClick={revealFull}>
                      Ja, vis løsningen
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="done-block">
            <p className="done-title">Færdig — godt arbejde.</p>
            {task.checkText && <p className="check-text">{task.checkText}</p>}
            <div className="done-actions">
              <button className="btn-primary" onClick={trySimilar}>
                Vil du prøve en selv?
              </button>
              {onExit && (
                <button className="link-btn" onClick={onExit}>
                  Ny opgave
                </button>
              )}
            </div>
            {similarInput && <p className="sr-only">Næste opgave: {similarInput}</p>}
          </div>
        )}

        {/* Fremdriftstrin — diskret */}
        <ol className="step-progress" aria-label="Fremdrift">
          {task.steps.map((_, i) => (
            <li key={i} className={i < stepIndex || phase === "done" ? "done" : i === stepIndex ? "current" : ""} aria-current={i === stepIndex && phase === "working" ? "step" : undefined} />
          ))}
        </ol>
      </div>

      {/* Fuld løsning — kun efter bekræftelse */}
      {showFull && (
        <div className="full-solution">
          <p className="full-title">Hele løsningen</p>
          <ol>
            {task.steps.map((s, i) => (
              <li key={i}>
                <Katex tex={s.to} block />
                <span className="full-rule">{s.rule}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
