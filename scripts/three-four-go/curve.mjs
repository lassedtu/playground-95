/**
 * The middle of a track design's road: a smooth closed curve (Catmull-Rom
 * through the design's points), sampled finely. Used to draw the track
 * (draw-track.mjs) and by the test bots that drive along it (bots.mjs).
 */

export const SAMPLES_PER_POINT = 48;

/**
 * `curve`: points along the road in driving order; `arc[i]`: distance along
 * the road to curve[i] (arc[count] = lapLength); `finishArc`: where the
 * finish line is.
 */
export function sampleCurve(design) {
  const { points } = design;
  const curve = [];
  for (let i = 0; i < points.length; i++) {
    const [p0, p1, p2, p3] = [-1, 0, 1, 2].map((k) => points[(i + k + points.length) % points.length]);
    for (let s = 0; s < SAMPLES_PER_POINT; s++) {
      const t = s / SAMPLES_PER_POINT;
      const t2 = t * t;
      const t3 = t2 * t;
      const at = (k) =>
        0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      curve.push([at(0), at(1)]);
    }
  }
  const count = curve.length;
  const arc = [0];
  for (let i = 1; i <= count; i++) {
    const [ax, ay] = curve[i - 1];
    const [bx, by] = curve[i % count];
    arc.push(arc[i - 1] + Math.hypot(bx - ax, by - ay));
  }
  const lapLength = arc[count];
  const finishArc = arc[Math.round(design.finish * SAMPLES_PER_POINT)];
  return { curve, arc, count, lapLength, finishArc };
}
