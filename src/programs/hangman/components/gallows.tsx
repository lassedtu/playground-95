/** Wrong guesses allowed: one body part each. */
export const MAX_MISSES = 6;

/**
 * The gallows and stick figure, drawn in steps as `misses` goes up. Crisp
 * 2px lines in the Win95 palette; X eyes when the game is lost.
 */
export function Gallows({ misses, lost }: { misses: number; lost: boolean }) {
  const show = (step: number) => misses >= step;
  return (
    <svg viewBox="0 0 120 140" className="h-full max-h-56 w-auto" aria-hidden>
      {/* Gallows (wood) */}
      <g stroke="#804000" strokeWidth="4" strokeLinecap="square" fill="none">
        <path d="M10 132h70M28 132V8h52M28 30l22-22" />
      </g>
      <path d="M80 8v18" stroke="#808080" strokeWidth="2" />

      <g stroke="#000" strokeWidth="2.5" strokeLinecap="round" fill="none">
        {show(1) && <circle cx="80" cy="38" r="12" fill="#ffffe1" />}
        {show(2) && <path d="M80 50v38" />}
        {show(3) && <path d="M80 60l-16 16" />}
        {show(4) && <path d="M80 60l16 16" />}
        {show(5) && <path d="M80 88l-14 22" />}
        {show(6) && <path d="M80 88l14 22" />}
      </g>

      {show(1) &&
        (lost ? (
          <g stroke="#c00000" strokeWidth="1.8" strokeLinecap="round">
            <path d="M73 33l4 4M77 33l-4 4M83 33l4 4M87 33l-4 4" />
            <path d="M75 45q5-3 10 0" fill="none" />
          </g>
        ) : (
          <g fill="#000">
            <circle cx="75.5" cy="35.5" r="1.6" />
            <circle cx="84.5" cy="35.5" r="1.6" />
            {/* Gets more worried with every miss. */}
            <path
              d={misses >= 4 ? "M75 45q5-3 10 0" : "M75 43q5 3 10 0"}
              stroke="#000"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
            />
          </g>
        ))}
    </svg>
  );
}

/** Pixel-art gallows icon for the desktop and Start menu. */
export function HangmanIcon({ size = 32 }: { size?: 16 | 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden>
      <path fill="#804000" d="M1 14h9v1H1zM3 1h1v13H3zM3 1h8v1H3zM4 3h1v1H4zM5 2h1v1H5z" />
      <path fill="#808080" d="M10 2h1v2h-1z" />
      <path fill="#ffffe1" d="M9 4h3v3H9z" />
      <path fill="#000" d="M9 4h3v1H9zM8 5h1v2H8zM12 5h1v2h-1zM9 7h3v1H9zM10 8h1v3h-1zM9 9h1v1H9zM11 9h1v1h-1zM9 11h1v2H9zM11 11h1v2h-1z" />
    </svg>
  );
}
