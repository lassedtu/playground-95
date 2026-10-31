import { FREE_SQUARE, SQUARES } from "../data/squares";

export const SIZE = 5;
export const CENTER = Math.floor((SIZE * SIZE) / 2);

/** No look-alikes (0/O, 1/I/L), so codes are easy to read out loud. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 5;

export function randomCode(random = Math.random): string {
  return Array.from({ length: CODE_LENGTH }, () => ALPHABET[Math.floor(random() * ALPHABET.length)]).join("");
}

/** Cleans up a typed code; null if it can't be one. */
export function normalizeCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return code.length === CODE_LENGTH && [...code].every((c) => ALPHABET.includes(c)) ? code : null;
}

/** A seeded random generator (mulberry32), so a code always gives the same card. */
function seeded(code: string) {
  let seed = 0;
  for (const char of code) seed = (Math.imul(seed, 31) + char.charCodeAt(0)) | 0;
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The 25 squares for a code, row by row, with the free square in the middle. */
export function cardFor(code: string): string[] {
  const random = seeded(code);
  const pool: string[] = [...SQUARES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const squares = pool.slice(0, SIZE * SIZE - 1);
  squares.splice(CENTER, 0, FREE_SQUARE);
  return squares;
}

/** All rows, columns and both diagonals, as lists of square indices. */
export const LINES: number[][] = (() => {
  const range = Array.from({ length: SIZE }, (_, i) => i);
  return [
    ...range.map((r) => range.map((c) => r * SIZE + c)),
    ...range.map((c) => range.map((r) => r * SIZE + c)),
    range.map((i) => i * SIZE + i),
    range.map((i) => i * SIZE + (SIZE - 1 - i)),
  ];
})();

export function completedLines(marked: ReadonlySet<number>): number[][] {
  return LINES.filter((line) => line.every((i) => marked.has(i)));
}
