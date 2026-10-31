"use client";

import type { ReactNode } from "react";

import { BACK_BODY, FRONT_BODY, fillWithRegion, regionStyle } from "../data/camera-layout";

export type CameraFacing = "front" | "back";

type CameraFlipProps = {
  facing: CameraFacing;
  /** Content laid out over the full front photo. */
  front: ReactNode;
  /** Content laid out over the full back photo. */
  back: ReactNode;
};

/**
 * Turns the camera around (3D flip about its vertical axis). Placed over the
 * front photo's camera body; each side's photo is scaled so its body fills
 * that box, so front and back line up. The hidden side is inert.
 *
 * Must be inside a box with the front photo's aspect ratio.
 */
export function CameraFlip({ facing, front, back }: CameraFlipProps) {
  return (
    <div className="absolute perspective-[1600px]" style={regionStyle(FRONT_BODY)}>
      <div
        className={`relative size-full transition-transform duration-700 ease-in-out transform-3d motion-reduce:transition-none ${
          facing === "back" ? "rotate-y-180" : ""
        }`}
      >
        <div className="absolute inset-0 backface-hidden" inert={facing !== "front"}>
          <div className="absolute" style={fillWithRegion(FRONT_BODY)}>
            {front}
          </div>
        </div>
        <div className="absolute inset-0 rotate-y-180 backface-hidden" inert={facing !== "back"}>
          <div className="absolute" style={fillWithRegion(BACK_BODY)}>
            {back}
          </div>
        </div>
      </div>
    </div>
  );
}
