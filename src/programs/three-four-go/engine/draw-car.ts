import { type Camera, project } from "./camera";
import { type Car, carCorners } from "./car";
import type { Vec2 } from "./vector";

/** Fills a polygon given in map coordinates; skipped if any point is behind the camera. */
function fillOnGround(ctx: CanvasRenderingContext2D, camera: Camera, points: Vec2[], color: string) {
  const screen = points.map((p) => project(camera, p.x, p.y));
  if (screen.some((s) => !s)) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  screen.forEach((s, i) => (i ? ctx.lineTo(s!.x, s!.y) : ctx.moveTo(s!.x, s!.y)));
  ctx.closePath();
  ctx.fill();
}

function lineOnGround(ctx: CanvasRenderingContext2D, camera: Camera, from: Vec2, to: Vec2, color: string) {
  const a = project(camera, from.x, from.y);
  const b = project(camera, to.x, to.y);
  if (!a || !b) return;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

/**
 * Stand-in for the car sprite (they come in a later step): the hitbox flat
 * on the ground in red, with a dark windscreen so you can see which way it
 * points.
 */
export function drawCarPlaceholder(ctx: CanvasRenderingContext2D, camera: Camera, car: Car, p: Vec2, heading: number) {
  fillOnGround(ctx, camera, carCorners(p, heading, car.length, car.width), "#e01010");
  const shift = car.length * 0.12;
  const windscreen = { x: p.x + Math.cos(heading) * shift, y: p.y + Math.sin(heading) * shift };
  fillOnGround(ctx, camera, carCorners(windscreen, heading, car.length * 0.22, car.width * 0.8), "#000060");
}

/** Debug overlay: hitbox outline, heading (blue) and velocity (green, 0.15 s ahead). */
export function drawCarDebug(ctx: CanvasRenderingContext2D, camera: Camera, car: Car, p: Vec2, heading: number) {
  ctx.lineWidth = 1;
  const corners = carCorners(p, heading, car.length, car.width);
  corners.forEach((corner, i) => lineOnGround(ctx, camera, corner, corners[(i + 1) % 4], "#ffff00"));
  lineOnGround(ctx, camera, p, { x: p.x + Math.cos(heading) * 20, y: p.y + Math.sin(heading) * 20 }, "#4040ff");
  lineOnGround(ctx, camera, p, { x: p.x + car.v.x * 0.15, y: p.y + car.v.y * 0.15 }, "#00ff00");
}
