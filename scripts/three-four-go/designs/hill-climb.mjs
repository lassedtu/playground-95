/**
 * Hill Climb: fields below a castle, a cobbled road with a long top
 * straight, sweeping corners and an S-bend on each side. (The old Desktop
 * Circuit layout.) Drawn into a logic layer by draw-track.mjs.
 *
 * The road follows a smooth closed curve through `points` (map pixels,
 * driving order: clockwise on screen, starting on the top straight).
 */
const hillClimb = {
  name: "Hill Climb",
  /** Ground theme (data/ground-style.ts); the sky is picked by track id (data/skies.ts). */
  theme: "castle",
  laps: 3,
  size: 1024,
  roadWidth: 80,
  /** What's around the map's edge ("wall" or "water"), and how wide. */
  edge: "wall",
  border: 12,
  points: [
    [300, 160],
    [720, 160],
    [880, 260],
    [860, 460],
    [640, 520],
    [700, 700],
    [860, 820],
    [700, 900],
    [360, 880],
    [180, 760],
    [300, 560],
    [150, 420],
    [170, 230],
  ],
  /** The finish line: this far (0–1) along the curve from points[0] to points[1]. */
  finish: 0.6,
  /** Checkpoints after the finish line, spread evenly along the lap. */
  checkpoints: 12,
};

export default hillClimb;
