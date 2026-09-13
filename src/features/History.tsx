import { useEffect, useState } from "react";
import { HistoryItem, TOPIC_LABELS, loadHistory, loadProgress, ProgressState } from "../lib/storage";

/** Enkel historik — i dag og tidligere, diskret og kort. */
export function History() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [progress, setProgress] = useState<ProgressState>({ topics: {} });

  useEffect(() => {
    setItems(loadHistory());
    setProgress(loadProgress());
  }, []);

  const today = startOfDay(Date.now());
  const todays = items.filter((i) => i.at >= today);
  const earlier = items.filter((i) => i.at < today);

  const hasAnything = items.length > 0;
  const mastered = Object.entries(progress.topics).filter(([, p]) => p.attempts >= 3 && p.correctFirstTry / p.attempts >= 0.8);

  return (
    <section className="history">
      <h2 className="page-title">Historik</h2>
      {!hasAnything && (
        <div className="empty-state">
          <p>Ingen opgaver endnu.</p>
          <p className="empty-sub">Din første opgave kommer til at stå her.</p>
        </div>
      )}

      {mastered.length > 0 && (
        <div className="mastery">
          {mastered.map(([topic]) => (
            <p key={topic} className="mastery-line">
              Du kan nu selv løse {TOPIC_LABELS[topic as keyof typeof TOPIC_LABELS]?.toLowerCase() ?? topic}.
            </p>
          ))}
        </div>
      )}

      {todays.length > 0 && (
        <>
          <p className="history-label">I dag</p>
          <ul className="history-list">
            {todays.map((i) => (
              <HistoryRow key={i.id} item={i} />
            ))}
          </ul>
        </>
      )}
      {earlier.length > 0 && (
        <>
          <p className="history-label">Tidligere</p>
          <ul className="history-list">
            {earlier.map((i) => (
              <HistoryRow key={i.id} item={i} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function HistoryRow({ item }: { item: HistoryItem }) {
  return (
    <li className="history-row">
      <span className="history-topic">{TOPIC_LABELS[item.topic] ?? item.title}</span>
      <span className="history-status">
        {item.usedFullSolution ? "set løsning" : item.solved ? "løst selv" : item.stepsDone > 0 ? "påbegyndt" : "åbnet"}
      </span>
    </li>
  );
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
