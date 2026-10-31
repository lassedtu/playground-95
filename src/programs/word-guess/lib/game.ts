import { ANSWERS } from "../data/answers";
import { VALID_WORDS } from "../data/valid-words";

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

export type Mark = "correct" | "present" | "absent";

let valid: Set<string> | null = null;
export function isValidWord(word: string): boolean {
  valid ??= new Set(VALID_WORDS.split(" "));
  return valid.has(word);
}

/**
 * Colours a guess like the original: exact matches first, then letters that
 * appear elsewhere, each answer letter can only be matched once, so a
 * double letter in the guess isn't marked twice for a single one in the answer.
 */
export function scoreGuess(guess: string, answer: string): Mark[] {
  const marks: Mark[] = Array(WORD_LENGTH).fill("absent");
  const remaining = new Map<string, number>();
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === answer[i]) marks[i] = "correct";
    else remaining.set(answer[i], (remaining.get(answer[i]) ?? 0) + 1);
  }
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (marks[i] === "correct") continue;
    const left = remaining.get(guess[i]) ?? 0;
    if (left > 0) {
      marks[i] = "present";
      remaining.set(guess[i], left - 1);
    }
  }
  return marks;
}

/** Day number in the player's local time zone, so the word changes at their midnight. */
export function dayNumber(date = new Date()): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

/** Fixed shuffle (seeded), so consecutive days aren't alphabetical neighbours. */
const ORDER = (() => {
  const order = [...ANSWERS];
  let seed = 95;
  const random = () => {
    seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
    return seed / 2_147_483_648;
  };
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
})();

export function dailyWord(day = dayNumber()): string {
  return ORDER[((day % ORDER.length) + ORDER.length) % ORDER.length];
}

/** Best mark per letter so far, for the on-screen keyboard. */
export function keyboardMarks(guesses: string[], answer: string): Map<string, Mark> {
  const rank: Record<Mark, number> = { absent: 0, present: 1, correct: 2 };
  const result = new Map<string, Mark>();
  for (const guess of guesses) {
    scoreGuess(guess, answer).forEach((mark, i) => {
      const previous = result.get(guess[i]);
      if (!previous || rank[mark] > rank[previous]) result.set(guess[i], mark);
    });
  }
  return result;
}
