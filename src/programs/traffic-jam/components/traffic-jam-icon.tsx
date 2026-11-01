import type { SVGProps } from "react";

/** Pixel-art parking lot with the red car heading for the exit, Win95 icon style. */
export function TrafficJamIcon({ size = 32, ...props }: SVGProps<SVGSVGElement> & { size?: 16 | 32 }) {
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
      {/* Board with the exit gap on the right */}
      <path fill="#000" d="M1 1h14v14H1z" />
      <path fill="#808080" d="M2 2h12v12H2zM14 6h1v4h-1z" />
      {/* Red car */}
      <path fill="#f00" d="M3 6h8v4H3z" />
      <path fill="#800000" d="M3 9h8v1H3z" />
      <path fill="#000080" d="M8 7h2v2H8z" />
      {/* Yellow car (vertical) */}
      <path fill="#ff0" d="M12 2h2v4h-2z" />
      <path fill="#000080" d="M12 3h2v1h-2z" />
      {/* Blue truck */}
      <path fill="#0000ff" d="M3 11h9v2H3z" />
      <path fill="#fff" d="M10 11h2v1h-2z" />
    </svg>
  );
}
