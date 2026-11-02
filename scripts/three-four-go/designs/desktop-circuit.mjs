/**
 * Desktop Circuit, 3-4-Go!'s first track: a plain road on grass with a long
 * top straight, sweeping corners and an S-bend on each side. Drawn into a
 * logic layer by draw-track.mjs.
 *
 * The road follows a smooth closed curve through `points` (map pixels,
 * driving order: clockwise on screen, starting on the top straight).
 */
const desktopCircuit = {
  name: "Desktop Circuit",
  laps: 3,
  size: 1024,
  roadWidth: 80,
  /** Solid wall around the map's edge, so nobody drives off into nothing. */
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

export default desktopCircuit;
