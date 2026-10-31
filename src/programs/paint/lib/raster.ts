/**
 * Pixel drawing without anti-aliasing, so lines and shapes stay crisp like
 * in the real Paint. Shapes call `plot` for every pixel, the caller decides
 * what a pixel is (e.g. a square "stamp" for thicker lines).
 */
export type Point = { x: number; y: number };
export type Plot = (x: number, y: number) => void;

/** Bresenham's line from a to b. */
export function line(a: Point, b: Point, plot: Plot) {
  let x0 = Math.round(a.x);
  let y0 = Math.round(a.y);
  const x1 = Math.round(b.x);
  const y1 = Math.round(b.y);
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  for (; ;) {
    plot(x0, y0);
    if (x0 === x1 && y0 === y1) return;
    const e2 = 2 * error;
    if (e2 >= dy) {
      error += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      error += dx;
      y0 += sy;
    }
  }
}

export function rectangle(a: Point, b: Point, plot: Plot) {
  const corners = [a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }];
  corners.forEach((corner, i) => line(corner, corners[(i + 1) % 4], plot));
}

/** The outline of the ellipse inside the box from a to b. */
export function ellipse(a: Point, b: Point, plot: Plot) {
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2;
  const rx = Math.abs(b.x - a.x) / 2;
  const ry = Math.abs(b.y - a.y) / 2;
  if (rx < 1 || ry < 1) return line(a, b, plot);
  // Enough steps that consecutive points are at most ~1 px apart.
  const steps = Math.max(16, Math.ceil(2 * Math.PI * Math.max(rx, ry)));
  let previous: Point = { x: cx + rx, y: cy };
  for (let i = 1; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const point = { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
    line(previous, point, plot);
    previous = point;
  }
}

/** Shift-drag: snaps a shape's end point to a square/circle, or a line to 45° steps. */
export function constrain(start: Point, end: Point, kind: "line" | "box"): Point {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (kind === "box") {
    const size = Math.max(Math.abs(dx), Math.abs(dy));
    return { x: start.x + Math.sign(dx || 1) * size, y: start.y + Math.sign(dy || 1) * size };
  }
  const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
  const length = Math.hypot(dx, dy);
  return { x: start.x + Math.round(Math.cos(angle) * length), y: start.y + Math.round(Math.sin(angle) * length) };
}

/** "#rrggbb" → packed RGBA as stored in a Uint32Array view of ImageData (little-endian). */
function packColor(hex: string): number {
  const value = parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

/** Fills the area of identical colour around a point (4-connected), like the paint bucket. */
export function floodFill(ctx: CanvasRenderingContext2D, start: Point, hex: string) {
  const { width, height } = ctx.canvas;
  const x0 = Math.floor(start.x);
  const y0 = Math.floor(start.y);
  if (x0 < 0 || y0 < 0 || x0 >= width || y0 >= height) return;

  const image = ctx.getImageData(0, 0, width, height);
  const pixels = new Uint32Array(image.data.buffer);
  const target = pixels[y0 * width + x0];
  const fill = packColor(hex);
  if (target === fill) return;

  // Scanline fill: fill a whole horizontal run, then queue the rows above and below.
  const stack = [x0, y0];
  while (stack.length) {
    const y = stack.pop()!;
    let x = stack.pop()!;
    while (x > 0 && pixels[y * width + x - 1] === target) x--;
    let above = false;
    let below = false;
    for (; x < width && pixels[y * width + x] === target; x++) {
      pixels[y * width + x] = fill;
      if (y > 0) {
        const match = pixels[(y - 1) * width + x] === target;
        if (match && !above) stack.push(x, y - 1);
        above = match;
      }
      if (y < height - 1) {
        const match = pixels[(y + 1) * width + x] === target;
        if (match && !below) stack.push(x, y + 1);
        below = match;
      }
    }
  }
  ctx.putImageData(image, 0, 0);
}

/** One burst of the airbrush: random dots within a circle. */
export function spray(center: Point, radius: number, plot: Plot, random = Math.random) {
  const dots = Math.ceil(radius * 1.5);
  for (let i = 0; i < dots; i++) {
    const angle = random() * 2 * Math.PI;
    const distance = Math.sqrt(random()) * radius; // even spread over the area
    plot(Math.round(center.x + Math.cos(angle) * distance), Math.round(center.y + Math.sin(angle) * distance));
  }
}
