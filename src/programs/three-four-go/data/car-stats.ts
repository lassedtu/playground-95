/**
 * Each car's strengths, in points from 2 to 4 (3 = average). Every car has
 * exactly 9 points, so being better at one thing means being worse at
 * another, and the differences are small on purpose (see STAT_EFFECT).
 * Weight isn't a stat: it comes from the car's size and only matters in bumps.
 */
export type CarStats = { speed: number; acceleration: number; handling: number };

export const STAT_POINTS = 9;
export const STAT_MAX = 5;

/** Per point above or below 3. */
export const STAT_EFFECT = {
  /** Top speed. */
  speed: 0.015,
  /** Acceleration. */
  acceleration: 0.05,
  /** Turning speed and grip. */
  handling: 0.045,
} as const;

const AVERAGE: CarStats = { speed: 3, acceleration: 3, handling: 3 };

export const CAR_STATS: Record<string, CarStats> = {
  italia: { speed: 4, acceleration: 3, handling: 2 },
  coupe: AVERAGE,
  fenyr: { speed: 4, acceleration: 2, handling: 3 },
  ghini: { speed: 3, acceleration: 4, handling: 2 },
  lamb: { speed: 4, acceleration: 3, handling: 2 },
  kamaro: { speed: 4, acceleration: 2, handling: 3 },
  rally: { speed: 2, acceleration: 3, handling: 4 },
  police: AVERAGE,
  mobil: { speed: 3, acceleration: 2, handling: 4 },
  jeep: { speed: 2, acceleration: 4, handling: 3 },
  van: { speed: 3, acceleration: 4, handling: 2 },
  armor: { speed: 2, acceleration: 3, handling: 4 },
};

export const statsFor = (name: string): CarStats => CAR_STATS[name] ?? AVERAGE;

/** Multipliers for the car physics. */
export function statMultipliers(stats: CarStats) {
  return {
    speed: 1 + (stats.speed - 3) * STAT_EFFECT.speed,
    acceleration: 1 + (stats.acceleration - 3) * STAT_EFFECT.acceleration,
    handling: 1 + (stats.handling - 3) * STAT_EFFECT.handling,
  };
}
