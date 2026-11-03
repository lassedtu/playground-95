import type { RemoteCar, RemoteSample } from "../engine/remote";
import { wrapAngle } from "../engine/vector";
import type { CarState } from "./protocol";

/** No news for this long (s) and the car is gone (its player left or lost the connection). */
const LOST_AFTER = 2;
/** Most a car is moved ahead from its last state (s), in case the next one is late. */
const PREDICT_MAX = 0.25;
/** Further than this (map units) from where it's drawn: a respawn or a big jump, so it's moved straight there. */
const SNAP = 40;
/** How quickly the drawn car closes the gap to where it should be (s, time constant). */
const SMOOTHING = 0.1;

/**
 * Another player's car (or, for everyone but the host, a CPU) from the
 * states it sends ~15 times a second.
 *
 * It's shown where it is *now*, not a moment ago: from its last state,
 * moved on at its velocity for the time since (dead reckoning). That way it
 * sits where it really is when cars bump. Each new state usually differs a
 * little from the guess, so the drawn car eases over to it instead of jumping.
 */
export class RemoteBuffer implements RemoteCar {
  private latest: { t: number; state: CarState } | null = null;
  private shown: { x: number; y: number; heading: number; at: number } | null = null;

  /** A state for race time `t`. Older ones than the latest (out of order) are dropped. */
  push(t: number, state: CarState) {
    if (this.latest && t <= this.latest.t) return;
    this.latest = { t, state };
  }

  sample(time: number): RemoteSample | null {
    const latest = this.latest;
    if (!latest || time - latest.t > LOST_AFTER) {
      this.shown = null;
      return null;
    }
    const [, x, y, vx, vy, heading, drift, ghost, lap, next, last, finished] = latest.state;
    const ahead = Math.max(0, Math.min(PREDICT_MAX, time - latest.t));
    const target = { x: x + vx * ahead, y: y + vy * ahead };

    const shown = this.shown;
    let p = target;
    let h = heading;
    if (shown && Math.hypot(shown.x - target.x, shown.y - target.y) <= SNAP) {
      const dt = Math.max(0, Math.min(0.1, time - shown.at));
      const k = 1 - Math.exp(-dt / SMOOTHING);
      // Carry on at its speed, and close part of the gap.
      const moved = { x: shown.x + vx * dt, y: shown.y + vy * dt };
      p = { x: moved.x + (target.x - moved.x) * k, y: moved.y + (target.y - moved.y) * k };
      h = shown.heading + wrapAngle(heading - shown.heading) * k;
    }
    this.shown = { ...p, heading: h, at: time };
    return {
      p,
      heading: h,
      v: { x: vx, y: vy },
      drift: drift < 0 ? -1 : drift > 0 ? 1 : 0,
      ghost: ghost === 1,
      lap,
      next,
      last,
      lapTimes: [],
      finished: finished < 0 ? null : finished,
    };
  }
}
