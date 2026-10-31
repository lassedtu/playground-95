"use client";

import { Button } from "@react95/core";

import { downloadUrl } from "../lib/download";
import { PRINT_FRAME } from "../lib/photo/instax-mini";

/** On-screen print size: 216 px wide (≈ 4 px per mm), frame's aspect ratio. */
const DISPLAY_WIDTH = 216;
export const PRINT_DISPLAY = {
  width: DISPLAY_WIDTH,
  height: Math.round((DISPLAY_WIDTH * PRINT_FRAME.height) / PRINT_FRAME.width),
};

/** Window content size that fits the print, padding and the Save button. */
export const PHOTO_WINDOW_SIZE = {
  width: PRINT_DISPLAY.width + 40,
  height: PRINT_DISPLAY.height + 80,
};

type PhotoPrintProps = {
  /** Object URL of the framed PNG. Owned (and revoked) by the window. */
  url: string;
  filename: string;
  alt: string;
};

export function PhotoPrint({ url, filename, alt }: PhotoPrintProps) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-4">
      {/* Blob URL of a generated image; next/image can't optimize it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        width={PRINT_DISPLAY.width}
        height={PRINT_DISPLAY.height}
        draggable={false}
        className="select-none drop-shadow-[2px_3px_3px_rgb(0_0_0/0.35)]"
      />
      <Button onClick={() => downloadUrl(url, filename)}>Save…</Button>
    </div>
  );
}
