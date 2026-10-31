import type { SVGProps } from "react";

/** Pixel-art bingo card with two red dauber marks, in the Win95 icon style. */
export function BingoIcon({ size = 32, ...props }: SVGProps<SVGSVGElement> & { size?: 16 | 32 }) {
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
      {/* Card with a navy header */}
      <path fill="#000" d="M1 1h14v14H1z" />
      <path fill="#fff" d="M2 5h12v9H2z" />
      <path fill="#000080" d="M2 2h12v3H2z" />
      {/* Grid lines */}
      <path fill="#808080" d="M5 5h1v9H5zM8 5h1v9H8zM11 5h1v9h-1zM2 8h12v1H2zM2 11h12v1H2z" />
      {/* Dauber marks */}
      <path fill="#f00" d="M3 6h2v2H3zM9 9h2v2H9zM6 12h2v2H6z" />
    </svg>
  );
}
