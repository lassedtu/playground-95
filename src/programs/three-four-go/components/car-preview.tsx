"use client";

import { useEffect, useState } from "react";

import { FRAMES, type Vehicle } from "../data/vehicles";

/** Sheet row used for previews (the highest viewing angle, as seen from behind your car). */
const PREVIEW_ROW = 3;
const SPIN_MS = 90;

/** A car slowly turning on the spot, from its sprite sheet (still if you prefer reduced motion). */
export function CarPreview({ vehicle }: { vehicle: Vehicle }) {
  const [frame, setFrame] = useState(FRAMES / 4 + 4);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % FRAMES), SPIN_MS);
    return () => clearInterval(id);
  }, []);
  return (
    <div
      role="img"
      aria-label={vehicle.label}
      className="shrink-0 [image-rendering:pixelated]"
      style={{
        width: vehicle.frameWidth,
        height: vehicle.frameHeight,
        backgroundImage: `url(${vehicle.sheet.src})`,
        backgroundPosition: `${-frame * vehicle.frameWidth}px ${-PREVIEW_ROW * vehicle.frameHeight}px`,
      }}
    />
  );
}
