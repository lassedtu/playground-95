import { SURFACE } from "../data/palette";
import { CAR } from "../data/tuning";
import { type CarInput, NO_INPUT } from "./car";
import { progress, type Race, type Racer, respawn, started } from "./race";
import { seededRandom } from "./random";
import type { Track } from "./track";
import { clamp, dot, fromAngle, lerp, type Vec2, wrapAngle } from "./vector";

/**
 * How a CPU drives. All CPUs know is the road (the logic layer) and where
 * the next checkpoint is; these numbers decide what they do with that.
 * Personalities (data/personalities.ts) are different values for the same fields.
 */
export type DrivingStyle = {
  /** Gas when nothing is in the way (0–1). */
  throttle: number;
  /** Fastest it wants to go, as a share of the car's top speed. */
  topSpeed: number;
  /** Where across a checkpoint it aims: 0 and 1 are near the road's edges, 0.5 the middle. */
  lane: number;
  /** Each checkpoint, the lane moves by up to this much at random. */
  laneJitter: number;
  /** In bends, how far it moves towards the inside of the turn (0 = not at all, 1 = right to the kerb). */
  inside: number;
  /** How far before a checkpoint it starts aiming at the one after (map units). */
  lookahead: number;
  /** How far ahead it looks for the road's edge at top speed (map units). */
  whiskerLength: number;
  /** Turning towards the target: steering per radian off. */
  steering: number;
  /** Steering away from the road's edge. */
  avoid: number;
  /** Brakes when the target is this far off the nose (radians)… */
  brakeAngle: number;
  /** …give or take this share, picked again at every checkpoint… */
  brakeJitter: number;
  /** …or when the road ends this close ahead (map units, at top speed). */
  brakeDistance: number;
  /** Drifts when the target is this far off the nose (radians), or never when null. */
  driftAngle: number | null;
  /** Random steering wobble (0 = steady). */
  wobble: number;
  /** Reaction time, in physics ticks (1/60 s). */
  reaction: number;
  /** Chance per lap of a mistake: half a second of not looking at the road. */
  mistakes: number;
};

export const DEFAULT_STYLE: DrivingStyle = {
  throttle: 1,
  topSpeed: 1,
  lane: 0.5,
  laneJitter: 0.25,
  inside: 0,
  lookahead: 90,
  whiskerLength: 70,
  steering: 2.6,
  avoid: 1.4,
  brakeAngle: 1.0,
  brakeJitter: 0,
  brakeDistance: 30,
  driftAngle: 0.55,
  wobble: 0.08,
  reaction: 5,
  mistakes: 0,
};

/** Feelers: angle from the nose (radians, + is right), and how much each one counts. */
const WHISKERS = [
  { angle: (-50 * Math.PI) / 180, weight: 0.6 },
  { angle: (-25 * Math.PI) / 180, weight: 1 },
  { angle: 0, weight: 1 },
  { angle: (25 * Math.PI) / 180, weight: 1 },
  { angle: (50 * Math.PI) / 180, weight: 0.6 },
];
const WHISKER_STEP = 4;
/** Aim this far in from the road's edges at lane 0 and 1. */
const LANE_MARGIN = 0.15;
/** Stuck: slower than this for this long means back up for a moment… */
const STUCK_SPEED = 8;
const STUCK_AFTER = 1.5;
const REVERSE_FOR = 0.8;
/** …and backing up this often in a short while means it's lost: respawn. */
const GIVE_UP_REVERSES = 3;
const GIVE_UP_WINDOW = 8;
/** A bend this sharp (radians) gets the full `inside` shift… */
const BEND_FULL = 0.8;
/** …which goes this far towards the inside edge (0.5 = to the kerb), so it cuts the corner without leaving the road. */
const INSIDE_REACH = 0.3;
/** How long a mistake lasts (s). */
const MISTAKE_LENGTH = 0.5;
/** After running into the back of a car, it moves to the other side of the road this long (s). */
const PASS_FOR = 2.5;

export type Whisker = { from: Vec2; to: Vec2; blocked: boolean };

export type CpuDriver = {
  style: DrivingStyle;
  random: () => number;
  /** Decisions waiting out the reaction time. */
  pending: CarInput[];
  lane: number;
  brakeAngle: number;
  /** Gate the lane and brake point were picked for. */
  laneFor: number;
  wobblePhase: [number, number];
  stuckFor: number;
  reverseFor: number;
  reverses: number[];
  drifting: boolean;
  /** This lap's mistake (race time it starts), and the lap it was rolled for. */
  mistakeAt: number | null;
  mistakeLap: number;
  /** Trying to pass: the lane it moved to and until when. */
  passing: { lane: number; until: number } | null;
  /** What it saw last tick, for the debug view. */
  seen: { target: Vec2; whiskers: Whisker[] } | null;
};

