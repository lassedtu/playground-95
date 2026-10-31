import type { Difficulty } from "../data/difficulties";

export type Score = { moves: number; seconds: number };
export type BestScores = Partial<Record<Difficulty["id"], Score>>;

const STORAGE_KEY = "playground95.memory.best-scores";

/** Fewer moves wins; on equal moves, the faster time. */
export function isBetter(score: Score, than: Score | undefined): boolean {
  if (!than) return true;
  return score.moves < than.moves || (score.moves === than.moves && score.seconds < than.seconds);
}

export function readBestScores(): BestScores {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as BestScores) : {};
  } catch {
    return {}; // unavailable (private mode) or corrupt: start fresh
  }
}

/** Saves the score if it's a new best. Returns whether it was. */
export function recordScore(difficulty: Difficulty, score: Score): boolean {
  const best = readBestScores();
  if (!isBetter(score, best[difficulty.id])) return false;
  best[difficulty.id] = score;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(best));
  } catch {
    // Storage full or blocked: it's still a best for this session's message.
  }
  return true;
}

export function clearBestScores() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nothing to clear
  }
}

export function formatTime(seconds: number): string {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
