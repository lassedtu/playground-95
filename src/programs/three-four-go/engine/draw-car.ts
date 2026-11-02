import { type Camera, project } from "./camera";
import { type Car, carCorners } from "./car";
import type { Vec2 } from "./vector";

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

/** Debug overlay: hitbox outline, heading (blue) and velocity (green, 0.15 s ahead). */
export function drawCarDebug(ctx: CanvasRenderingContext2D, camera: Camera, car: Car, p: Vec2, heading: number) {
  ctx.lineWidth = 1;
  const corners = carCorners(p, heading, car.length, car.width);
  corners.forEach((corner, i) => lineOnGround(ctx, camera, corner, corners[(i + 1) % 4], "#ffff00"));
  lineOnGround(ctx, camera, p, { x: p.x + Math.cos(heading) * 20, y: p.y + Math.sin(heading) * 20 }, "#4040ff");
  lineOnGround(ctx, camera, p, { x: p.x + car.v.x * 0.15, y: p.y + car.v.y * 0.15 }, "#00ff00");
}

/** Debug overlay: recent collision contacts (red) with the direction they pushed. */
export function drawContacts(ctx: CanvasRenderingContext2D, camera: Camera, contacts: { p: Vec2; normal: Vec2 }[]) {
  ctx.lineWidth = 1;
  for (const { p, normal } of contacts) {
    lineOnGround(ctx, camera, p, { x: p.x + normal.x * 8, y: p.y + normal.y * 8 }, "#ff2020");
  }
}

/** Debug overlay: what a CPU sees, its whiskers (green clear, red touching the edge) and its target (cross). */
export function drawCpuDebug(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  seen: { target: Vec2; whiskers: { from: Vec2; to: Vec2; blocked: boolean }[] },
) {
  ctx.lineWidth = 1;
  for (const w of seen.whiskers) lineOnGround(ctx, camera, w.from, w.to, w.blocked ? "#ff4040" : "#40ff40");
  const { x, y } = seen.target;
  lineOnGround(ctx, camera, { x: x - 4, y: y - 4 }, { x: x + 4, y: y + 4 }, "#ff00ff");
  lineOnGround(ctx, camera, { x: x - 4, y: y + 4 }, { x: x + 4, y: y - 4 }, "#ff00ff");
}
