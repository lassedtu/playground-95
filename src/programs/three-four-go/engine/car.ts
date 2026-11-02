import { statMultipliers, statsFor } from "../data/car-stats";
import type { Vehicle } from "../data/vehicles";
import type { Vec2 } from "./vector";

/**
 * A car is a rectangle with two directions: where it points (`heading`) and
 * where it's actually going (`v`). They differ while sliding, which makes drifting possible.
 */
export type Car = {
  /** Which car it is: sprites, hitbox size and mass. */
  vehicle: Vehicle;
  /** The car's stats as physics multipliers (data/car-stats.ts). */
  tune: { speed: number; acceleration: number; handling: number };
  /** Centre of the hitbox. */
  p: Vec2;
  /** Angle the car points at (0 = +x, π/2 = +y). */
  heading: number;
  /** Velocity in map units per second, independent of the heading. */
  v: Vec2;
  length: number;
  width: number;
  /** Relative to the sedan (1). */
  mass: number;
  /** 0 when not drifting, otherwise the side it drifts to (−1 left, 1 right). */
  drift: -1 | 0 | 1;
  /** Which way a collision pushed it this tick (unit vector), or null. CPUs use it to notice they ran into someone. */
  bump: Vec2 | null;
  /** Position and heading at the previous tick, for smooth drawing between ticks. */
  previous: { p: Vec2; heading: number };
};

/** What a driver (player or CPU) does this tick. */
export type CarInput = {
  /** 0–1 */
  throttle: number;
  /** 0–1: brakes, then reverses once stopped. */
  brake: number;
  /** −1 (left) to 1 (right). */
  steer: number;
  /** Drift button held. */
  drift: boolean;
};

export const NO_INPUT: CarInput = { throttle: 0, brake: 0, steer: 0, drift: false };

export function makeCar(vehicle: Vehicle, x: number, y: number, heading: number): Car {
  return {
    vehicle,
    tune: statMultipliers(statsFor(vehicle.name)),
    p: { x, y },
    heading,
    v: { x: 0, y: 0 },
    length: vehicle.length,
    width: vehicle.width,
    mass: vehicle.mass,
    drift: 0,
    bump: null,
    previous: { p: { x, y }, heading },
  };
}

/** The hitbox's four corners: front-left, front-right, back-right, back-left. */
export function carCorners(p: Vec2, heading: number, length: number, width: number): Vec2[] {
  const fx = Math.cos(heading) * (length / 2);
  const fy = Math.sin(heading) * (length / 2);
  const rx = -Math.sin(heading) * (width / 2);
  const ry = Math.cos(heading) * (width / 2);
  return [
    { x: p.x + fx - rx, y: p.y + fy - ry },
    { x: p.x + fx + rx, y: p.y + fy + ry },
    { x: p.x - fx + rx, y: p.y - fy + ry },
    { x: p.x - fx - rx, y: p.y - fy - ry },
  ];
}
