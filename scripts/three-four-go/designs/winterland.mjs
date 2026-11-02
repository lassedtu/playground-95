/**
 * Winterland: a winding lane through the snow past the village, with a
 * hairpin at the bottom and a quick left-right in the middle.
 */
const winterland = {
  name: "Winterland",
  theme: "snow",
  laps: 3,
  size: 1024,
  roadWidth: 76,
  edge: "wall",
  border: 12,
  points: [
    [260, 170],
    [620, 150],
    [860, 220],
    [880, 420],
    [700, 470],
    [540, 420],
    [420, 520],
    [560, 640],
    [800, 640],
    [880, 800],
    [700, 900],
    [380, 890],
    [180, 760],
    [150, 520],
    [170, 300],
  ],
  finish: 0.5,
  checkpoints: 14,
};

export default winterland;
