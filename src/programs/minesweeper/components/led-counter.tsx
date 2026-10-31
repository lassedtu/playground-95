/**
 * Three-digit red 7-segment display, like Minesweeper's mine counter and
 * timer. Unlit segments glow faintly, as on the original.
 */

// Segment shapes on a 13×23 grid: a (top), b, c (right), d (bottom), e, f (left), g (middle).
const SEGMENTS = {
  a: "2,1 11,1 9,3 4,3",
  b: "12,2 12,11 10,10 10,4",
  c: "12,12 12,21 10,19 10,13",
  d: "4,20 9,20 11,22 2,22",
  e: "1,12 3,13 3,19 1,21",
  f: "1,2 3,4 3,10 1,11",
  g: "2,11.5 4,10.5 9,10.5 11,11.5 9,12.5 4,12.5",
} as const;

type Segment = keyof typeof SEGMENTS;

const DIGITS: Record<string, readonly Segment[]> = {
  "0": ["a", "b", "c", "d", "e", "f"],
  "1": ["b", "c"],
  "2": ["a", "b", "g", "e", "d"],
  "3": ["a", "b", "g", "c", "d"],
  "4": ["f", "g", "b", "c"],
  "5": ["a", "f", "g", "c", "d"],
  "6": ["a", "f", "g", "e", "d", "c"],
  "7": ["a", "b", "c"],
  "8": ["a", "b", "c", "d", "e", "f", "g"],
  "9": ["a", "b", "c", "d", "f", "g"],
  "-": ["g"],
};

const ALL = Object.keys(SEGMENTS) as Segment[];

function Digit({ char }: { char: string }) {
  const lit = new Set(DIGITS[char] ?? []);
  return (
    <svg viewBox="0 0 13 23" width={13} height={23} aria-hidden>
      {ALL.map((segment) => (
        <polygon key={segment} points={SEGMENTS[segment]} fill={lit.has(segment) ? "#ff0000" : "#400000"} />
      ))}
    </svg>
  );
}

/** Shows -99…999, like the original's counters. */
function format(value: number): string {
  const clamped = Math.max(-99, Math.min(999, Math.trunc(value)));
  return clamped < 0 ? `-${String(-clamped).padStart(2, "0")}` : String(clamped).padStart(3, "0");
}

export function LedCounter({ value, label }: { value: number; label: string }) {
  return (
    <div
      role="img"
      aria-label={`${label}: ${value}`}
      className="flex gap-px border border-t-[#808080] border-r-white border-b-white border-l-[#808080] bg-black p-px"
    >
      {[...format(value)].map((char, i) => (
        <Digit key={i} char={char} />
      ))}
    </div>
  );
}
