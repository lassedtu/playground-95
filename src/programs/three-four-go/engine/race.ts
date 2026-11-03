import { SURFACE } from "../data/palette";
import type { Car } from "./car";
import { checkpointAt, surfaceAt, type Track } from "./track";
import { dot, fromAngle, length, type Vec2 } from "./vector";

/** "3", "4" (one second each), then GO. */
export const COUNTDOWN = 2;
/** How long "GO!" stays up after the start. */
const GO_SHOWN = 1;
/** Facing the wrong way (and moving) this long shows "WRONG WAY". */
const WRONG_WAY_AFTER = 1;
const WRONG_WAY_SPEED = 15;
/** Out of bounds this long puts you back on the road. */
const RESPAWN_AFTER = 1;
/** Checkpoint crossings are looked for every this many map units along the path. */
const SAMPLE_STEP = 1.5;
/** How long a short message ("Missed a checkpoint!") stays up. */
const NOTE_SHOWN = 2;

/** One car's race so far. */
export type Racer = {
  car: Car;
  /** Laps started: 0 on the grid, 1 after first crossing the finish line. */
  lap: number;
  /** Gate it has to cross next (0 = finish line). */
  next: number;
  /** Last gate it crossed, where it's put back when it leaves the track (−1 = none yet). */
  last: number;
  /** Race time when the current lap started, and every finished lap's time. */
  lapStart: number;
  lapTimes: number[];
  /** Race time when it finished, or null. */
  finished: number | null;
  wrongWayFor: number;
  outFor: number;
  /** A short message for this car and when it was set. */
  note: { text: string; at: number } | null;
  /**
   * Laps, gates and finish are reported by someone else (another player's
   * machine) instead of worked out here, and it's never respawned here.
   */
  external: boolean;
};

export type Race = {
  track: Track;
  laps: number;
  /** Seconds since GO (negative during the countdown). */
  time: number;
  racers: Racer[];
};

export function makeRace(track: Track, cars: Car[], laps = track.laps): Race {
  return {
    track,
    laps,
    time: -COUNTDOWN,
    racers: cars.map((car) => ({
      car,
      lap: 0,
      next: 0,
      last: -1,
      lapStart: 0,
      lapTimes: [],
      finished: null,
      wrongWayFor: 0,
      outFor: 0,
      note: null,
      external: false,
    })),
  };
}

export const started = (race: Race) => race.time >= 0;

/** The big text in the middle of the screen during the start, or null. */
export function countdownText(race: Race) {
  if (race.time < -1) return "3";
  if (race.time < 0) return "4";
  if (race.time < GO_SHOWN) return "GO!";
  return null;
}

/** Gates crossed between the car's previous and current position, in order. */
function crossings(track: Track, from: Vec2, to: Vec2): number[] {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(distance / SAMPLE_STEP));
  const found: number[] = [];
  let previous = checkpointAt(track, from.x, from.y);
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    const id = checkpointAt(track, from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
    if (id >= 0 && id !== previous) found.push(id);
    previous = id;
  }
  return found;
}

function cross(race: Race, racer: Racer, gate: number) {
  const count = race.track.gates.length;
  if (gate !== racer.next) {
    // Crossing the finish line mid-lap means a checkpoint was skipped.
    if (gate === 0 && racer.lap > 0 && racer.next !== 0) racer.note = { text: "Missed a checkpoint!", at: race.time };
    return;
  }
  racer.last = gate;
  racer.next = (gate + 1) % count;
  if (gate !== 0) return;
  if (racer.lap > 0) racer.lapTimes.push(race.time - racer.lapStart);
  if (racer.lap >= race.laps) {
    racer.finished = race.time;
    return;
  }
  racer.lap++;
  // Lap 1 is timed from GO (the grid is behind the line), so lap times add up to the race time.
  racer.lapStart = racer.lap === 1 ? 0 : race.time;
  if (racer.lap === race.laps && race.laps > 1) racer.note = { text: "Final lap!", at: race.time };
}

