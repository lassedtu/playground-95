import type { Vec2 } from "./vector";

/** Where another player's car is, and how far round the race, at some moment. */
export type RemoteSample = {
  p: Vec2;
  heading: number;
  v: Vec2;
  drift: -1 | 0 | 1;
  /** The player is away (window hidden): drawn see-through, no collisions. */
  ghost: boolean;
  lap: number;
  next: number;
  last: number;
  lapTimes: number[];
  finished: number | null;
};

/**
 * A car driven on another machine. The race asks it every tick where the car
 * is at the current race time; null while that isn't known yet (the car
 * isn't drawn and doesn't collide).
 */
export type RemoteCar = { sample(raceTime: number): RemoteSample | null };
