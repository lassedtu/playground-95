import { CAR } from "../data/tuning";
import type { Car, CarInput } from "./car";
import { dot, fromAngle, lerp, right } from "./vector";

/** How a surface changes driving, as multipliers / extra drag. */
export type Surface = {
  /** Top speed multiplier. */
  max: number;
  /** Grip multiplier (lower = slides more). */
  grip: number;
  /** Extra drag per second on top of rolling resistance. */
  drag: number;
};

export const ROAD: Surface = { max: 1, grip: 1, drag: 0 };

/**
 * One physics tick for one car.
 *
 * 1. Steering turns the heading (scaled down at low speed, reversed when
 *    rolling backwards; drifting turns harder, always into the drift).
 * 2. The velocity, which didn't turn, is split into a forward and a sideways
 *    part relative to the *new* heading.
 * 3. Gas / brake change the forward part.
 * 4. Grip removes the sideways part over time: quickly normally, slowly while
 *    drifting. That gap between heading and velocity is the drift. Some of
 *    the speed that costs is kept, pointed forwards.
 * 5. Drag, then the velocity is put back together and the car moves.
 */
export function stepCar(car: Car, input: CarInput, surface: Surface, dt: number) {
  car.previous = { p: { ...car.p }, heading: car.heading };
  const maxSpeed = CAR.maxSpeed * surface.max;

  // Drift starts when the button is held while steering at speed, and locks
  // to that side until the button is released or the car slows down.
  const forwardBefore = dot(car.v, fromAngle(car.heading));
  if (!car.drift && input.drift && input.steer && forwardBefore > CAR.driftStart * CAR.maxSpeed) {
    car.drift = input.steer > 0 ? 1 : -1;
  } else if (car.drift && (!input.drift || forwardBefore < CAR.driftEnd * CAR.maxSpeed)) {
    car.drift = 0;
  }

  // 1. Steering.
  const turn = car.drift
    ? car.drift * lerp(CAR.driftWide, 1, (input.steer * car.drift + 1) / 2) * CAR.driftTurn
    : input.steer;
  const speedFactor = Math.min(1, Math.abs(forwardBefore) / CAR.turnRef) * Math.sign(forwardBefore);
  car.heading += turn * CAR.turnRate * speedFactor * dt;

  // 2. Split the velocity along the new heading.
  const h = fromAngle(car.heading);
  const r = right(h);
  let forward = dot(car.v, h);
  let sideways = dot(car.v, r);

  // 3. Gas and brake.
  if (input.throttle > 0) {
    forward =
      forward < -1
        ? Math.min(0, forward + CAR.brake * dt)
        : forward + CAR.accel * input.throttle * (1 - forward / maxSpeed) * dt;
  } else if (input.brake > 0) {
    forward =
      forward > 1
        ? Math.max(0, forward - CAR.brake * input.brake * dt)
        : forward - CAR.accel * 0.6 * input.brake * Math.max(0, 1 + forward / (maxSpeed * CAR.reverse)) * dt;
  }

  // 4. Grip: the sideways part dies out. Part of the speed that costs is kept
  //    (pointed forwards), so corners and drifts don't kill your speed.
  const kept = sideways * Math.exp(-(car.drift ? CAR.driftGrip : CAR.grip) * surface.grip * dt);
  if (forward > 0) {
    const before = Math.hypot(forward, sideways);
    const after = Math.hypot(forward, kept);
    const speed = after + (before - after) * (car.drift ? CAR.driftCarry : CAR.carry);
    forward = Math.sqrt(speed * speed - kept * kept);
  }
  sideways = kept;
  // 5. Drag.
  forward *= Math.exp(-(CAR.rolling + surface.drag) * dt);

  car.v = { x: h.x * forward + r.x * sideways, y: h.y * forward + r.y * sideways };
  car.p = { x: car.p.x + car.v.x * dt, y: car.p.y + car.v.y * dt };
}

/** Keeps a car on the map (walls come with real tracks). */
export function keepInside(car: Car, width: number, height: number) {
  const margin = car.length / 2;
  if (car.p.x < margin || car.p.x > width - margin) {
    car.p.x = Math.min(width - margin, Math.max(margin, car.p.x));
    car.v = { x: 0, y: car.v.y };
  }
  if (car.p.y < margin || car.p.y > height - margin) {
    car.p.y = Math.min(height - margin, Math.max(margin, car.p.y));
    car.v = { x: car.v.x, y: 0 };
  }
}
