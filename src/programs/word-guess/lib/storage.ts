import { MAX_GUESSES } from "./game";

/** Today's progress, so closing the window or reloading keeps your guesses. */
type DayState = { day: number; guesses: string[] };

export type Stats = {
  played: number;
  wins: number;
  streak: number;
  maxStreak: number;
  /** Wins by number of guesses: index 0 = solved in 1. */
  distribution: number[];
  /** Last day a game was finished, for the streak. */
  lastDay: number | null;
};

const DAY_KEY = "playground95.word-guess.today";
const STATS_KEY = "playground95.word-guess.stats";

const emptyStats = (): Stats => ({
  played: 0,
  wins: 0,
  streak: 0,
  maxStreak: 0,
  distribution: Array(MAX_GUESSES).fill(0),
  lastDay: null,
});

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // not remembered
  }
}

export function loadGuesses(day: number): string[] {
  const state = read<DayState>(DAY_KEY);
  return state?.day === day ? state.guesses : [];
}

export function saveGuesses(day: number, guesses: string[]) {
  write(DAY_KEY, { day, guesses } satisfies DayState);
}

export function loadStats(): Stats {
  return { ...emptyStats(), ...read<Stats>(STATS_KEY) };
}

/** Records a finished day (once). */
export function recordGame(day: number, won: boolean, guesses: number): Stats {
  const stats = loadStats();
  if (stats.lastDay === day) return stats;
  const continues = stats.lastDay === day - 1;
  const streak = won ? (continues ? stats.streak + 1 : 1) : 0;
  const distribution = [...stats.distribution];
  if (won) distribution[guesses - 1]++;
  const next: Stats = {
    played: stats.played + 1,
    wins: stats.wins + (won ? 1 : 0),
    streak,
    maxStreak: Math.max(stats.maxStreak, streak),
    distribution,
    lastDay: day,
  };
  write(STATS_KEY, next);
  return next;
}
