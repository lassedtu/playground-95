import { type Camera, CENTER_Y, horizonRow, VIEW_HEIGHT, VIEW_WIDTH } from "./camera";
import type { Texture } from "./texture";

/** Distant ground fades into this colour (the sky's colour at the horizon). */
export type Fog = { color: number; start: number; end: number };

/** A parallax layer of the sky, back to front (see data/skies.ts). */
export type SkyLayer = Texture & { sink: number; loops: number };

/** Rows of haze around the horizon, fading towards the fog colour. */
const HAZE = 8;
/**
 * The sky also fills this many rows below the horizon: the distant ground
 * there fades into the scenery instead of into a flat fog colour.
 */
const SKIRT = 14;

/**
 * The sky: parallax layers wrapping all the way round, like a skybox. Each
 * layer is drawn pixel for pixel, sitting on the horizon (`sink` rows of its
 * bottom hidden behind the ground), and slides sideways as the camera turns:
 * once round in `loops` repeats, so further layers (fewer loops) move
 * slower. Above the top of a layer its top row continues. Draw the ground
 * after it.
 */
export function drawSky(out: Uint32Array, layers: readonly SkyLayer[], camera: Camera, fog: number) {
  const horizon = Math.round(horizonRow(camera));
  const bottom = Math.min(VIEW_HEIGHT, horizon + SKIRT);
  const turn = camera.angle / (2 * Math.PI);
  const fogR = fog & 0xff;
  const fogG = (fog >>> 8) & 0xff;
  const fogB = (fog >>> 16) & 0xff;

  layers.forEach((layer, index) => {
    const { width, height, pixels, sink, loops } = layer;
    const left = Math.floor(turn * loops * width - VIEW_WIDTH / 2);
    for (let y = 0; y < bottom; y++) {
      const row = y + height - horizon - sink;
      // The back layer fills the whole sky (its edge rows continue); the others only where they are.
      if (index > 0 && (row < 0 || row >= height)) continue;
      const offset = Math.min(height - 1, Math.max(0, row)) * width;
      for (let x = 0, i = y * VIEW_WIDTH; x < VIEW_WIDTH; x++, i++) {
        let column = (left + x) % width;
        if (column < 0) column += width;
        const color = pixels[offset + column];
        const alpha = color >>> 24;
        if (alpha === 255 || index === 0) {
          out[i] = color | 0xff000000;
        } else if (alpha > 0) {
          const below = out[i];
          const keep = 255 - alpha;
          const r = ((color & 0xff) * alpha + (below & 0xff) * keep) / 255;
          const g = (((color >>> 8) & 0xff) * alpha + ((below >>> 8) & 0xff) * keep) / 255;
          const b = (((color >>> 16) & 0xff) * alpha + ((below >>> 16) & 0xff) * keep) / 255;
          out[i] = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
        }
      }
    }
  });

  // Haze: the rows around the horizon fade part of the way towards the fog colour.
  for (let y = Math.max(0, horizon - HAZE); y < bottom; y++) {
    const f = Math.round(Math.min(1, (y - (horizon - HAZE) + 1) / (HAZE + 1)) * 140);
    const keep = 256 - f;
    for (let x = 0, i = y * VIEW_WIDTH; x < VIEW_WIDTH; x++, i++) {
      const c = out[i];
      const r = ((c & 0xff) * keep + fogR * f) >> 8;
      const g = (((c >>> 8) & 0xff) * keep + fogG * f) >> 8;
      const b = (((c >>> 16) & 0xff) * keep + fogB * f) >> 8;
      out[i] = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
    }
  }
}

/**
 * The ground below the horizon (Mode 7): each screen row is a straight line
 * across the map, at a distance that depends on the row and the camera's
 * tilt, so the map is sampled along that line, nearest pixel. Points off the
 * map show `outside` repeated (its size must be a power of two).
 */
export function drawGround(out: Uint32Array, ground: Texture, outside: Texture, camera: Camera, fog: Fog) {
  const { width, height, pixels } = ground;
  const tileMask = outside.width - 1;
  const tileShift = Math.log2(outside.width);
  const dirX = Math.cos(camera.angle);
  const dirY = Math.sin(camera.angle);
  // Screen-right on the map (map y points down).
  const rightX = -dirY;
  const rightY = dirX;
  const cosPitch = Math.cos(camera.pitch);
  const sinPitch = Math.sin(camera.pitch);
  const fogR = fog.color & 0xff;
  const fogG = (fog.color >>> 8) & 0xff;
  const fogB = (fog.color >>> 16) & 0xff;
  const horizon = Math.round(horizonRow(camera));

  for (let y = Math.max(0, horizon); y < VIEW_HEIGHT; y++) {
    // The ray through this row, in the camera's (tilted) frame: f forwards, `down` downwards.
    const down = y + 0.5 - CENTER_Y;
    const falling = camera.focal * sinPitch + down * cosPitch;
    if (falling <= 0) continue; // at or above the horizon
    // Map units per screen pixel along this row, and how far ahead the row is.
    const unit = camera.height / falling;
    const distance = unit * (camera.focal * cosPitch - down * sinPitch);
    const stepX = rightX * unit;
    const stepY = rightY * unit;
    let wx = camera.x + dirX * distance - stepX * (VIEW_WIDTH / 2 - 0.5);
    let wy = camera.y + dirY * distance - stepY * (VIEW_WIDTH / 2 - 0.5);
    // Fog amount for the whole row, 0–256. Near the horizon the ground fades
    // into the scenery the sky drew there; further down into the fog colour.
    const f = Math.round(Math.min(1, Math.max(0, (distance - fog.start) / (fog.end - fog.start))) * 256);
    const keep = 256 - f;
    const intoSky = y < horizon + SKIRT;

    for (let x = 0, i = y * VIEW_WIDTH; x < VIEW_WIDTH; x++, i++, wx += stepX, wy += stepY) {
      const tx = Math.floor(wx);
      const ty = Math.floor(wy);
      let color =
        tx >= 0 && ty >= 0 && tx < width && ty < height
          ? pixels[ty * width + tx]
          : outside.pixels[((ty & tileMask) << tileShift) | (tx & tileMask)];
      if (f) {
        const behind = intoSky ? out[i] : fog.color;
        const r = ((color & 0xff) * keep + (intoSky ? behind & 0xff : fogR) * f) >> 8;
        const g = (((color >>> 8) & 0xff) * keep + (intoSky ? (behind >>> 8) & 0xff : fogG) * f) >> 8;
        const b = (((color >>> 16) & 0xff) * keep + (intoSky ? (behind >>> 16) & 0xff : fogB) * f) >> 8;
        color = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
      }
      out[i] = color;
    }
  }
}
