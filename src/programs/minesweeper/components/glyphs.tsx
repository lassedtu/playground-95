/** Minesweeper's pixel-art glyphs, drawn on a 16×16 grid. */

export function MineGlyph({ crossed = false }: { crossed?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="size-[70%]" shapeRendering="crispEdges" aria-hidden>
      {/* Spikes */}
      <path fill="#000" d="M7 1h1v2H7zM7 13h1v2H7zM1 7h2v1H1zM12 7h2v1h-2zM3 3h1v1H3zM11 3h1v1h-1zM3 11h1v1H3zM11 11h1v1h-1z" />
      {/* Body */}
      <path fill="#000" d="M5 3h5v1h1v1h1v5h-1v1h-1v1H5v-1H4v-1H3V5h1V4h1z" />
      {/* Shine */}
      <path fill="#fff" d="M5 5h2v2H5z" />
      {crossed && <path fill="#f00" d="M1 1h2v1h1v1h1v1h1v1h1v1h1V5h1V4h1V3h1V2h1V1h2v2h-1v1h-1v1h-1v1h-1v1H9v1h1v1h1v1h1v1h1v1h1v2h-2v-1h-1v-1h-1v-1H9V9H8v1H7v1H6v1H5v1H4v1H3v1H1v-2h1v-1h1v-1h1v-1h1V9h1V8H5V7H4V6H3V5H2V4H1z" />}
    </svg>
  );
}

export function FlagGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="size-[70%]" shapeRendering="crispEdges" aria-hidden>
      <path fill="#f00" d="M5 2h3v5H5V6H3V5H2V4h1V3h2z" />
      <path fill="#000" d="M7 7h1v3H7zM5 10h5v1H5zM3 11h9v2H3z" />
    </svg>
  );
}

export type Mood = "smile" | "worried" | "dead" | "cool";

/** The smiley on the New Game button. */
export function SmileyGlyph({ mood }: { mood: Mood }) {
  return (
    <svg viewBox="0 0 17 17" width={17} height={17} shapeRendering="crispEdges" aria-hidden>
      <path fill="#000" d="M6 1h5v1h2v1h1v1h1v2h1v5h-1v2h-1v1h-1v1h-2v1H6v-1H4v-1H3v-1H2v-2H1V6h1V4h1V3h1V2h2z" />
      <path fill="#ff0" d="M6 2h5v1h2v1h1v2h1v5h-1v2h-1v1h-2v1H6v-1H4v-1H3v-2H2V6h1V4h1V3h2z" />
      {mood === "dead" ? (
        <path fill="#000" d="M5 5h1v1H5zM7 5h1v1H7zM6 6h1v1H6zM5 7h1v1H5zM7 7h1v1H7zM9 5h1v1H9zM11 5h1v1h-1zM10 6h1v1h-1zM9 7h1v1H9zM11 7h1v1h-1z" />
      ) : mood === "cool" ? (
        <path fill="#000" d="M3 6h11v1h-1v1h-2V7H9v1H8V7H6v1H4V7H3z" />
      ) : (
        <path fill="#000" d="M6 6h1v2H6zM10 6h1v2h-1z" />
      )}
      {mood === "worried" ? (
        <path fill="#000" d="M7 10h3v1h1v1h-1v1H7v-1H6v-1h1z" />
      ) : mood === "dead" ? (
        <path fill="#000" d="M6 12h5v1h1v1h-1v-1H6v1H5v-1h1z" />
      ) : (
        <path fill="#000" d="M5 10h1v1h1v1h3v-1h1v-1h1v1h-1v1h-1v1H7v-1H6v-1H5z" />
      )}
    </svg>
  );
}
