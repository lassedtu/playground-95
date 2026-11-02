/**
 * Colours for painting ground textures from a logic layer (used by
 * scripts/three-four-go/paint-ground.mjs), and for the grass shown beyond
 * the map's edge, which has to match.
 *
 * Self-contained (no imports), so the scripts can use it with Node.
 */

type RGB = readonly [number, number, number];

/** Chequered grass, in squares of `GRASS_SQUARE` px lined up with the map. */
export const GRASS: RGB = [0x3c, 0x9c, 0x3c];
export const GRASS_DARK: RGB = [0x34, 0x90, 0x3a];
export const GRASS_SQUARE = 32;

export const ASPHALT: RGB = [0x6e, 0x6e, 0x6e];
/** Asphalt brightness varies by up to ± this much per pixel. */
export const ASPHALT_NOISE = 6;

/** Red and white kerbs along the road's edge, in `KERB_BLOCK` px blocks. */
export const KERB_RED: RGB = [0xd0, 0x20, 0x20];
export const KERB_WHITE: RGB = [0xf4, 0xf4, 0xf4];
export const KERB_WIDTH = 6;
export const KERB_BLOCK = 8;

/** Chequered finish line. */
export const FINISH_LIGHT: RGB = [0xf4, 0xf4, 0xf4];
export const FINISH_DARK: RGB = [0x10, 0x10, 0x10];
export const FINISH_SQUARE = 8;

export const WALL: RGB = [0x9a, 0x9a, 0x9a];
export const WALL_JOINT: RGB = [0x6a, 0x6a, 0x6a];
export const WALL_BLOCK = 16;

export const DIRT: RGB = [0xa0, 0x78, 0x40];
export const WATER: RGB = [0x2a, 0x5c, 0xc8];
export const BOOST: RGB = [0xff, 0x90, 0x20];
export const BOOST_STRIPE: RGB = [0xff, 0xe0, 0x40];

/** Grass colour at map pixel (x, y); also used beyond the map's edge. */
export function grassAt(x: number, y: number): RGB {
  return (Math.floor(x / GRASS_SQUARE) + Math.floor(y / GRASS_SQUARE)) % 2 ? GRASS_DARK : GRASS;
}
