"use client";

import { useEffect, useReducer, useState } from "react";
import { Button, useModal } from "@react95/core";

import { useDesktop } from "@/components/desktop/desktop-context";
import { downloadUrl } from "@/lib/download";
import { sendToPaint } from "@/programs/paint/lib/paint-inbox";

import { HANDWRITING_FAMILY, loadHandwriting } from "../lib/handwriting-font";
import { PRINT_FRAME } from "../lib/photo/instax-mini";
import { fitNoteFontSize, NOTE, writeNoteOnPrint } from "../lib/photo/note";

/** Must match Paint's id in programs/registry.tsx. */
const PAINT_PROGRAM_ID = "paint";

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
  const { openProgram } = useDesktop();
  const { restore, focus } = useModal();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"save" | "paint" | null>(null);
  const [error, setError] = useState<"save" | "paint" | null>(null);

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

  /** The print as a file, with the note written on it if there is one. */
  async function finishedPrint(): Promise<Blob> {
    const text = note.trim();
    if (!text) return (await fetch(url)).blob();
    await loadHandwriting();
    return writeNoteOnPrint(url, text, HANDWRITING_FAMILY);
  }

  async function run(action: "save" | "paint") {
    setBusy(action);
    setError(null);
    try {
      const blob = await finishedPrint();
      if (action === "paint") {
        sendToPaint(blob);
        openProgram(PAINT_PROGRAM_ID);
        // Bring Paint forward if it was already open (or minimized).
        restore(PAINT_PROGRAM_ID);
        focus(PAINT_PROGRAM_ID);
      } else {
        const file = URL.createObjectURL(blob);
        downloadUrl(file, filename);
        // Give the download a moment to start before freeing the file.
        setTimeout(() => URL.revokeObjectURL(file), 10_000);
      }
    } catch (failure) {
      console.error(`Photo ${action} failed:`, failure);
      setError(action);
    } finally {
      setBusy(null);
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
            if (event.key === "Enter") void run("save");
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
      <div className="flex gap-2">
        <Button disabled={busy !== null} onClick={() => void run("save")}>
          {busy === "save" ? "Saving…" : error === "save" ? "Retry save…" : "Save…"}
        </Button>
        <Button disabled={busy !== null} onClick={() => void run("paint")}>
          {busy === "paint" ? "Opening…" : error === "paint" ? "Retry Paint" : "Edit in Paint"}
        </Button>
      </div>
    </div>
  );
}
