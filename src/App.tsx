import { useState } from "react";
import { Session } from "./features/Session";
import { Learn } from "./features/Learn";
import { History } from "./features/History";
import { hasOnboarded, setOnboarded } from "./lib/storage";
import { EXAMPLE_TASKS } from "./math/tasks/analyze";

type Tab = "opgaver" | "laer" | "historik";

export function App() {
  const [tab, setTab] = useState<Tab>("opgaver");
  const [onboarded, setOnboardedState] = useState(hasOnboarded());

  function finishOnboarding() {
    setOnboarded();
    setOnboardedState(true);
  }

  if (!onboarded) {
    return (
      <main className="shell onboarding">
        <div className="onboarding-card">
          <p className="brand">
            Mat<span className="brand-accent">Trin</span>
          </p>
          <h1>Velkommen</h1>
          <p className="onboarding-sub">Her får du hjælp til matematik — trin for trin.</p>
          <p className="onboarding-detail">Du tænker selv. Appen spørger, hintter og forklarer undervejs.</p>
          <button className="btn-primary btn-big" onClick={finishOnboarding}>
            Start
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="topbar">
        <p className="brand small">
          Mat<span className="brand-accent">Trin</span>
        </p>
      </header>

      {tab === "opgaver" && <HomeTab />}
      {tab === "laer" && <Learn />}
      {tab === "historik" && <History />}

      <nav className="tabbar" aria-label="Hovednavigation">
        <button className={tab === "opgaver" ? "tab active" : "tab"} aria-current={tab === "opgaver" ? "page" : undefined} onClick={() => setTab("opgaver")}>
          Opgaver
        </button>
        <button className={tab === "laer" ? "tab active" : "tab"} aria-current={tab === "laer" ? "page" : undefined} onClick={() => setTab("laer")}>
          Lær
        </button>
        <button className={tab === "historik" ? "tab active" : "tab"} aria-current={tab === "historik" ? "page" : undefined} onClick={() => setTab("historik")}>
          Historik
        </button>
      </nav>
    </main>
  );
}

function HomeTab() {
  const [mode, setMode] = useState<"start" | "session">("start");
  const [text, setText] = useState("");

  function startWith(value: string) {
    if (!value.trim()) return;
    setText(value.trim());
    setMode("session");
  }

  if (mode === "start") {
    return (
      <section className="start">
        <h1 className="start-title">Hvad arbejder du med?</h1>
        <StartForm onStart={startWith} />
        <div className="examples">
          <p className="examples-label">Eller prøv en af disse</p>
          <div className="example-chips">
            {EXAMPLE_TASKS.slice(0, 4).map((ex) => (
              <button key={ex} className="chip" onClick={() => startWith(ex)}>
                {ex}
              </button>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return <Session key={text} initialInput={text} onExit={() => setMode("start")} />;
}

function StartForm({ onStart }: { onStart: (v: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="input-row start-row">
      <input
        className="math-input big"
        placeholder="Skriv din opgave her…"
        aria-label="Skriv din opgave"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onStart(value)}
        autoComplete="off"
        autoCapitalize="off"
      />
      <button className="btn-primary" onClick={() => onStart(value)} disabled={!value.trim()}>
        Hjælp mig
      </button>
    </div>
  );
}
