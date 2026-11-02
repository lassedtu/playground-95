import { COLLISION } from "../data/tuning";
import { SURFACE } from "../data/palette";
import { type Car, carCorners } from "./car";
import { surfaceAt, type Track } from "./track";
import { dot, length, type Vec2 } from "./vector";

/** Where a collision happened and which way it pushed, for the debug view. */
export type Contact = { p: Vec2; normal: Vec2 };

const isWall = (track: Track, x: number, y: number) => surfaceAt(track, x, y) === SURFACE.wall;
/** Two corners this close in depth count as one flush contact between them. */
const FLUSH = 1;

/** The hitbox's corners and edge midpoints: what's checked against walls. */
function probes(car: Car): Vec2[] {
  const corners = carCorners(car.p, car.heading, car.length, car.width);
  const mids = corners.map((c, i) => {
    const d = corners[(i + 1) % 4];
    return { x: (c.x + d.x) / 2, y: (c.y + d.y) / 2 };
  });
  return [...corners, ...mids];
}

/**
 * Direction out of the wall at a point: away from the wall pixels around it
 * (the average offset of nearby wall pixels, reversed). Null if it can't
 * tell (e.g. deep inside a big wall).
 */
function wallNormal(track: Track, p: Vec2): Vec2 | null {
  const r = COLLISION.normalRadius;
  let sx = 0;
  let sy = 0;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r || !isWall(track, p.x + dx, p.y + dy)) continue;
      sx += dx;
      sy += dy;
    }
  }
  const l = Math.hypot(sx, sy);
  return l > 0 ? { x: -sx / l, y: -sy / l } : null;
}

/** How far a point has to move along `normal` to be out of the wall. */
function wallDepth(track: Track, p: Vec2, normal: Vec2) {
  for (let d = 0.5; d <= COLLISION.maxDepth; d += 0.5) {
    if (!isWall(track, p.x + normal.x * d, p.y + normal.y * d)) return d;
  }
  return COLLISION.maxDepth;
}

/**
 * Keeps a car out of walls: the deepest probe point in a wall pushes the
 * car out along the wall's normal; speed into the wall bounces back (a bit),
 * speed along it is scraped down. Drifting stops.
 */
export function collideWithWalls(track: Track, car: Car, contacts: Contact[]) {
  for (let iteration = 0; iteration < COLLISION.iterations; iteration++) {
    let deepest: { p: Vec2; normal: Vec2; depth: number } | null = null;
    for (const p of probes(car)) {
      if (!isWall(track, p.x, p.y)) continue;
      const normal = wallNormal(track, p);
      if (!normal) continue;
      const depth = wallDepth(track, p, normal);
      if (!deepest || depth > deepest.depth) deepest = { p, normal, depth };
    }
    if (!deepest) {
      // Centre stuck inside a wall with no way out found: undo the move.
      if (iteration === 0 && isWall(track, car.p.x, car.p.y)) {
        car.p = { ...car.previous.p };
        car.v = { x: 0, y: 0 };
      }
      return;
    }

    const { normal, depth } = deepest;
    car.p = { x: car.p.x + normal.x * (depth + 0.01), y: car.p.y + normal.y * (depth + 0.01) };
    const into = dot(car.v, normal);
    if (into < 0) {
      const along = { x: car.v.x - normal.x * into, y: car.v.y - normal.y * into };
      car.v = {
        x: along.x * COLLISION.wallScrape - normal.x * into * COLLISION.wallBounce,
        y: along.y * COLLISION.wallScrape - normal.y * into * COLLISION.wallBounce,
      };
      car.drift = 0;
    }
    contacts.push({ p: deepest.p, normal });
  }
}

/** A box's corners and its two axes (forward and sideways). */
function box(p: Vec2, heading: number, car: Car) {
  const corners = carCorners(p, heading, car.length, car.width);
  const f = { x: Math.cos(heading), y: Math.sin(heading) };
  return { corners, axes: [f, { x: -f.y, y: f.x }] };
}

function project(corners: Vec2[], axis: Vec2) {
  let min = Infinity;
  let max = -Infinity;
  for (const c of corners) {
    const t = dot(c, axis);
    min = Math.min(min, t);
    max = Math.max(max, t);
  }
  return { min, max };
}

const overlapOn = (a: Vec2[], b: Vec2[], axis: Vec2) => {
  const pa = project(a, axis);
  const pb = project(b, axis);
  return Math.min(pa.max, pb.max) - Math.max(pa.min, pb.min);
};

/**
 * Overlap of two hitboxes (separating axis test): the push direction from
 * `a` to `b`, how deep they overlap, and roughly where they touch. Null when
 * they don't overlap.
 *
 * Normally the push goes along the axis with the smallest overlap. But fast
 * cars can sink in further than that in one tick (a slightly off-centre
 * head-on hit overlaps less sideways than lengthways), so an axis on which
 * they were still apart last tick (the side they came from) wins.
 */
