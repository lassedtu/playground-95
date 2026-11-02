/**
 * Every number that decides how driving feels, in one place. Units: map
 * pixels (1 map pixel = 1 unit), seconds, radians.
 */
export const CAR = {
  /** Hitbox; a sedan. Per-model sizes come with the sprites. */
  length: 14,
  width: 7,
  mass: 1,

  /** Acceleration from standstill; it fades to 0 towards `maxSpeed`. */
  accel: 150,
  /** Top speed on road (drag keeps the real top speed a bit lower). */
  maxSpeed: 180,
  /** Braking deceleration (also used when pressing gas while rolling backwards). */
  brake: 280,
  /** Reverse top speed, as a share of `maxSpeed`. */
  reverse: 0.3,
  /** Rolling resistance per second (always on). */
  rolling: 0.15,

  /** Turning speed at full steering. */
  turnRate: 2.2,
  /** Below this speed, turning is scaled down (no turning on the spot). */
  turnRef: 45,

  /** How fast sideways sliding dies out, normally and while drifting. */
  grip: 14,
  driftGrip: 7,
  /**
   * Share of the speed lost to grip that's kept, pointed forwards (arcade
   * handling: corners and drifts don't kill your speed).
   */
  carry: 0.6,
  driftCarry: 0.85,
  /** Drifting turns faster than normal steering. */
  driftTurn: 1.05,
  /** While drifting, steering away from the drift still turns this much into it. */
  driftWide: 0.15,
  /** A drift starts above this share of top speed and ends below `driftEnd`. */
  driftStart: 0.4,
  driftEnd: 0.25,
} as const;

export const CAMERA = {
  /** How far behind the car, and how high. */
  distance: 36,
  height: 13,
  /** Screen row of the horizon (of 200). */
  horizon: 64,
  /** Time constant for the camera's angle catching up with the car (s). */
  lag: 0.15,
  /** Below this speed the camera follows the heading instead of the movement. */
  followSpeed: 20,
} as const;
