/** Size of the rendered picture; it's scaled up (pixelated) to fit the window. */
export const VIEW_WIDTH = 320;
export const VIEW_HEIGHT = 200;
/** Horizontal field of view. */
const FOV = (60 * Math.PI) / 180;

/**
 * The Mode 7 camera: a position on the map, the direction it looks in
 * (radians; 0 = +x, π/2 = +y, since map y grows downwards), and how high it
 * floats above the ground. `focal` and `horizon` are in screen pixels.
 */
export type Camera = {
  x: number;
  y: number;
  angle: number;
  height: number;
  focal: number;
  horizon: number;
};

export function makeCamera(x: number, y: number, angle: number): Camera {
  return { x, y, angle, height: 18, focal: VIEW_WIDTH / 2 / Math.tan(FOV / 2), horizon: 64 };
}

/** Shortest signed difference between two angles, in (−π, π]. */
export function wrapAngle(angle: number) {
  const wrapped = angle % (2 * Math.PI);
  return wrapped > Math.PI ? wrapped - 2 * Math.PI : wrapped <= -Math.PI ? wrapped + 2 * Math.PI : wrapped;
}

/** In-between camera for drawing between two physics ticks (`t` from 0 to 1). */
export function lerpCamera(a: Camera, b: Camera, t: number): Camera {
  return {
    ...b,
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    angle: a.angle + wrapAngle(b.angle - a.angle) * t,
    height: a.height + (b.height - a.height) * t,
  };
}