function overlap(a: Car, b: Car) {
  const A = box(a.p, a.heading, a);
  const B = box(b.p, b.heading, b);
  const lastA = box(a.previous.p, a.previous.heading, a).corners;
  const lastB = box(b.previous.p, b.previous.heading, b).corners;
  let best: { normal: Vec2; depth: number; fromA: boolean; entry: boolean } | null = null;
  for (const [axis, fromA] of [...A.axes.map((x) => [x, true] as const), ...B.axes.map((x) => [x, false] as const)]) {
    const depth = overlapOn(A.corners, B.corners, axis);
    if (depth <= 0) return null;
    const entry = overlapOn(lastA, lastB, axis) <= 0;
    if (!best || (entry && !best.entry) || (entry === best.entry && depth < best.depth)) {
      // Point the normal from a towards b.
      const towards = dot({ x: b.p.x - a.p.x, y: b.p.y - a.p.y }, axis) >= 0;
      best = { normal: towards ? axis : { x: -axis.x, y: -axis.y }, depth, fromA, entry };
    }
  }
  if (!best) return null;
  // Contact: the corners of the other box that reach furthest into this one
  // (averaged when two are about as deep, e.g. a flush hit on a bumper).
  const n = best.normal;
  const reaching = best.fromA ? B.corners.map((c) => ({ c, d: -dot(c, n) })) : A.corners.map((c) => ({ c, d: dot(c, n) }));
  reaching.sort((x, y) => y.d - x.d);
  const flush = reaching[0].d - reaching[1].d < FLUSH;
  const contact = flush
    ? { x: (reaching[0].c.x + reaching[1].c.x) / 2, y: (reaching[0].c.y + reaching[1].c.y) / 2 }
    : reaching[0].c;
  return { ...best, contact };
}

/**
 * Turns a car a little when it's hit hard and off-centre (there's no real
 * spinning in the model): more the further from its middle the hit is (the
 * lever, −1 to 1 from the middle to a bumper) and the harder it is.
 */
function nudge(car: Car, contact: Vec2, impulse: Vec2) {
  const strength = length(impulse);
  if (strength <= COLLISION.hardHit) return;
  const rx = contact.x - car.p.x;
  const ry = contact.y - car.p.y;
  const lever = (rx * impulse.y - ry * impulse.x) / (strength * (car.length / 2));
  const hard = Math.min(1, (strength - COLLISION.hardHit) / (COLLISION.hardHit * 3));
  car.heading += Math.max(-1, Math.min(1, lever)) * hard * COLLISION.maxNudge;
}

/**
 * Bumps between cars: overlapping hitboxes are pushed apart (the lighter car
 * moves more), and their speeds along the push direction bounce off each
 * other like billiard balls (a bit soft), with some friction sideways.
 */
export function collideCars(cars: Car[], contacts: Contact[]) {
  for (let iteration = 0; iteration < COLLISION.iterations; iteration++) {
    for (let i = 0; i < cars.length; i++) {
      for (let j = i + 1; j < cars.length; j++) {
        const a = cars[i];
        const b = cars[j];
        const reach = (Math.hypot(a.length, a.width) + Math.hypot(b.length, b.width)) / 2;
        if (Math.abs(a.p.x - b.p.x) > reach || Math.abs(a.p.y - b.p.y) > reach) continue;
        const hit = overlap(a, b);
        if (!hit) continue;

        const { normal: n, depth, contact } = hit;
        const inverseA = 1 / a.mass;
        const inverseB = 1 / b.mass;
        const share = depth / (inverseA + inverseB);
        a.p = { x: a.p.x - n.x * share * inverseA, y: a.p.y - n.y * share * inverseA };
        b.p = { x: b.p.x + n.x * share * inverseB, y: b.p.y + n.y * share * inverseB };

        const relative = { x: b.v.x - a.v.x, y: b.v.y - a.v.y };
        const closing = dot(relative, n);
        if (closing < 0) {
          const push = (-(1 + COLLISION.carBounce) * closing) / (inverseA + inverseB);
          // Friction along the contact, at most a share of the push.
          const t = { x: -n.y, y: n.x };
          const slide = dot(relative, t);
          const limit = COLLISION.carFriction * push;
          const rub = Math.max(-limit, Math.min(limit, -slide / (inverseA + inverseB)));
          const impulse = { x: n.x * push + t.x * rub, y: n.y * push + t.y * rub };
          a.v = { x: a.v.x - impulse.x * inverseA, y: a.v.y - impulse.y * inverseA };
          b.v = { x: b.v.x + impulse.x * inverseB, y: b.v.y + impulse.y * inverseB };
          nudge(a, contact, { x: -impulse.x, y: -impulse.y });
          nudge(b, contact, impulse);
          if (length(impulse) > COLLISION.hardHit) {
            a.drift = 0;
            b.drift = 0;
          }
        }
        if (iteration === 0) contacts.push({ p: contact, normal: n });
      }
    }
  }
}