export function makeDriver(style: DrivingStyle, seed: number): CpuDriver {
  const random = seededRandom(seed);
  return {
    style,
    random,
    pending: Array.from({ length: style.reaction }, () => NO_INPUT),
    lane: style.lane,
    brakeAngle: style.brakeAngle,
    laneFor: -1,
    wobblePhase: [random() * 10, random() * 10],
    stuckFor: 0,
    reverseFor: 0,
    reverses: [],
    drifting: false,
    mistakeAt: null,
    mistakeLap: -1,
    passing: null,
    seen: null,
  };
}

/**
 * Which way the road turns at a gate (radians, + = right) and which lane
 * value (0 or 1) is the inside of that turn.
 */
function bendAt(track: Track, gate: number) {
  const gates = track.gates;
  const here = gates[gate];
  const before = gates[(gate - 1 + gates.length) % gates.length].centre;
  const after = gates[(gate + 1) % gates.length].centre;
  const turn = wrapAngle(
    Math.atan2(after.y - here.centre.y, after.x - here.centre.x) -
      Math.atan2(here.centre.y - before.y, here.centre.x - before.x),
  );
  // Lane 0 is at end a. Is a on the right of the driving direction?
  const aRight = (here.a.x - here.centre.x) * -here.forward.y + (here.a.y - here.centre.y) * here.forward.x > 0;
  return { turn, insideLane: turn > 0 === aRight ? 0 : 1 };
}

const blocks = (surface: number) => surface !== SURFACE.road && surface !== SURFACE.boost;

/** How far the road goes from `from` in direction `angle`, up to `max`. */
function feel(track: Track, from: Vec2, angle: number, max: number) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  for (let d = WHISKER_STEP; d <= max; d += WHISKER_STEP) {
    const x = Math.floor(from.x + dx * d);
    const y = Math.floor(from.y + dy * d);
    if (x < 0 || y < 0 || x >= track.width || y >= track.height || blocks(track.surfaces[y * track.width + x])) {
      return d - WHISKER_STEP;
    }
  }
  return max;
}

