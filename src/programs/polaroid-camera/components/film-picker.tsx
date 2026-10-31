"use client";

import { useEffect, useRef } from "react";
import { Frame } from "@react95/core";

import { get2d } from "../lib/photo/capture";
import { applyFilmLook } from "../lib/photo/film-look";
import type { Film } from "../lib/photo/films";

/** Content size of the Film window. */
export const FILM_PICKER_SIZE = { width: 380, height: 200 };

type FilmPickerProps = {
  films: readonly Film[];
  selectedId: string;
  onSelect: (film: Film) => void;
  onCancel: () => void;
};

/**
 * Content of the Film window: the film packs as a Win95 "Large Icons" list.
 * Clicking a pack picks it. Escape cancels.
 */
export function FilmPicker({ films, selectedId, onSelect, onCancel }: FilmPickerProps) {
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedRef.current?.focus();
  }, []);

  return (
    <div
      className="flex size-full flex-col gap-2"
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
      }}
    >
      <p id="film-picker-label">Choose a filter:</p>
      <Frame
        role="group"
        aria-labelledby="film-picker-label"
        boxShadow="$in"
        bgColor="$inputBackground"
        className="flex min-h-0 flex-1 justify-around gap-2 p-2"
      >
        {films.map((film) => {
          const selected = film.id === selectedId;
          return (
            <button
              key={film.id}
              ref={selected ? selectedRef : undefined}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(film)}
              className="group flex min-h-0 w-20 cursor-pointer flex-col items-center gap-1 border-0 bg-transparent p-0 outline-none"
            >
              <span className="flex min-h-0 w-full flex-1 items-center justify-center">
                <FilmPackSwatch film={film} />
              </span>
              <span
                className={`px-1 leading-tight ${
                  selected ? "bg-win-navy text-white" : "text-black"
                } group-focus-visible:outline-1 group-focus-visible:outline-dotted group-focus-visible:outline-current`}
              >
                {film.name}
              </span>
            </button>
          );
        })}
      </Frame>
    </div>
  );
}

/** Max device pixels per CSS pixel to render swatches at. */
const MAX_DPR = 2;

/**
 * The film's pack photo developed with the film's own look, so each pack
 * previews its filter (the photos alone look nearly identical).
 */
function FilmPackSwatch({ film }: { film: Film }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    const image = new Image();
    image.src = film.pack.src;
    image
      .decode()
      .then(() => {
        if (cancelled) return;
        const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
        canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
        canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
        const ctx = get2d(canvas, { willReadFrequently: true });
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
        applyFilmLook(pixels, film.look);
        ctx.putImageData(pixels, 0, 0);
      })
      .catch(() => {}); // the swatch just stays empty
    return () => {
      cancelled = true;
    };
  }, [film]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ aspectRatio: `${film.pack.width} / ${film.pack.height}` }}
      className="h-full max-w-full drop-shadow-[1px_2px_2px_rgb(0_0_0/0.4)] transition-transform duration-100 group-hover:-translate-y-0.5 group-aria-pressed:-translate-y-1"
    />
  );
}
