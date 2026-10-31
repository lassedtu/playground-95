/**
 * Minesweeper rules as pure functions: (game, action) → new game. Functions
 * return the same object when an action does nothing.
 */
import type { Level } from "../data/levels";

export type CellState = "hidden" | "flagged" | "question" | "revealed";

export type Cell = {
  mine: boolean;
  /** Mines in the 8 surrounding cells. */
  adjacent: number;
  state: CellState;
};

export type GameStatus = "ready" | "playing" | "won" | "lost";

export type Game = {
  level: Level;
  cells: Cell[];
  status: GameStatus;
  /** The mine that was clicked, shown red. */
  exploded: number | null;
  flags: number;
};

/** A fresh board. Mines are placed on the first reveal, so it's always safe. */
export function newGame(level: Level): Game {
  const cells = Array.from({ length: level.columns * level.rows }, () => ({
    mine: false,
    adjacent: 0,
    state: "hidden" as const,
  }));
  return { level, cells, status: "ready", exploded: null, flags: 0 };
}

export function neighbors(index: number, level: Level): number[] {
  const { columns, rows } = level;
  const row = Math.floor(index / columns);
  const column = index % columns;
  const result: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = column + dc;
      if (r >= 0 && r < rows && c >= 0 && c < columns) result.push(r * columns + c);
    }
  }
  return result;
}

/**
 * Places the mines, keeping the first clicked cell and its neighbours free
 * so the first click always opens an area (not just a single number).
 */
function placeMines(game: Game, safe: number, random: () => number): Cell[] {
  const { level } = game;
  const keepFree = new Set([safe, ...neighbors(safe, level)]);
  let candidates = game.cells.map((_, i) => i).filter((i) => !keepFree.has(i));
  // Tiny custom boards might not have room: then only keep the clicked cell free.
  if (candidates.length < level.mines) candidates = game.cells.map((_, i) => i).filter((i) => i !== safe);

  // Partial Fisher–Yates: the first `mines` entries become a random sample.
  for (let i = 0; i < level.mines; i++) {
    const j = i + Math.floor(random() * (candidates.length - i));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const mines = new Set(candidates.slice(0, level.mines));

  return game.cells.map((cell, i) => ({
    ...cell,
    mine: mines.has(i),
    adjacent: neighbors(i, level).filter((n) => mines.has(n)).length,
  }));
}

/** Reveals cells (flood-filling from empty ones), then checks for win or loss. */
function revealAll(game: Game, indices: number[]): Game {
  const cells = [...game.cells];
  const stack = [...indices];
  let exploded: number | null = null;

  while (stack.length) {
    const i = stack.pop()!;
    const cell = cells[i];
    if (cell.state === "revealed" || cell.state === "flagged") continue;
    cells[i] = { ...cell, state: "revealed" };
    if (cell.mine) {
      exploded ??= i;
      continue;
    }
    if (cell.adjacent === 0) stack.push(...neighbors(i, game.level));
  }

  if (exploded !== null) return { ...game, cells, status: "lost", exploded };

  const safeCells = cells.length - game.level.mines;
  const revealed = cells.filter((cell) => cell.state === "revealed").length;
  if (revealed === safeCells) {
    // Like the original: winning flags all remaining mines.
    return {
      ...game,
      status: "won",
      flags: game.level.mines,
      cells: cells.map((cell) => (cell.mine ? { ...cell, state: "flagged" } : cell)),
    };
  }
  return { ...game, cells, status: "playing" };
}

const isOver = (game: Game) => game.status === "won" || game.status === "lost";

/** Reveals a hidden (or ?) cell. The first reveal places the mines. */
export function reveal(game: Game, index: number, random = Math.random): Game {
  if (isOver(game)) return game;
  const state = game.cells[index]?.state;
  if (state !== "hidden" && state !== "question") return game;
  const started = game.status === "ready" ? { ...game, cells: placeMines(game, index, random) } : game;
  return revealAll(started, [index]);
}

/**
 * "Chording": on a revealed number whose flags are all placed, reveals all
 * its other neighbours at once. (A wrong flag means losing.)
 */
export function chord(game: Game, index: number): Game {
  if (game.status !== "playing") return game;
  const cell = game.cells[index];
  if (cell?.state !== "revealed" || cell.adjacent === 0) return game;
  const around = neighbors(index, game.level);
  const flagged = around.filter((n) => game.cells[n].state === "flagged").length;
  if (flagged !== cell.adjacent) return game;
  const toReveal = around.filter((n) => game.cells[n].state === "hidden" || game.cells[n].state === "question");
  return toReveal.length ? revealAll(game, toReveal) : game;
}

/** Right-click: hidden → flagged → ? (if marks are on) → hidden. */
export function cycleMark(game: Game, index: number, marks: boolean): Game {
  if (isOver(game)) return game;
  const cell = game.cells[index];
  if (!cell || cell.state === "revealed") return game;

  const next: CellState =
    cell.state === "hidden" ? "flagged" : cell.state === "flagged" && marks ? "question" : "hidden";
  const flags = game.flags + (next === "flagged" ? 1 : 0) - (cell.state === "flagged" ? 1 : 0);
  const cells = [...game.cells];
  cells[index] = { ...cell, state: next };
  return { ...game, cells, flags };
}
