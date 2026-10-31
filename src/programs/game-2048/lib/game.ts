/**
 * 2048 rules as pure functions. Tiles keep their id while they slide, so the
 * board can animate them to their new position.
 */
export const SIZE = 4;
export const WIN_VALUE = 2048;

export type Direction = "up" | "down" | "left" | "right";

export type Tile = {
  id: number;
  value: number;
  row: number;
  col: number;
  /** Just appeared (pop-in animation). */
  isNew?: boolean;
  /** Just merged (pulse animation). */
  merged?: boolean;
};

export type Game = {
  tiles: Tile[];
  score: number;
  /** Already reached 2048 (and chose to keep playing). */
  won: boolean;
  over: boolean;
  nextId: number;
};

/** Adds a 2 (90%) or 4 (10%) on a random empty cell. */
function spawn(game: Game, random: () => number): Game {
  const taken = new Set(game.tiles.map((t) => t.row * SIZE + t.col));
  const empty = Array.from({ length: SIZE * SIZE }, (_, i) => i).filter((i) => !taken.has(i));
  if (!empty.length) return game;
  const cell = empty[Math.floor(random() * empty.length)];
  const tile: Tile = {
    id: game.nextId,
    value: random() < 0.9 ? 2 : 4,
    row: Math.floor(cell / SIZE),
    col: cell % SIZE,
    isNew: true,
  };
  return { ...game, tiles: [...game.tiles, tile], nextId: game.nextId + 1 };
}

export function newGame(random = Math.random): Game {
  return spawn(spawn({ tiles: [], score: 0, won: false, over: false, nextId: 1 }, random), random);
}

function canMove(tiles: Tile[]): boolean {
  if (tiles.length < SIZE * SIZE) return true;
  const at = new Map(tiles.map((t) => [t.row * SIZE + t.col, t.value]));
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const value = at.get(r * SIZE + c);
      if (c + 1 < SIZE && at.get(r * SIZE + c + 1) === value) return true;
      if (r + 1 < SIZE && at.get((r + 1) * SIZE + c) === value) return true;
    }
  }
  return false;
}

/**
 * Slides all tiles towards `direction`, merging equal neighbours once per
 * move. Returns the same object if nothing could move.
 */
export function move(game: Game, direction: Direction, random = Math.random): Game {
  if (game.over) return game;
  const vertical = direction === "up" || direction === "down";
  const towardsStart = direction === "up" || direction === "left";

  const tiles: Tile[] = [];
  let score = game.score;
  let moved = false;

  for (let line = 0; line < SIZE; line++) {
    // Tiles in this row/column, ordered from the wall they slide towards.
    const inLine = game.tiles
      .filter((t) => (vertical ? t.col : t.row) === line)
      .sort((a, b) => {
        const pa = vertical ? a.row : a.col;
        const pb = vertical ? b.row : b.col;
        return towardsStart ? pa - pb : pb - pa;
      });

    let slot = 0;
    let last: Tile | null = null;
    for (const tile of inLine) {
      if (last && !last.merged && last.value === tile.value) {
        // Merge into the tile already placed; the other one disappears.
        last.value *= 2;
        last.merged = true;
        score += last.value;
        moved = true;
        continue;
      }
      const position = towardsStart ? slot : SIZE - 1 - slot;
      const placed: Tile = {
        id: tile.id,
        value: tile.value,
        row: vertical ? position : tile.row,
        col: vertical ? tile.col : position,
      };
      if (placed.row !== tile.row || placed.col !== tile.col) moved = true;
      tiles.push(placed);
      last = placed;
      slot++;
    }
  }

  if (!moved) return game;
  const next = spawn({ ...game, tiles, score }, random);
  return { ...next, over: !canMove(next.tiles) };
}

export const highestTile = (game: Game) => Math.max(0, ...game.tiles.map((t) => t.value));
