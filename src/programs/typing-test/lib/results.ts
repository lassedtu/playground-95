export type Result = { wpm: number; accuracy: number; seconds: number };

/** Words per minute, counting a "word" as 5 correct characters (the standard). */
export function wordsPerMinute(correctChars: number, ms: number): number {
  if (ms < 1000) return 0;
  return Math.round(correctChars / 5 / (ms / 60_000));
}

/** Share of keystrokes that were right the first time, mistakes you fixed included. */
export function accuracy(correct: number, total: number): number {
  return total ? Math.round((correct / total) * 100) : 100;
}

export function countCorrect(typed: string, target: string): number {
  let correct = 0;
  for (let i = 0; i < typed.length; i++) if (typed[i] === target[i]) correct++;
  return correct;
}

const STORAGE_KEY = "playground95.typing-test.best";
type BestResults = Record<string, Result>;

export function readBest(): BestResults {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as BestResults) : {};
  } catch {
    return {};
  }
}

/** Saves the result if it's the best WPM for this test. Returns whether it was. */
export function recordResult(testId: string, result: Result): boolean {
  const best = readBest();
  if (best[testId] && best[testId].wpm >= result.wpm) return false;
  best[testId] = result;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(best));
  } catch {
    // not saved
  }
  return true;
}

export function clearBest() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nothing to clear
  }
}
