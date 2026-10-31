/**
 * Memory game rules as pure functions: (state, action) -> new state.
 * Shuffling is the only randomness and happens in `deal`.
 */
import type { Difficulty } from "../data/difficulties";

export type CardState = "down" | "up" | "matched";

export type Card = {
  /** Position-independent identity, stable for the whole game. */
  id: number;
  iconId: string;
  state: CardState;
};

export type GameStatus = "ready" | "playing" | "won";

export type Game = {
  difficulty: Difficulty;
  cards: Card[];
  /** One move = turning over a pair of cards. */
  moves: number;
  pairsFound: number;
  status: GameStatus;
  /** Ids of two face-up cards that didn't match, waiting to be turned back. */
  mismatch: readonly [number, number] | null;
};

/** Fisher–Yates shuffle, returning a new array. */
function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** A new game: a random selection of icons, each twice, shuffled. */
export function deal(difficulty: Difficulty, iconIds: readonly string[], random = Math.random): Game {
  const pairs = (difficulty.columns * difficulty.rows) / 2;
  if (!Number.isInteger(pairs) || pairs > iconIds.length) {
    throw new Error(`Can't deal ${difficulty.columns}×${difficulty.rows} with ${iconIds.length} icons.`);
  }
  const chosen = shuffle(iconIds, random).slice(0, pairs);
  const cards = shuffle([...chosen, ...chosen], random).map((iconId, id) => ({
    id,
    iconId,
    state: "down" as const,
  }));
  return { difficulty, cards, moves: 0, pairsFound: 0, status: "ready", mismatch: null };
}

/** Turns a mismatched pair back face down. No-op if `pair` isn't the current mismatch. */
export function hideMismatch(game: Game, pair: readonly [number, number] | null = game.mismatch): Game {
  if (!game.mismatch || !pair || game.mismatch[0] !== pair[0] || game.mismatch[1] !== pair[1]) {
    return game;
  }
  return {
    ...game,
    mismatch: null,
    cards: game.cards.map((card) =>
      card.id === pair[0] || card.id === pair[1] ? { ...card, state: "down" } : card,
    ),
  };
}

/**
 * Turns a card face up. Returns the same object if the click does nothing
 * (game won, card already up or matched).
 *
 * Clicking while a mismatched pair is still showing turns that pair back
 * immediately, so nobody has to wait for the timeout.
 */
export function flipCard(game: Game, cardId: number): Game {
  if (game.status === "won") return game;
  const target = game.cards.find((card) => card.id === cardId);
  if (!target || target.state !== "down") return game;

  let next = hideMismatch(game);
  next = {
    ...next,
    status: "playing",
    cards: next.cards.map((card) => (card.id === cardId ? { ...card, state: "up" } : card)),
  };

  const faceUp = next.cards.filter((card) => card.state === "up");
  if (faceUp.length < 2) return next;

  const [a, b] = faceUp;
  const moves = next.moves + 1;
  if (a.iconId !== b.iconId) {
    return { ...next, moves, mismatch: [a.id, b.id] };
  }

  const pairsFound = next.pairsFound + 1;
  const won = pairsFound === next.cards.length / 2;
  return {
    ...next,
    moves,
    pairsFound,
    status: won ? "won" : "playing",
    cards: next.cards.map((card) =>
      card.id === a.id || card.id === b.id ? { ...card, state: "matched" } : card,
    ),
  };
}
