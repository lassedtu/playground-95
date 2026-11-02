import { DEFAULT_STYLE, type DrivingStyle } from "../engine/cpu";

/**
 * The CPU drivers. They all use the same car physics; only how they drive
 * differs. Every race uses all of them, in a shuffled grid order.
 */
export type Personality = { id: string; label: string; style: DrivingStyle };

/** Fast and clean: racing line through the bends, drifts where it pays, no mistakes. */
const PRO: Personality = {
  id: "pro",
  label: "Pro",
  style: {
    ...DEFAULT_STYLE,
    laneJitter: 0.05,
    inside: 0.8,
    lookahead: 100,
    whiskerLength: 75,
    brakeDistance: 28,
    driftAngle: 0.7,
    wobble: 0.02,
    reaction: 3,
  },
};

/** Flat out, cuts corners, drifts everywhere, late on the brakes, and goes off now and then. */
const RECKLESS: Personality = {
  id: "reckless",
  label: "Reckless",
  style: {
    ...DEFAULT_STYLE,
    laneJitter: 0.3,
    inside: 1,
    lookahead: 70,
    whiskerLength: 55,
    avoid: 1.2,
    brakeAngle: 1.3,
    brakeDistance: 18,
    driftAngle: 0.45,
    wobble: 0.12,
    reaction: 3,
    mistakes: 0.3,
  },
};

/** Never quite flat out, brakes early, stays in the middle, never drifts. */
const CAREFUL: Personality = {
  id: "careful",
  label: "Careful",
  style: {
    ...DEFAULT_STYLE,
    throttle: 0.85,
    topSpeed: 0.92,
    laneJitter: 0.1,
    lookahead: 70,
    whiskerLength: 95,
    brakeAngle: 0.75,
    brakeDistance: 45,
    driftAngle: null,
    wobble: 0.04,
    reaction: 6,
    mistakes: 0.05,
  },
};

/** Slow to react, wanders across the road, brakes at random moments. */
const ROOKIE: Personality = {
  id: "rookie",
  label: "Rookie",
  style: {
    ...DEFAULT_STYLE,
    throttle: 0.9,
    topSpeed: 0.9,
    laneJitter: 0.4,
    lookahead: 60,
    whiskerLength: 65,
    brakeAngle: 0.95,
    brakeJitter: 0.35,
    driftAngle: 0.75,
    wobble: 0.14,
    reaction: 10,
    mistakes: 0.35,
  },
};

/** Out for a nice drive. */
const SUNDAY: Personality = {
  id: "sunday",
  label: "Sunday Driver",
  style: {
    ...DEFAULT_STYLE,
    throttle: 0.75,
    topSpeed: 0.78,
    laneJitter: 0.1,
    whiskerLength: 90,
    brakeAngle: 0.8,
    brakeDistance: 40,
    driftAngle: null,
    wobble: 0.04,
    reaction: 6,
    mistakes: 0.05,
  },
};

/** One per CPU on the grid. */
export const CPU_DRIVERS: readonly { name: string; personality: Personality }[] = [
  { name: "Task Manager", personality: PRO },
  { name: "Clippy", personality: RECKLESS },
  { name: "Rufus", personality: RECKLESS },
  { name: "Bonzi", personality: CAREFUL },
  { name: "ScanDisk", personality: CAREFUL },
  { name: "Bill", personality: ROOKIE },
  { name: "Dos", personality: SUNDAY },
];
