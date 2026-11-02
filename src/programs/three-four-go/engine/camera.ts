import { CAMERA } from "../data/tuning";
import type { Car } from "./car";
import { dot, fromAngle, length, wrapAngle } from "./vector";

/** Size of the rendered picture; it's scaled up (pixelated) to fit the window. */
export const VIEW_WIDTH = 320;
export const VIEW_HEIGHT = 230;
/**
 * Screen row the camera looks through. Not the middle: the picture is 200
 * rows around it plus 30 extra rows on top, so there's more sky for the
 * scenery while the road looks the same.
 */
export const CENTER_Y = 130;
/** Horizontal field of view. */
const FOV = (60 * Math.PI) / 180;
const FOCAL = VIEW_WIDTH / 2 / Math.tan(FOV / 2);
/** Points closer than this (along the view) aren't drawn. */
const NEAR = 1;

/**
 * The Mode 7 camera: a position on the map, the direction it looks in
 * (radians; 0 = +x, π/2 = +y, since map y grows downwards), how high it
 * floats above the ground, and how far it's tilted down (`pitch`, radians).
 * `focal` is in screen pixels.
 */
export type Camera = {
  x: number;
  y: number;
  angle: number;
  height: number;
  pitch: number;
  focal: number;
};

export function makeCamera(x: number, y: number, angle: number): Camera {
  return { x, y, angle, height: CAMERA.height, pitch: CAMERA.pitch, focal: FOCAL };
}

/** Screen row of the horizon (can be above the top of the screen when tilted far down). */
export const horizonRow = (camera: Camera) => CENTER_Y - camera.focal * Math.tan(camera.pitch);

/** Camera right behind a car, looking where it points. */
export function cameraBehind(car: Car): Camera {
  const camera = makeCamera(car.p.x, car.p.y, car.heading);
  return {
    ...camera,
    x: car.p.x - Math.cos(car.heading) * CAMERA.distance,
    y: car.p.y - Math.sin(car.heading) * CAMERA.distance,
  };
}

/**
 * Moves the camera behind the car. Its angle eases towards the direction the
 * car is *moving* (not pointing), so in a drift the car turns sideways on
 * screen. When slow or reversing it follows the heading instead.
 */
export function followCar(camera: Camera, car: Car, dt: number): Camera {
  const forward = dot(car.v, fromAngle(car.heading));
  const target =
    length(car.v) > CAMERA.followSpeed && forward > 0 ? Math.atan2(car.v.y, car.v.x) : car.heading;
  const angle = camera.angle + wrapAngle(target - camera.angle) * (1 - Math.exp(-dt / CAMERA.lag));
  return {
    ...camera,
    angle,
    x: car.p.x - Math.cos(angle) * CAMERA.distance,
    y: car.p.y - Math.sin(angle) * CAMERA.distance,
  };
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

/**
 * Where a point on the ground appears on screen, in canvas pixels (the same
 * maths `drawGround` uses per row), how many screen pixels one map unit is
 * there, and how far ahead of the camera it is along the ground. Null when
 * it's behind the camera.
 */
export function project(camera: Camera, x: number, y: number) {
  const dx = x - camera.x;
  const dy = y - camera.y;
  const cos = Math.cos(camera.angle);
  const sin = Math.sin(camera.angle);
  const ahead = dx * cos + dy * sin;
  const lateral = -dx * sin + dy * cos;
  // Into camera space: depth along the (tilted) view, and height on the screen's up axis.
  const cp = Math.cos(camera.pitch);
  const sp = Math.sin(camera.pitch);
  const depth = ahead * cp + camera.height * sp;
  if (depth < NEAR) return null;
  const up = ahead * sp - camera.height * cp;
  const scale = camera.focal / depth;
  return { x: VIEW_WIDTH / 2 + lateral * scale, y: CENTER_Y - up * scale, scale, ahead };
}
