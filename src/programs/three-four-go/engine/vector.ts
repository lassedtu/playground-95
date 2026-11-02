/** A point or direction on the map (y grows downwards, like the images). */
export type Vec2 = { x: number; y: number };

export const vec = (x: number, y: number): Vec2 => ({ x, y });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });
export const dot = (a: Vec2, b: Vec2) => a.x * b.x + a.y * b.y;
export const length = (a: Vec2) => Math.hypot(a.x, a.y);
/** Unit vector pointing at `angle` (0 = +x, π/2 = +y). */
export const fromAngle = (angle: number): Vec2 => ({ x: Math.cos(angle), y: Math.sin(angle) });
/** `a` turned 90° clockwise on screen: the right-hand side of a heading. */
export const right = (a: Vec2): Vec2 => ({ x: -a.y, y: a.x });

/** Shortest signed difference between two angles, in (−π, π]. */
export function wrapAngle(angle: number) {
  const wrapped = angle % (2 * Math.PI);
  return wrapped > Math.PI ? wrapped - 2 * Math.PI : wrapped <= -Math.PI ? wrapped + 2 * Math.PI : wrapped;
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
