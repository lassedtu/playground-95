"use client";

import { useEffect, useReducer, useState } from "react";
import { Button } from "@react95/core";

import { downloadUrl } from "../lib/download";
import { HANDWRITING_FAMILY, loadHandwriting } from "../lib/handwriting-font";
import { PRINT_FRAME } from "../lib/photo/instax-mini";
import { fitNoteFontSize, NOTE, writeNoteOnPrint } from "../lib/photo/note";

/** On-screen print width in CSS px; height follows the frame's aspect ratio. */
const DISPLAY_WIDTH = 260;
/** CSS px per print px. */
const DISPLAY_SCALE = DISPLAY_WIDTH / PRINT_FRAME.width;
export const PRINT_DISPLAY = {
  width: DISPLAY_WIDTH,
  height: Math.round(PRINT_FRAME.height * DISPLAY_SCALE),
};

/** Window content size that fits the print, padding and the Save button. */
export const PHOTO_WINDOW_SIZE = {
  width: PRINT_DISPLAY.width + 40,
  height: PRINT_DISPLAY.height + 80,
};

const pct = (printPx: number, of: number) => `${(printPx / of) * 100}%`;

type PhotoPrintProps = {
  /** Object URL of the framed PNG. Owned (and revoked) by the window. */
  url: string;
  filename: string;
  alt: string;
};

export function PhotoPrint({ url, filename, alt }: PhotoPrintProps) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  // Re-measure once the handwriting font has loaded (until then the fallback
  // font's widths would size the text).
  const [, fontLoaded] = useReducer(() => true, false);
  useEffect(() => {
    let active = true;
    loadHandwriting()
      .catch(() => {})
      .then(() => active && fontLoaded());
    return () => {
      active = false;
    };
  }, []);

  const fontSize = fitNoteFontSize(note, HANDWRITING_FAMILY) * DISPLAY_SCALE;
  const { area } = NOTE;

  async function save() {
    const text = note.trim();
    if (!text) return downloadUrl(url, filename);
    setSaving(true);
    setSaveError(false);
    try {
      await loadHandwriting();
      const blob = await writeNoteOnPrint(url, text, HANDWRITING_FAMILY);
      const noted = URL.createObjectURL(blob);
      downloadUrl(noted, filename);
      // Give the download a moment to start before freeing the file.
      setTimeout(() => URL.revokeObjectURL(noted), 10_000);
    } catch (error) {
      console.error("Saving photo failed:", error);
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex size-full flex-col items-center justify-center gap-4">
      <div
        className="relative drop-shadow-[2px_3px_3px_rgb(0_0_0/0.35)]"
        style={{ width: PRINT_DISPLAY.width, height: PRINT_DISPLAY.height }}
      >
        {/* Blob URL of a generated image; next/image can't optimize it. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt}
          width={PRINT_DISPLAY.width}
          height={PRINT_DISPLAY.height}
          draggable={false}
          className="block select-none"
        />
        <input
          type="text"
          aria-label="Note on the photo"
          placeholder="Write a note…"
          value={note}
          maxLength={NOTE.maxLength}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => setNote(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void save();
          }}
          className="absolute border-0 bg-transparent p-0 text-center outline-none placeholder:text-black/25 focus-visible:outline-1 focus-visible:outline-dashed focus-visible:outline-black/30"
          style={{
            left: pct(area.left, PRINT_FRAME.width),
            top: pct(area.top, PRINT_FRAME.height),
            width: pct(area.width, PRINT_FRAME.width),
            height: pct(area.height, PRINT_FRAME.height),
            fontFamily: HANDWRITING_FAMILY,
            fontSize,
            color: NOTE.color,
          }}
        />
      </div>
      <Button disabled={saving} onClick={() => void save()}>
        {saving ? "Saving…" : saveError ? "Retry save…" : "Save…"}
      </Button>
    </div>
  );
}
