import type { SVGProps } from "react";

/**
 * Pixel-art 8-ball in the style of the Win95 icons (none of them is a ball).
 * Drawn on a 16×16 grid, so it stays crisp at 16 and 32 px.
 */
export function EightBallIcon({ size = 32, ...props }: SVGProps<SVGSVGElement> & { size?: 16 | 32 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      aria-hidden
      {...props}
    >
      {/* Ball: black disc with a 1px dark-grey rim and a grey highlight. */}
      <path
        fill="#000"
        d="M5 1h6v1h2v2h1v2h1v4h-1v2h-1v2h-2v1H5v-1H3v-2H2v-2H1V6h1V4h1V2h2z"
      />
      <path fill="#808080" d="M4 3h2v1H5v1H4zM3 5h1v2H3z" />
      {/* White circle with the 8. */}
      <path fill="#fff" d="M7 4h3v1h1v4h-1v1H7V9H6V5h1z" />
      <path fill="#000" d="M8 5h1v1H8zM8 7h1v1H8zM7 6h1v1H7zM9 6h1v1H9zM7 8h1v1H7zM9 8h1v1H9zM8 9h1v-1H8z" />
    </svg>
  );
}
