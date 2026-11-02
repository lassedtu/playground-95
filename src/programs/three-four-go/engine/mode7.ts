import { type Camera, VIEW_HEIGHT, VIEW_WIDTH } from "./camera";
import type { Texture } from "./texture";

/** Distant ground fades into this colour (usually the sky's lowest row). */
export type Fog = { color: number; start: number; end: number };

/**
 * The sky above the horizon: a strip that wraps around the full circle and
 * sits on the horizon. Its scroll speed matches the ground's rotation for
 * any strip width, so it looks infinitely far away. Rows above the strip
 * repeat its top row.
 */
export function drawSky(out: Uint32Array, sky: Texture, camera: Camera) {
  const { width, height, pixels } = sky;
  const horizon = Math.min(VIEW_HEIGHT, camera.horizon);
  // Sky pixels per screen pixel, and where the screen's centre column points.
  const scale = width / (2 * Math.PI * camera.focal);
  const centre = (camera.angle / (2 * Math.PI)) * width;
  for (let y = 0; y < horizon; y++) {
    const row = Math.max(0, height - (horizon - y)) * width;
    let sx = centre - (VIEW_WIDTH / 2) * scale;
    for (let x = 0, i = y * VIEW_WIDTH; x < VIEW_WIDTH; x++, i++, sx += scale) {
      const column = Math.floor(sx) % width;
      out[i] = pixels[row + (column < 0 ? column + width : column)];
    }
  }
}

/**
 * The ground below the horizon (Mode 7): each screen row is a straight line
 * across the map at a distance that depends on the row, so the map is
 * sampled along that line, nearest pixel. Points off the map show `outside`
 * repeated (its size must be a power of two).
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
  const fogR = fog.color & 0xff;
  const fogG = (fog.color >>> 8) & 0xff;
  const fogB = (fog.color >>> 16) & 0xff;

  for (let y = Math.max(0, camera.horizon); y < VIEW_HEIGHT; y++) {
    const distance = (camera.height * camera.focal) / (y + 0.5 - camera.horizon);
    const stepX = (rightX * distance) / camera.focal;
    const stepY = (rightY * distance) / camera.focal;
    let wx = camera.x + dirX * distance - stepX * (VIEW_WIDTH / 2 - 0.5);
    let wy = camera.y + dirY * distance - stepY * (VIEW_WIDTH / 2 - 0.5);
    // Fog amount for the whole row, 0–256.
    const f = Math.round(Math.min(1, Math.max(0, (distance - fog.start) / (fog.end - fog.start))) * 256);
    const keep = 256 - f;

    for (let x = 0, i = y * VIEW_WIDTH; x < VIEW_WIDTH; x++, i++, wx += stepX, wy += stepY) {
      const tx = Math.floor(wx);
      const ty = Math.floor(wy);
      let color =
        tx >= 0 && ty >= 0 && tx < width && ty < height
          ? pixels[ty * width + tx]
          : outside.pixels[((ty & tileMask) << tileShift) | (tx & tileMask)];
      if (f) {
        const r = ((color & 0xff) * keep + fogR * f) >> 8;
        const g = (((color >>> 8) & 0xff) * keep + fogG * f) >> 8;
        const b = (((color >>> 16) & 0xff) * keep + fogB * f) >> 8;
        color = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
      }
      out[i] = color;
    }
  }
}
