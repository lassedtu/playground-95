/**
 * The logic layer's colours. Every track has a `logic.png` the same size as
 * its ground texture, painted only in these colours:
 *
 *   #808080 road           #00FF00 grass (slow)    #FFFF00 dirt (slower)
 *   #000000 wall (solid)   #0000FF out of bounds   #FFFFFF finish line
 *   #FF00nn checkpoint nn (1–254, in driving order) #FF8000 boost pad
 *
 * The finish line and checkpoints are thin stripes that can cross both road
 * and grass: the surface under them is whatever is next to the stripe.
 *
 * Self-contained (no imports), so the track scripts can use it with Node.
 */

export const SURFACE = {
  road: 0,
  grass: 1,
  dirt: 2,
  wall: 3,
  out: 4,
  finish: 5,
  checkpoint: 6,
  boost: 7,
} as const;

export type SurfaceCode = (typeof SURFACE)[keyof typeof SURFACE];

/** The fixed colours (checkpoints are the #FF00nn family on top of these). */
export const PALETTE: readonly { surface: SurfaceCode; rgb: readonly [number, number, number] }[] = [
  { surface: SURFACE.road, rgb: [0x80, 0x80, 0x80] },
  { surface: SURFACE.grass, rgb: [0x00, 0xff, 0x00] },
  { surface: SURFACE.dirt, rgb: [0xff, 0xff, 0x00] },
  { surface: SURFACE.wall, rgb: [0x00, 0x00, 0x00] },
  { surface: SURFACE.out, rgb: [0x00, 0x00, 0xff] },
  { surface: SURFACE.finish, rgb: [0xff, 0xff, 0xff] },
  { surface: SURFACE.boost, rgb: [0xff, 0x80, 0x00] },
];

/** Colour of checkpoint `n` (1–254). The finish line is checkpoint 0. */
export const checkpointColor = (n: number): [number, number, number] => [0xff, 0x00, n];

/** How far to look beside a stripe for the surface under it. */
const STRIPE_SEARCH = 16;

export type Logic = {
  width: number;
  height: number;
  /** Surface per pixel: never `finish` or `checkpoint` (those take the surface beside them). */
  surfaces: Uint8Array;
  /** 0 = finish line, n = checkpoint n, −1 = neither. */
  checkpoints: Int16Array;
  /** Pixels that weren't exactly a palette colour, and the first few of them. */
  inexact: number;
  examples: { x: number; y: number; rgb: [number, number, number] }[];
};

/**
 * Reads a logic layer from raw pixels (`channels` = 3 for RGB, 4 for RGBA)
 * into surfaces and checkpoints.
 */
export function readLogic(width: number, height: number, data: ArrayLike<number>, channels: 3 | 4): Logic {
  const surfaces = new Uint8Array(width * height);
  const checkpoints = new Int16Array(width * height);
  const examples: Logic["examples"] = [];
  let inexact = 0;
  for (let i = 0; i < width * height; i++) {
    const r = data[i * channels];
    const g = data[i * channels + 1];
    const b = data[i * channels + 2];
    const { surface, checkpoint, error } = classify(r, g, b);
    surfaces[i] = surface;
    checkpoints[i] = checkpoint;
    if (error > 0) {
      inexact++;
      if (examples.length < 5) examples.push({ x: i % width, y: Math.floor(i / width), rgb: [r, g, b] });
    }
  }

  // Stripes take the surface of the nearest non-stripe pixel left, right, above or below.
  const isStripe = (s: number) => s === SURFACE.finish || s === SURFACE.checkpoint;
  const resolved = surfaces.slice();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!isStripe(surfaces[i])) continue;
      let found: number = SURFACE.road;
      search: for (let d = 1; d <= STRIPE_SEARCH; d++) {
        for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const s = surfaces[ny * width + nx];
          if (!isStripe(s)) {
            found = s;
            break search;
          }
        }
      }
      resolved[i] = found;
    }
  }
  return { width, height, surfaces: resolved, checkpoints, inexact, examples };
}

/**
 * What a logic-layer pixel means. Snaps to the nearest palette colour, so a
 * slight colour shift (e.g. from a colour profile) doesn't break a track.
 * `checkpoint` is 0 for the finish line, n for checkpoint n, −1 otherwise.
 * `error` is how far the pixel was from that colour (0 = exact).
 */
export function classify(r: number, g: number, b: number) {
  let surface: SurfaceCode = SURFACE.grass;
  let best = Infinity;
  for (const entry of PALETTE) {
    const [pr, pg, pb] = entry.rgb;
    const distance = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (distance < best) {
      best = distance;
      surface = entry.surface;
    }
  }
  // #FF00nn: the blue channel is the checkpoint number itself.
  const checkpointDistance = (r - 0xff) ** 2 + g ** 2;
  if (b >= 1 && b <= 254 && checkpointDistance < best) {
    return { surface: SURFACE.checkpoint, checkpoint: b, error: Math.sqrt(checkpointDistance) };
  }
  return { surface, checkpoint: surface === SURFACE.finish ? 0 : -1, error: Math.sqrt(best) };
}