/** Puts a car back on the road at the last gate it crossed (or its grid slot), standing still. */
export function respawn(race: Race, racer: Racer, index: number) {
  const { car } = racer;
  if (racer.last >= 0) {
    const gate = race.track.gates[racer.last];
    car.p = { ...gate.centre };
    car.heading = Math.atan2(gate.forward.y, gate.forward.x);
  } else {
    const slot = race.track.start[index] ?? race.track.start[0];
    car.p = { x: slot.x, y: slot.y };
    car.heading = slot.angle;
  }
  car.v = { x: 0, y: 0 };
  car.drift = 0;
  car.previous = { p: { ...car.p }, heading: car.heading };
  racer.outFor = 0;
}

/** Direction the road runs where the car is: from the last gate towards the next. */
function roadDirection(race: Race, racer: Racer): Vec2 {
  const gates = race.track.gates;
  const to = gates[racer.next].centre;
  const from = gates[(racer.next - 1 + gates.length) % gates.length].centre;
  const d = { x: to.x - from.x, y: to.y - from.y };
  const l = length(d) || 1;
  return { x: d.x / l, y: d.y / l };
}

/** Advances the clock and every racer's laps, after the cars have moved this tick. */
export function updateRace(race: Race, dt: number) {
  race.time += dt;
  race.racers.forEach((racer, index) => {
    if (racer.external) return;
    const { car } = racer;
    for (const gate of crossings(race.track, car.previous.p, car.p)) cross(race, racer, gate);

    const facing = dot(fromAngle(car.heading), roadDirection(race, racer));
    racer.wrongWayFor = facing < -0.3 && length(car.v) > WRONG_WAY_SPEED ? racer.wrongWayFor + dt : facing > 0 ? 0 : racer.wrongWayFor;

    racer.outFor = surfaceAt(race.track, car.p.x, car.p.y) === SURFACE.out ? racer.outFor + dt : 0;
    if (racer.outFor >= RESPAWN_AFTER) respawn(race, racer, index);
  });
}

export const isWrongWay = (racer: Racer) => racer.finished === null && racer.wrongWayFor >= WRONG_WAY_AFTER;

export function noteText(race: Race, racer: Racer) {
  return racer.note && race.time - racer.note.at < NOTE_SHOWN ? racer.note.text : null;
}

/** Time of the lap being driven (or 0 before the first lap). */
export const currentLapTime = (race: Race, racer: Racer) =>
  racer.lap > 0 && racer.finished === null ? race.time - racer.lapStart : 0;

export const bestLap = (racer: Racer) => (racer.lapTimes.length ? Math.min(...racer.lapTimes) : null);

/**
 * How far round the race a car is, for ordering: laps, gates crossed this
 * lap, and how close it is to the next gate.
 */
export function progress(race: Race, racer: Racer) {
  const gates = race.track.gates;
  const passed = (racer.next - 1 + gates.length) % gates.length;
  const from = gates[passed].centre;
  const to = gates[racer.next].centre;
  const span = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const left = Math.hypot(to.x - racer.car.p.x, to.y - racer.car.p.y);
  const done = racer.finished !== null ? 1 : 0;
  return (racer.lap + done) * gates.length + (racer.lap > 0 ? passed : 0) + Math.max(0, 1 - left / span);
}

/** m:ss.t */
export function formatTime(seconds: number) {
  const tenths = Math.floor(Math.max(0, seconds) * 10);
  const minutes = Math.floor(tenths / 600);
  const rest = tenths - minutes * 600;
  return `${minutes}:${String(Math.floor(rest / 10)).padStart(2, "0")}.${rest % 10}`;
}

/** Racer indexes from first to last: finished cars by time, the rest by how far round they are. */
export function standings(race: Race): number[] {
  return race.racers
    .map((racer, index) => ({ index, finished: racer.finished, progress: progress(race, racer) }))
    .sort((a, b) =>
      a.finished !== null && b.finished !== null
        ? a.finished - b.finished
        : a.finished !== null
          ? -1
          : b.finished !== null
            ? 1
            : b.progress - a.progress,
    )
    .map((r) => r.index);
}

/** 1 → "1st", 2 → "2nd", … */
export function ordinal(n: number) {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${suffix}`;
}
