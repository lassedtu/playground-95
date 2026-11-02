import { GRASS_SQUARE, grassAt } from "../data/ground-style";
import { seededRandom } from "./random";
import { makeCanvas, rgb, type Texture, textureFromCanvas } from "./texture";

/** The sky's lowest colour (#b4d4f0); distant ground fades into it. */
export const SKY_BOTTOM = rgb(0xb4, 0xd4, 0xf0);
/** Rows of haze at the bottom of the sky strip, over the hills. */
const HAZE = 14;

/** Grass beyond the map's edge, tiled; lines up with the painted grass on the map. */
export function makeOutsideTile(): Texture {
  const size = GRASS_SQUARE * 2;
  const pixels = new Uint32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) pixels[y * size + x] = rgb(...grassAt(x, y));
  }
  return { width: size, height: size, pixels };
}

/**
 * Sky strip: Win95-ish blue with clouds, and far hills along the bottom.
 * Everything wraps around seamlessly (clouds are drawn twice near the seam,
 * hills use whole numbers of waves across the width).
 */
export function makeDefaultSky(): Texture {
  const width = 1024;
  const height = 72;
  const { canvas, ctx } = makeCanvas(width, height);

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#1f5fbf");
  gradient.addColorStop(1, "#b4d4f0");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const random = seededRandom(3);
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 14; i++) {
    const x = random() * width;
    const y = 8 + random() * 30;
    const w = 24 + random() * 40;
    for (const offset of [-width, 0, width]) {
      for (let puff = 0; puff < 4; puff++) {
        ctx.beginPath();
        ctx.ellipse(x + offset + (puff - 1.5) * w * 0.35, y + (puff % 2) * 3, w * 0.3, 6 + (puff % 2) * 3, 0, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }

  // Two rows of hills: far (bluish) and near (green).
  const hills = (base: number, amplitude: number, waves: number[], color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 4) {
      const t = (x / width) * 2 * Math.PI;
      const y = base - amplitude * waves.reduce((sum, n, k) => sum + Math.sin(t * n + k * 1.7) / (k + 1), 0);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.fill();
  };
  hills(height - 14, 6, [3, 7, 13], "#7d9cb4");
  hills(height - 5, 4, [5, 11, 19], "#3f7f3a");

  // Haze over the foot of the hills, ending in the fog colour, so they fade
  // into the far ground (which fades into the same colour) instead of
  // stopping at a hard line.
  const haze = ctx.createLinearGradient(0, height - HAZE, 0, height);
  haze.addColorStop(0, "rgb(180 212 240 / 0)");
  haze.addColorStop(1, "rgb(180 212 240 / 1)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, height - HAZE, width, HAZE);

  return textureFromCanvas(canvas);
}
