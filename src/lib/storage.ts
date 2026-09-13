/**
 * Lokal persistens: historik og progression i localStorage.
 * Ingen login — appen virker øjeblikkeligt, data ligger i browseren.
 */
import { Topic } from "../math/tasks/types";

export interface HistoryItem {
  id: string;
  input: string;
  topic: Topic;
  title: string;
  at: number; // epoch ms
  hintsUsed: number;
  stepsDone: number;
  solved: boolean; // løst uden fuld løsning
  usedFullSolution: boolean;
}

export interface TopicProgress {
  attempts: number;
  solved: number;
  correctFirstTry: number;
  hintsUsedTotal: number;
}

export interface ProgressState {
  topics: Record<string, TopicProgress>;
}

const HISTORY_KEY = "mattrin.history.v1";
const PROGRESS_KEY = "mattrin.progress.v1";
const ONBOARDED_KEY = "mattrin.onboarded.v1";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // fuld storage eller private mode — appen virker stadig uden persistens
  }
}

export function loadHistory(): HistoryItem[] {
  return read<HistoryItem[]>(HISTORY_KEY, []).sort((a, b) => b.at - a.at);
}

export function saveHistoryItem(item: HistoryItem): void {
  const all = read<HistoryItem[]>(HISTORY_KEY, []);
  all.push(item);
  // Hold historikken nede: max 200 emner
  write(HISTORY_KEY, all.slice(-200));
}

export function loadProgress(): ProgressState {
  return read<ProgressState>(PROGRESS_KEY, { topics: {} });
}

export function recordAttempt(topic: Topic, hintsUsed: number, solved: boolean, usedFullSolution: boolean): void {
  const p = loadProgress();
  const t = p.topics[topic] ?? { attempts: 0, solved: 0, correctFirstTry: 0, hintsUsedTotal: 0 };
  t.attempts += 1;
  if (solved && !usedFullSolution) t.solved += 1;
  if (solved && hintsUsed === 0 && !usedFullSolution) t.correctFirstTry += 1;
  t.hintsUsedTotal += hintsUsed;
  p.topics[topic] = t;
  write(PROGRESS_KEY, p);
}

export function hasOnboarded(): boolean {
  return read<boolean>(ONBOARDED_KEY, false);
}

export function setOnboarded(): void {
  write(ONBOARDED_KEY, true);
}

/** Dansk emnenavn. */
export const TOPIC_LABELS: Record<Topic, string> = {
  reducere: "Reduktion",
  ligning: "Lineære ligninger",
  "ligning-andengrad": "Andengradsligninger",
  faktorisere: "Faktorisering",
  differentiere: "Differentialregning",
  procent: "Procentregning",
};

/** Mestring-besked i stil med "Du klarer fortegn korrekt i 8 ud af 10". */
export function masteryLine(topic: Topic): string | null {
  const p = loadProgress().topics[topic];
  if (!p || p.attempts < 3) return null;
  const pct = Math.round((p.correctFirstTry / p.attempts) * 10);
  if (pct >= 8) return `Du klarer ${TOPIC_LABELS[topic].toLowerCase()} uden hjælp i ${pct} ud af 10 opgaver.`;
  return null;
}
