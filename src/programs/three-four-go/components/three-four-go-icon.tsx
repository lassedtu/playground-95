import type { SVGProps } from "react";

/** Pixel-art road disappearing into the horizon with a red car on it, Win95 icon style. */
export function ThreeFourGoIcon({ size = 32, ...props }: SVGProps<SVGSVGElement> & { size?: 16 | 32 }) {
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
      {/* Frame, sky and grass */}
      <path fill="#000" d="M1 1h14v14H1z" />
      <path fill="#0080ff" d="M2 2h12v4H2z" />
      <path fill="#fff" d="M3 3h3v1H3zM10 4h3v1h-3z" />
      <path fill="#008000" d="M2 6h12v8H2z" />
      {/* Road narrowing towards the horizon */}
      <path fill="#808080" d="M7 6h2v2H7zM6 8h4v2H6zM5 10h6v2H5zM4 12h8v2H4z" />
      <path fill="#fff" d="M8 7h1v1H8zM8 10h1v1H8z" />
      {/* Red car */}
      <path fill="#f00" d="M6 11h4v2H6z" />
      <path fill="#800000" d="M6 13h1v1H6zM9 13h1v1H9z" />
      <path fill="#000080" d="M7 11h2v1H7z" />
    </svg>
  );
}
