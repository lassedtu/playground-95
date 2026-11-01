import { DAILY, LEVELS, LEVELS_PER_TIER, type Puzzle, TIER_NAMES } from "../data/levels";
import { CARS, HERO, TRUCKS, type VehicleSprite } from "../data/vehicles";
import type { Piece } from "./board";

export type Mode = { kind: "level"; index: number } | { kind: "daily"; day: number };

/** Day number in the player's local time zone, so the daily changes at their midnight. */
export function dayNumber(date = new Date()): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

/** Daily puzzles count from here in the share text ("Traffic Jam #1"). */
export const FIRST_DAY = dayNumber(new Date(2026, 10, 1));

export const dailyNumber = (day: number) => day - FIRST_DAY + 1;

export function puzzleFor(mode: Mode): Puzzle {
  if (mode.kind === "level") return LEVELS[mode.index];
  return DAILY[((mode.day - FIRST_DAY) % DAILY.length + DAILY.length) % DAILY.length];
}

export const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export const tierOf = (index: number) => TIER_NAMES[Math.floor(index / LEVELS_PER_TIER)];

export function modeTitle(mode: Mode) {
  return mode.kind === "level"
    ? `Level ${mode.index + 1} (${tierOf(mode.index)})`
    : `Daily Puzzle #${dailyNumber(mode.day)}`;
}

export type Direction = "east" | "west" | "north" | "south";
export type Look = { sprite: VehicleSprite; direction: Direction };

/**
 * Which picture each vehicle gets: the red sports car for the red car, the
 * others shuffled per board (seeded by it, so a level always looks the same)
 * without repeats until a list runs out.
 */
export function vehicleLooks(board: string, pieces: readonly Piece[]): Look[] {
  let seed = [...board].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const random = () => {
    seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
    return seed / 2_147_483_648;
  };
  const shuffled = (list: readonly VehicleSprite[]) => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const cars = shuffled(CARS);
  const trucks = shuffled(TRUCKS);
  let car = 0;
  let truck = 0;
  return pieces.map((piece, i): Look => {
    if (i === 0) return { sprite: HERO, direction: "east" };
    const sprite = piece.length === 3 ? trucks[truck++ % trucks.length] : cars[car++ % cars.length];
    const flip = random() < 0.5;
    return { sprite, direction: piece.horizontal ? (flip ? "west" : "east") : flip ? "north" : "south" };
  });
}
