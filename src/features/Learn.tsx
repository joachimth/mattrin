import { useState } from "react";
import { LEARN_TOPICS, LearnTopic } from "./learn/content";
import { Session } from "./Session";

/** Sekundært område: kort teori, regler, eksempel og en øvelse. */
export function Learn() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [exercise, setExercise] = useState<string | null>(null);

  if (exercise) {
    return <Session initialInput={exercise} onExit={() => setExercise(null)} />;
  }

  return (
    <section className="learn">
      <h2 className="page-title">Lær</h2>
      <p className="page-sub">Kort teori, når du har brug for den. Ingen lange kapitler.</p>
      <div className="topic-list">
        {LEARN_TOPICS.map((t) => (
          <TopicCard key={t.id} topic={t} open={openId === t.id} onToggle={() => setOpenId(openId === t.id ? null : t.id)} onStart={(task) => setExercise(task)} />
        ))}
      </div>
    </section>
  );
}

function TopicCard({ topic, open, onToggle, onStart }: { topic: LearnTopic; open: boolean; onToggle: () => void; onStart: (task: string) => void }) {
  return (
    <article className="topic-card">
      <button className="topic-head" aria-expanded={open} onClick={onToggle}>
        <span>
          <span className="topic-name">{topic.name}</span>
          <span className="topic-blurb">{topic.blurb}</span>
        </span>
        <span className="topic-chevron" aria-hidden="true">
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <div className="topic-body">
          <p className="body-label">Kort sagt</p>
          {topic.theory.map((p, i) => (
            <p key={i} className="body-text">
              {p}
            </p>
          ))}
          <p className="body-label">Centrale regler</p>
          <dl className="rules">
            {topic.rules.map((r, i) => (
              <div key={i} className="rule">
                <dt>{r.rule}</dt>
                <dd>{r.body}</dd>
              </div>
            ))}
          </dl>
          <p className="body-label">Eksempel</p>
          <div className="example">
            <p className="example-task">{topic.example.task}</p>
            <p className="body-text">{topic.example.text}</p>
            <ol className="example-steps">
              {topic.example.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
          <p className="body-label">Typiske fejl</p>
          <ul className="errors">
            {topic.typicalErrors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
          <button className="btn-secondary" onClick={() => onStart(topic.exercise)}>
            Øv dig: {topic.exercise}
          </button>
        </div>
      )}
    </article>
  );
}