/** Point across a gate at `lane` (0–1), kept off the road's very edges. */
function laneOf(track: Track, gate: number, lane: number): Vec2 {
  const { a, b } = track.gates[gate];
  const t = LANE_MARGIN + (1 - 2 * LANE_MARGIN) * lane;
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

/** What the CPU wants to do right now (before its reaction time). */
function decide(race: Race, racer: Racer, index: number, driver: CpuDriver, dt: number): CarInput {
  const { track } = race;
  const { car } = racer;
  const { style } = driver;
  const gates = track.gates;
  const h = fromAngle(car.heading);
  const forward = dot(car.v, h);

  // Target: the next gate, blending into the one after as it gets close.
  // Lane (towards the inside of bends, by personality) and brake point are
  // picked once per gate.
  if (driver.laneFor !== racer.next) {
    const { turn, insideLane } = bendAt(track, racer.next);
    const sharpness = clamp(Math.abs(turn) / BEND_FULL, 0, 1);
    const inside = lerp(0.5, insideLane, INSIDE_REACH / 0.5);
    const lane = lerp(style.lane, inside, style.inside * sharpness);
    driver.lane = clamp(lane + (driver.random() * 2 - 1) * style.laneJitter, 0, 1);
    driver.brakeAngle = style.brakeAngle * (1 + (driver.random() * 2 - 1) * style.brakeJitter);
    driver.laneFor = racer.next;
  }
  // Ran into the back of someone: try the other side of the road for a bit.
  if (car.bump && dot(car.bump, h) < -0.5 && !driver.passing) {
    driver.passing = { lane: driver.lane > 0.5 ? 0.1 : 0.9, until: race.time + PASS_FOR };
  }
  if (driver.passing && race.time > driver.passing.until) driver.passing = null;
  const lane = driver.passing?.lane ?? driver.lane;
  // One mistake chance per lap, at a random moment during it.
  if (driver.mistakeLap !== racer.lap) {
    driver.mistakeLap = racer.lap;
    driver.mistakeAt = driver.random() < style.mistakes ? race.time + 2 + driver.random() * 14 : null;
  }
  const blundering =
    driver.mistakeAt !== null && race.time >= driver.mistakeAt && race.time < driver.mistakeAt + MISTAKE_LENGTH;
  const near = laneOf(track, racer.next, lane);
  const far = laneOf(track, (racer.next + 1) % gates.length, lane);
  const distance = Math.hypot(near.x - car.p.x, near.y - car.p.y);
  const blend = distance < style.lookahead ? (1 - distance / style.lookahead) * 0.7 : 0;
  const target = { x: lerp(near.x, far.x, blend), y: lerp(near.y, far.y, blend) };
  const error = wrapAngle(Math.atan2(target.y - car.p.y, target.x - car.p.x) - car.heading);

  // Whiskers from the front bumper.
  const nose = { x: car.p.x + h.x * (car.length / 2), y: car.p.y + h.y * (car.length / 2) };
  const reach = style.whiskerLength * (0.4 + 0.6 * clamp(forward / CAR.maxSpeed, 0, 1));
  const whiskers = WHISKERS.map((w) => {
    const angle = car.heading + w.angle;
    const d = feel(track, nose, angle, reach);
    return { ...w, d, closeness: 1 - d / reach, to: { x: nose.x + Math.cos(angle) * d, y: nose.y + Math.sin(angle) * d } };
  });
  driver.seen = {
    target,
    whiskers: whiskers.map((w) => ({ from: nose, to: w.to, blocked: w.closeness > 0 })),
  };

  // Steer towards the target and away from the edges. If the road ends
  // straight ahead, turn towards the more open side.
  let avoid = 0;
  let left = 0;
  let right = 0;
  for (const w of whiskers) {
    if (w.angle < 0) left += w.weight * w.closeness;
    if (w.angle > 0) right += w.weight * w.closeness;
    if (w.angle !== 0) avoid -= Math.sign(w.angle) * w.weight * w.closeness;
  }
  const front = whiskers[2].closeness;
  if (front > 0) avoid += (left > right ? 1 : -1) * front;
  const [p1, p2] = driver.wobblePhase;
  const wobble = style.wobble * (Math.sin(race.time * 1.3 + p1) + Math.sin(race.time * 2.9 + p2)) / 2;
  // A mistake: not watching the road (no whiskers) for a moment.
  const steer = clamp(style.steering * error + (blundering ? 0 : style.avoid * avoid) + wobble, -1, 1);

  // Stuck (against a wall or another car): back up for a moment, turning the nose round.
  driver.stuckFor = Math.abs(forward) < STUCK_SPEED && driver.reverseFor <= 0 ? driver.stuckFor + dt : 0;
  if (driver.stuckFor > STUCK_AFTER) {
    driver.stuckFor = 0;
    driver.reverseFor = REVERSE_FOR;
    driver.reverses = [...driver.reverses.filter((t) => race.time - t < GIVE_UP_WINDOW), race.time];
    if (driver.reverses.length >= GIVE_UP_REVERSES) {
      driver.reverses = [];
      driver.reverseFor = 0;
      respawn(race, racer, index);
      return NO_INPUT;
    }
  }
  if (driver.reverseFor > 0) {
    driver.reverseFor -= dt;
    // Rolling backwards turns the other way.
    return { throttle: 0, brake: 1, steer: -Math.sign(error) || 1, drift: false };
  }

  // Gas and brakes. It also eases off when the turn after the next gate is
  // sharp, so it doesn't run wide coming out of the bend.
  const fast = forward / CAR.maxSpeed;
  const wall = !blundering && whiskers[2].d < style.brakeDistance * fast && fast > 0.3;
  const sharp = Math.abs(error) > driver.brakeAngle && fast > 0.45;
  const bend = Math.abs(wrapAngle(Math.atan2(far.y - near.y, far.x - near.x) - car.heading));
  const bendAhead = distance < style.lookahead * 1.5 && bend > driver.brakeAngle * 0.7 && fast > 0.7;
  const throttle =
    fast > style.topSpeed
      ? 0
      : Math.abs(error) > driver.brakeAngle * 0.6 || bendAhead
        ? style.throttle * 0.6
        : style.throttle;

  // Drift through sharp turns at speed, keep it until the turn is nearly
  // done, but not when the outside of the turn is already close, or once
  // the turn goes the other way (a drift stays locked to the side it started on).
  const driftAngle = style.driftAngle;
  const outside = error > 0 ? left : right;
  const wrongSide = car.drift !== 0 && Math.sign(error) !== car.drift;
  driver.drifting =
    driftAngle !== null &&
    !wrongSide &&
    fast > CAR.driftStart + 0.05 &&
    outside < 0.5 &&
    Math.abs(error) > (driver.drifting ? driftAngle * 0.4 : driftAngle);

  return {
    throttle: wall || sharp ? 0 : throttle,
    brake: wall || sharp ? 1 : 0,
    steer,
    drift: driver.drifting,
  };
}

/** The CPU's controls for this tick (decided `reaction` ticks ago). */
export function drive(race: Race, racer: Racer, index: number, driver: CpuDriver, dt: number): CarInput {
  if (!started(race)) return NO_INPUT;
  driver.pending.push(decide(race, racer, index, driver, dt));
  return driver.pending.shift() ?? NO_INPUT;
}

/**
 * Rubber-banding: a CPU this far behind you (in checkpoints) gets a little
 * more top speed, up to `CATCH_UP.boost` when it's `CATCH_UP.full` behind.
 * Nobody is slowed down. Set `boost` to 1 to turn it off.
 */
export const CATCH_UP = { from: 2, full: 6, boost: 1.05 };

export function catchUp(race: Race, racer: Racer, you: Racer) {
  if (racer.finished !== null || you.finished !== null) return 1;
  const behind = progress(race, you) - progress(race, racer);
  const t = clamp((behind - CATCH_UP.from) / (CATCH_UP.full - CATCH_UP.from), 0, 1);
  return lerp(1, CATCH_UP.boost, t);
}
