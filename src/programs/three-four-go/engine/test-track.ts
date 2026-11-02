import { seededRandom } from "./random";
import { makeCanvas, rgb, type Texture, textureFromCanvas } from "./texture";

/**
 * A generated stand-in track for building the engine: a rounded-rectangle
 * circuit on chequered grass, with kerbs, a centre line, a finish line and
 * some trees for depth. Replaced by real two-layer tracks in a later step.
 */
const MAP = 1024;
const ROAD_WIDTH = 72;
const LOOP = { x: 132, y: 232, width: 760, height: 560, radius: 200 };
const GRASS = "#3c9c3c";
const GRASS_DARK = "#34903a";
const TILE = 32;

export const SKY_BOTTOM = rgb(0xb4, 0xd4, 0xf0);

/** Where the camera starts: on the top straight, facing along it (east). */
export const TEST_START = { x: LOOP.x + LOOP.width / 2 - 80, y: LOOP.y, angle: 0 };

function loopPath() {
  const path = new Path2D();
  path.roundRect(LOOP.x, LOOP.y, LOOP.width, LOOP.height, LOOP.radius);
  return path;
}

function paintGrass(ctx: CanvasRenderingContext2D, size: number) {
  ctx.fillStyle = GRASS;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = GRASS_DARK;
  for (let y = 0; y < size; y += TILE) {
    for (let x = (y / TILE) % 2 ? 0 : TILE; x < size; x += TILE * 2) ctx.fillRect(x, y, TILE, TILE);
  }
}

function paintTree(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = "#1e5a1e";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = "#2f7a2a";
  ctx.beginPath();
  ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.6, 0, 2 * Math.PI);
  ctx.fill();
}

export function makeTestGround(): Texture {
  const { canvas, ctx } = makeCanvas(MAP, MAP);
  paintGrass(ctx, MAP);
  const path = loopPath();

  // Kerbs: red under white dashes, slightly wider than the road.
  ctx.lineWidth = ROAD_WIDTH + 12;
  ctx.strokeStyle = "#d02020";
  ctx.stroke(path);
  ctx.setLineDash([16, 16]);
  ctx.strokeStyle = "#f4f4f4";
  ctx.stroke(path);

  // Asphalt and the dashed centre line.
  ctx.setLineDash([]);
  ctx.lineWidth = ROAD_WIDTH;
  ctx.strokeStyle = "#6e6e6e";
  ctx.stroke(path);
  ctx.setLineDash([24, 24]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#e8e8e8";
  ctx.stroke(path);
  ctx.setLineDash([]);

  // Chequered finish line across the top straight.
  const finishX = LOOP.x + LOOP.width / 2;
  const square = 8;
  for (let row = 0; row < ROAD_WIDTH / square; row++) {
    for (let column = 0; column < 2; column++) {
      ctx.fillStyle = (row + column) % 2 ? "#101010" : "#f4f4f4";
      ctx.fillRect(finishX + column * square, LOOP.y - ROAD_WIDTH / 2 + row * square, square, square);
    }
  }

  // Trees in the infield and around the outside, clear of the road.
  const random = seededRandom(95);
  for (let i = 0; i < 26; i++) {
    paintTree(ctx, 280 + random() * 464, 380 + random() * 264, 10 + random() * 10);
  }
  for (let i = 0; i < 60; i++) {
    const side = Math.floor(random() * 4);
    const along = 40 + random() * (MAP - 80);
    const across = 20 + random() * 60;
    const [x, y] =
      side === 0 ? [along, across] : side === 1 ? [along, MAP - across] : side === 2 ? [across, along] : [MAP - across, along];
    paintTree(ctx, x, y, 10 + random() * 12);
  }

  return textureFromCanvas(canvas);
}

/** Grass beyond the map's edge, tiled. */
export function makeTestOutside(): Texture {
  const { canvas, ctx } = makeCanvas(TILE * 2, TILE * 2);
  paintGrass(ctx, TILE * 2);
  return textureFromCanvas(canvas);
}

/**
 * Sky strip: Win95-ish blue with clouds, and far hills along the bottom.
 * Everything wraps around seamlessly (clouds are drawn twice near the seam,
 * hills use whole numbers of waves across the width).
 */
export function makeTestSky(): Texture {
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

  return textureFromCanvas(canvas);
}
