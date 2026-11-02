import { ELEVATIONS, FRAMES, PIXELS_PER_UNIT, type Vehicle } from "../data/vehicles";
import { type Camera, project } from "./camera";
import type { Car } from "./car";
import { drawCarDebug } from "./draw-car";
import type { Vec2 } from "./vector";

const FRAME_ANGLE = (2 * Math.PI) / FRAMES;
/** Cars closer than this to the camera (along the ground) aren't drawn. */
const MIN_AHEAD = 4;
/** Most a sprite leans (sideways pixels per pixel up), for cars right beside the camera. */
const MAX_LEAN = 0.8;

/** Decoded sprite sheets, by vehicle name. */
export type SpriteSheets = Map<string, HTMLImageElement>;

/** Sheets already loaded (or loading), so a new race doesn't fetch them again. */
const cache = new Map<string, Promise<HTMLImageElement>>();

function loadSheet(vehicle: Vehicle) {
  let image = cache.get(vehicle.name);
  if (!image) {
    const element = new Image();
    element.src = vehicle.sheet.src;
    image = element.decode().then(() => element);
    image.catch(() => cache.delete(vehicle.name));
    cache.set(vehicle.name, image);
  }
  return image;
}

export async function loadSpriteSheets(vehicles: readonly Vehicle[]): Promise<SpriteSheets> {
  const unique = [...new Map(vehicles.map((v) => [v.name, v])).values()];
  const images = await Promise.all(unique.map(async (vehicle) => [vehicle.name, await loadSheet(vehicle)] as const));
  return new Map(images);
}

/** Index of the rendered viewing height closest to `elevation`. */
function nearestElevation(elevation: number) {
  let best = 0;
  ELEVATIONS.forEach((e, i) => {
    if (Math.abs(e - elevation) < Math.abs(ELEVATIONS[best] - elevation)) best = i;
  });
  return best;
}

/**
 * Which sprite to draw, and how much to lean it.
 *
 * The sprites are renders of a 3D model, so like in Mario Kart they're
 * picked by how the camera sees the car: the rotation from the angle between
 * the car's heading and the line from the camera to the car (0 = driving
 * straight away, so we see its back), the row from how far above the car the
 * camera is.
 *
 * Lean: off to the sides, the wide-angle perspective tilts the ground (lines
 * running away from you lean towards their vanishing point). The sprite's
 * "away from the camera" axis is sheared to follow the ground along the line
 * of sight, so the car sits on the road. `lean` is screen pixels sideways per
 * pixel upwards.
 */
export function spriteView(p: Vec2, heading: number, camera: Camera) {
  const at = project(camera, p.x, p.y);
  if (!at) return null;
  const dx = p.x - camera.x;
  const dy = p.y - camera.y;
  const distance = Math.hypot(dx, dy);
  const away = project(camera, p.x + dx / distance, p.y + dy / distance);
  if (!away) return null;
  const up = at.y - away.y;
  const lean = up > 0 ? Math.max(-MAX_LEAN, Math.min(MAX_LEAN, (away.x - at.x) / up)) : 0;

  // Frame k points k·7.5° clockwise from right on screen; away from the camera is up (270°).
  const steps = Math.round((heading - Math.atan2(dy, dx) + (3 * Math.PI) / 2) / FRAME_ANGLE);
  const frame = ((steps % FRAMES) + FRAMES) % FRAMES;
  const row = nearestElevation(Math.atan2(camera.height, distance));
  return { at, frame, row, lean };
}

/** A car as it should be drawn this frame (position and heading between ticks). */
export type CarPose = { car: Car; p: Vec2; heading: number };

/** Draws cars far to near, each sprite scaled by distance and standing on its spot. */
export function drawCars(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  poses: CarPose[],
  sheets: SpriteSheets,
  debug: boolean,
) {
  const cos = Math.cos(camera.angle);
  const sin = Math.sin(camera.angle);
  const visible = poses
    .map((pose) => ({ pose, ahead: (pose.p.x - camera.x) * cos + (pose.p.y - camera.y) * sin }))
    .filter(({ ahead }) => ahead > MIN_AHEAD)
    .sort((a, b) => b.ahead - a.ahead);

  ctx.imageSmoothingEnabled = false;
  for (const { pose } of visible) {
    const { car, p, heading } = pose;
    const vehicle = car.vehicle;
    const view = spriteView(p, heading, camera);
    const image = sheets.get(vehicle.name);
    if (!view || !image) continue;

    const { at, frame, row, lean } = view;
    const size = at.scale / PIXELS_PER_UNIT;
    // Shear around the car's ground point: higher pixels shift sideways by `lean`.
    ctx.setTransform(1, 0, -lean, 1, Math.round(at.x), Math.round(at.y));
    ctx.drawImage(
      image,
      frame * vehicle.frameWidth,
      row * vehicle.frameHeight,
      vehicle.frameWidth,
      vehicle.frameHeight,
      Math.round(-vehicle.anchorX * size),
      Math.round(-vehicle.anchorY * size),
      Math.round(vehicle.frameWidth * size),
      Math.round(vehicle.frameHeight * size),
    );
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (debug) drawCarDebug(ctx, camera, car, p, heading);
  }
}
