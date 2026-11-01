/** A finished puzzle. */
export type Result = { moves: number; seconds: number; hints: number };

type Progress = {
  /** Best result per level index (fewest moves, then fastest). */
  levels: Record<number, Result>;
  /** Today's daily result, the first one counts. */
  daily: (Result & { day: number }) | null;
  /** Level to open with. */
  current: number;
};

const KEY = "playground95.traffic-jam";

export function loadProgress(): Progress {
  const empty: Progress = { levels: {}, daily: null, current: 0 };
  try {
    return { ...empty, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Progress>) };
  } catch {
    return empty;
  }
}

function save(progress: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // not remembered
  }
}

const better = (a: Result, b: Result) => a.moves < b.moves || (a.moves === b.moves && a.seconds < b.seconds);

/** Saves a solved level; returns whether it beat the previous best. */
export function recordLevel(index: number, result: Result): boolean {
  const progress = loadProgress();
  const previous = progress.levels[index];
  if (previous && !better(result, previous)) return false;
  save({ ...progress, levels: { ...progress.levels, [index]: result } });
  return true;
}

/** Saves today's daily result unless one is already saved. */
export function recordDaily(day: number, result: Result) {
  const progress = loadProgress();
  if (progress.daily?.day === day) return progress.daily;
  const daily = { ...result, day };
  save({ ...progress, daily });
  return daily;
}

export function saveCurrentLevel(current: number) {
  save({ ...loadProgress(), current });
}

export function dailyResult(day: number): Result | null {
  const { daily } = loadProgress();
  return daily?.day === day ? daily : null;
}
