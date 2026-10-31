import type { Level } from "../data/levels";

export type BestTimes = Partial<Record<Level["id"], number>>;

const STORAGE_KEY = "playground95.minesweeper.best-times";

export function readBestTimes(): BestTimes {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as BestTimes) : {};
  } catch {
    return {};
  }
}

/** Saves the time (whole seconds) if it's a new best. Returns whether it was. */
export function recordTime(level: Level, seconds: number): boolean {
  const best = readBestTimes();
  const previous = best[level.id];
  if (previous !== undefined && previous <= seconds) return false;
  best[level.id] = seconds;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(best));
  } catch {
    // not saved; still a best for this game's message
  }
  return true;
}

export function clearBestTimes() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nothing to clear
  }
}
