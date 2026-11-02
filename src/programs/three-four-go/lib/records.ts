/** Best times per track: fastest lap, and fastest race for each number of laps. */
export type TrackRecords = { bestLap: number | null; bestRace: Record<number, number> };

type Records = Record<string, TrackRecords>;

const KEY = "playground95.three-four-go.records";

function load(): Records {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Records;
  } catch {
    return {};
  }
}

const EMPTY: TrackRecords = { bestLap: null, bestRace: {} };

export function trackRecords(track: string): TrackRecords {
  return { ...EMPTY, ...load()[track] };
}

/**
 * Saves a finished race if it beat anything; returns which records are new
 * (compared with what was saved before).
 */
export function recordRace(track: string, laps: number, time: number, bestLap: number | null) {
  const all = load();
  const before: TrackRecords = { ...EMPTY, ...all[track] };
  const newLap = bestLap !== null && (before.bestLap === null || bestLap < before.bestLap);
  const previousRace = before.bestRace[laps];
  const newRace = previousRace === undefined || time < previousRace;
  if (newLap || newRace) {
    all[track] = {
      bestLap: newLap ? bestLap : before.bestLap,
      bestRace: newRace ? { ...before.bestRace, [laps]: time } : before.bestRace,
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch {
      // not remembered
    }
  }
  return { newLap, newRace, before };
}
