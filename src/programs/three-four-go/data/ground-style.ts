/**
 * How each track's ground is painted from its logic layer (by
 * scripts/three-four-go/paint-ground.mjs), and what lies beyond the map's
 * edge in the game, which has to match.
 *
 * Self-contained (no imports), so the scripts can use it with Node.
 */

type RGB = readonly [number, number, number];

export type GroundTheme = {
  /** Off the road: two colours in a chequer of `square` px (0 = no chequer), with per-pixel noise. */
  offRoad: { light: RGB; dark: RGB; square: number; noise: number };
  /** The road surface. */
  road: { color: RGB; noise: number; pattern: "asphalt" | "cobbles" | "dirt" };
  /** Blocks along the road's edge. */
  kerb: { a: RGB; b: RGB; width: number; block: number };
  wall: { color: RGB; joint: RGB };
  water: RGB;
  /** What the game shows beyond the map's edge. */
  beyond: "offRoad" | "water";
};

const FINISH_LIGHT: RGB = [0xf4, 0xf4, 0xf4];
const FINISH_DARK: RGB = [0x10, 0x10, 0x10];
export const FINISH_SQUARE = 8;
export const FINISH = { light: FINISH_LIGHT, dark: FINISH_DARK };
export const WALL_BLOCK = 16;
export const DIRT: RGB = [0xa0, 0x78, 0x40];
export const BOOST: RGB = [0xff, 0x90, 0x20];
export const BOOST_STRIPE: RGB = [0xff, 0xe0, 0x40];

export const THEMES: Record<string, GroundTheme> = {
  /** Green fields and a cobbled road below the castle. */
  castle: {
    offRoad: { light: [0x48, 0x9c, 0x3c], dark: [0x40, 0x90, 0x38], square: 32, noise: 6 },
    road: { color: [0x8a, 0x82, 0x78], noise: 8, pattern: "cobbles" },
    kerb: { a: [0xb0, 0x30, 0x24], b: [0xe8, 0xe0, 0xd0], width: 5, block: 8 },
    wall: { color: [0x9a, 0x92, 0x88], joint: [0x6a, 0x64, 0x5c] },
    water: [0x2a, 0x5c, 0xc8],
    beyond: "offRoad",
  },
  /** Snow everywhere, a dark road with candy-cane kerbs. */
  snow: {
    offRoad: { light: [0xec, 0xf2, 0xfa], dark: [0xdc, 0xe6, 0xf4], square: 32, noise: 5 },
    road: { color: [0x5a, 0x60, 0x6c], noise: 7, pattern: "asphalt" },
    kerb: { a: [0xd0, 0x20, 0x28], b: [0xfa, 0xfa, 0xfa], width: 5, block: 6 },
    wall: { color: [0xb8, 0xc4, 0xd4], joint: [0x8a, 0x96, 0xa8] },
    water: [0x40, 0x70, 0xb0],
    beyond: "offRoad",
  },
  /** Sand dunes by the sea, an asphalt road with white and blue kerbs. */
  coast: {
    offRoad: { light: [0xe4, 0xd2, 0xa4], dark: [0xd8, 0xc4, 0x94], square: 0, noise: 9 },
    road: { color: [0x6c, 0x6c, 0x70], noise: 6, pattern: "asphalt" },
    kerb: { a: [0xf4, 0xf4, 0xf4], b: [0x28, 0x64, 0xc0], width: 5, block: 8 },
    wall: { color: [0xa8, 0xa0, 0x90], joint: [0x78, 0x70, 0x64] },
    water: [0x22, 0x78, 0xc8],
    beyond: "water",
  },
  /** Dry prairie grass and a dusty dirt road. */
  prairie: {
    offRoad: { light: [0xc8, 0xa8, 0x5c], dark: [0xbc, 0x9c, 0x54], square: 32, noise: 10 },
    road: { color: [0x9a, 0x70, 0x48], noise: 9, pattern: "dirt" },
    kerb: { a: [0x7a, 0x50, 0x30], b: [0xe4, 0xd4, 0xb0], width: 5, block: 10 },
    wall: { color: [0x8a, 0x64, 0x40], joint: [0x5c, 0x40, 0x28] },
    water: [0x3a, 0x70, 0xb0],
    beyond: "offRoad",
  },
};

/** Small fixed per-pixel noise, −1 to 1. */
export function noise(x: number, y: number) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (((h ^ (h >>> 16)) >>> 0) / 4294967295) * 2 - 1;
}

const shade = ([r, g, b]: RGB, amount: number): RGB =>
  [r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c + amount)))) as unknown as RGB;

/** Off-road colour at map pixel (x, y); also used beyond the map's edge. */
export function offRoadAt(theme: GroundTheme, x: number, y: number): RGB {
  const { light, dark, square, noise: amount } = theme.offRoad;
  const base = square && (Math.floor(x / square) + Math.floor(y / square)) % 2 ? dark : light;
  return shade(base, noise(x, y) * amount);
}

/** Road colour at map pixel (x, y). */
export function roadAt(theme: GroundTheme, x: number, y: number): RGB {
  const { color, noise: amount, pattern } = theme.road;
  if (pattern === "cobbles") {
    // Rows of 6×4 stones, every other row shifted by half a stone, with darker gaps.
    const row = Math.floor(y / 4);
    const sx = x + (row % 2) * 3;
    if (y % 4 === 3 || sx % 6 === 5) return shade(color, -26);
    return shade(color, noise(Math.floor(sx / 6), row) * 12 + noise(x, y) * 3);
  }
  if (pattern === "dirt") return shade(color, noise(x, y) * amount + noise(x >> 3, y >> 3) * 6);
  return shade(color, noise(x, y) * amount);
}
