/**
 * Every number that decides how driving feels, in one place. Units: map
 * pixels (1 map pixel = 1 unit), seconds, radians. Hitbox sizes and masses
 * come with the cars (data/vehicles.ts).
 */
export const CAR = {
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
  distance: 34,
  height: 18,
  /**
   * Tilt down (radians). With this height and distance the car is seen from
   * about 28° above, close to the 35° the car sprites are drawn from.
   */
  pitch: (15 * Math.PI) / 180,
  /** Time constant for the camera's angle catching up with the car (s). */
  lag: 0.15,
  /** Below this speed the camera follows the heading instead of the movement. */
  followSpeed: 20,
} as const;

export const COLLISION = {
  /** Passes per tick (a push can cause a new overlap). */
  iterations: 2,
  /** Wall pixels within this radius decide which way is out of a wall. */
  normalRadius: 4,
  /** Furthest a car is pushed out of a wall in one go. */
  maxDepth: 10,
  /** Share of the speed into a wall that bounces back, and of the speed along it that's kept. */
  wallBounce: 0.3,
  wallScrape: 0.85,
  /** Bounciness between cars (0 = they stick, 1 = perfect bounce). */
  carBounce: 0.35,
  /** Sideways friction between touching cars, relative to the push. */
  carFriction: 0.2,
  /** Hits harder than this (speed × mass) turn the cars a little, up to `maxNudge` (radians). */
  hardHit: 40,
  maxNudge: 0.25,
} as const;
