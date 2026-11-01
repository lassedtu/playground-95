/**
 * Traffic Jam rules: a 6×6 grid of cars (2 cells) and trucks (3 cells) that
 * slide along their own lane. The red car (always piece 0) escapes through
 * the gap on the right of row 3.
 *
 * Self-contained (no imports, erasable TypeScript only) so the level-picking
 * script in `scripts/traffic-jam/` can run it directly with Node.
 */

export const SIZE = 6;
/** Row (0-based) of the red car and the exit. */
export const EXIT_ROW = 2;
/** Column the red car's left end reaches when it's at the exit. */
const GOAL_COL = SIZE - 2;

export type Piece = {
  /** Letter from the puzzle description; "A" is the red car. */
  id: string;
  length: number;
  horizontal: boolean;
  row: number;
  col: number;
};

/** One move: piece index and where its top/left end ends up (column or row). */
export type Move = { piece: number; to: number };

/**
 * Parses a 36-character board in row-major order (Fogleman's format):
 * "o" or "." = empty, "A" = red car, other letters = vehicles.
 */
export function parseBoard(description: string): Piece[] {
  if (description.length !== SIZE * SIZE) throw new Error(`Board must be ${SIZE * SIZE} characters`);
  const cells = new Map<string, number[]>();
  [...description].forEach((char, index) => {
    if (char === "o" || char === ".") return;
    if (!/^[A-Z]$/.test(char)) throw new Error(`Unsupported cell "${char}"`);
    cells.set(char, [...(cells.get(char) ?? []), index]);
  });
  const pieces = [...cells].map(([id, indexes]): Piece => {
    const first = indexes[0];
    const row = Math.floor(first / SIZE);
    const col = first % SIZE;
    const horizontal = indexes.length > 1 && indexes[1] === first + 1;
    return { id, length: indexes.length, horizontal, row, col };
  });
  pieces.sort((a, b) => (a.id === "A" ? -1 : b.id === "A" ? 1 : a.id.localeCompare(b.id)));
  const red = pieces[0];
  if (red?.id !== "A" || !red.horizontal || red.row !== EXIT_ROW) throw new Error("No red car on the exit row");
  return pieces;
}

/** Position along the piece's own lane (column if horizontal, row if vertical). */
export const offsetOf = (piece: Piece) => (piece.horizontal ? piece.col : piece.row);

/** Each cell's piece index, or -1 when empty. */
export function occupancy(pieces: readonly Piece[]): Int8Array {
  const grid = new Int8Array(SIZE * SIZE).fill(-1);
  pieces.forEach((p, i) => {
    for (let k = 0; k < p.length; k++) {
      grid[(p.row + (p.horizontal ? 0 : k)) * SIZE + p.col + (p.horizontal ? k : 0)] = i;
    }
  });
  return grid;
}

/** How far piece `i` can slide: the lowest and highest offset it can reach. */
export function slideRange(pieces: readonly Piece[], i: number, grid = occupancy(pieces)) {
  const p = pieces[i];
  const at = (offset: number) => (p.horizontal ? p.row * SIZE + offset : offset * SIZE + p.col);
  const start = offsetOf(p);
  let min = start;
  while (min > 0 && grid[at(min - 1)] === -1) min--;
  let max = start;
  while (max + p.length < SIZE && grid[at(max + p.length)] === -1) max++;
  return { min, max };
}

export function applyMove(pieces: readonly Piece[], { piece, to }: Move): Piece[] {
  return pieces.map((p, i) => (i !== piece ? p : p.horizontal ? { ...p, col: to } : { ...p, row: to }));
}

export const isSolved = (pieces: readonly Piece[]) => pieces[0].col === GOAL_COL;

/** Stable text form of a position, for comparing states. */
export const boardKey = (pieces: readonly Piece[]) => pieces.map(offsetOf).join("");

/**
 * Shortest solution (fewest moves, where sliding one vehicle any distance is
 * one move) by breadth-first search over every reachable position, or null
 * when there is none. Offsets are packed into one number per state (base 6),
 * which keeps even the largest puzzles (~500k positions) fast.
 */
export function solve(start: readonly Piece[]): Move[] | null {
  if (isSolved(start)) return [];
  const n = start.length;
  const weights = Array.from({ length: n }, (_, i) => SIZE ** i);
  const encode = (offsets: number[]) => offsets.reduce((sum, o, i) => sum + o * weights[i], 0);
  const decode = (key: number) => {
    const offsets: number[] = [];
    for (let i = 0; i < n; i++) {
      offsets.push(key % SIZE);
      key = Math.floor(key / SIZE);
    }
    return offsets;
  };
  const withOffsets = (offsets: number[]) =>
    start.map((p, i): Piece => (p.horizontal ? { ...p, col: offsets[i] } : { ...p, row: offsets[i] }));

  const startKey = encode(start.map(offsetOf));
  // Each state's predecessor and the move that led to it.
  const parent = new Map<number, { from: number; move: Move }>();
  const seen = new Set([startKey]);
  let queue = [startKey];

  while (queue.length) {
    const next: number[] = [];
    for (const key of queue) {
      const offsets = decode(key);
      const pieces = withOffsets(offsets);
      const grid = occupancy(pieces);
      for (let i = 0; i < n; i++) {
        const { min, max } = slideRange(pieces, i, grid);
        for (let to = min; to <= max; to++) {
          if (to === offsets[i]) continue;
          const childKey = key + (to - offsets[i]) * weights[i];
          if (seen.has(childKey)) continue;
          seen.add(childKey);
          parent.set(childKey, { from: key, move: { piece: i, to } });
          if (i === 0 && to === GOAL_COL) {
            const moves: Move[] = [];
            for (let k = childKey; k !== startKey; k = parent.get(k)!.from) moves.push(parent.get(k)!.move);
            return moves.reverse();
          }
          next.push(childKey);
        }
      }
    }
    queue = next;
  }
  return null;
}
