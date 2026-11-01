"use client";

import { type KeyboardEvent, type PointerEvent, useRef, useState } from "react";
import Image from "next/image";

import { EXIT_ROW, type Move, offsetOf, type Piece, SIZE, slideRange } from "../lib/board";
import type { Look } from "../lib/puzzles";

/** Sunken frame around the lot, in px. */
const BORDER = 3;
/** Room on the right for the exit arrow. */
export const EXIT_WIDTH = 22;
export const lotSize = (cell: number) => ({ width: SIZE * cell + 2 * BORDER + EXIT_WIDTH, height: SIZE * cell + 2 * BORDER });

const COLOURS = new Set(["red", "blue", "green", "yellow", "white", "black", "magenta", "brown"]);

/** "sedan-blue" → "blue sedan". */
function vehicleName(look: Look, index: number) {
  if (index === 0) return "red car";
  const words = look.sprite.name.split("-");
  const colour = COLOURS.has(words.at(-1)!) ? words.pop() : null;
  return [colour, ...words].filter(Boolean).join(" ");
}

function positionLabel(piece: Piece) {
  const along = offsetOf(piece) + 1;
  const span = `${along}–${along + piece.length - 1}`;
  return piece.horizontal ? `row ${piece.row + 1}, columns ${span}` : `column ${piece.col + 1}, rows ${span}`;
}

type Drag = { piece: number; pointerId: number; origin: number; start: number; min: number; max: number; offset: number };

type ParkingLotProps = {
  pieces: readonly Piece[];
  looks: readonly Look[];
  cell: number;
  /** No more moves (solved). */
  locked: boolean;
  /** The red car drives out through the exit. */
  escaping: boolean;
  /** Piece the last hint moved, highlighted briefly. */
  highlight: number | null;
  onMove: (move: Move) => void;
};

/**
 * The 6×6 lot. Vehicles are dragged along their lane (they stop at whatever
 * is in the way and snap to a cell on release), or focused with Tab and
 * moved one cell at a time with the arrow keys.
 */
export function ParkingLot({ pieces, looks, cell, locked, escaping, highlight, onMove }: ParkingLotProps) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);

  const updateDrag = (next: Drag | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  function onPointerDown(event: PointerEvent<HTMLButtonElement>, index: number) {
    if (locked || dragRef.current || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const piece = pieces[index];
    const { min, max } = slideRange(pieces, index);
    const start = offsetOf(piece);
    updateDrag({
      piece: index,
      pointerId: event.pointerId,
      origin: piece.horizontal ? event.clientX : event.clientY,
      start,
      min,
      max,
      offset: start,
    });
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const current = dragRef.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const piece = pieces[current.piece];
    const delta = ((piece.horizontal ? event.clientX : event.clientY) - current.origin) / cell;
    const offset = Math.min(current.max, Math.max(current.min, current.start + delta));
    if (offset !== current.offset) updateDrag({ ...current, offset });
  }

  function onPointerUp(event: PointerEvent<HTMLButtonElement>) {
    const current = dragRef.current;
    if (!current || current.pointerId !== event.pointerId) return;
    updateDrag(null);
    const to = Math.round(current.offset);
    if (to !== current.start && event.type === "pointerup") onMove({ piece: current.piece, to });
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const piece = pieces[index];
    const step =
      { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -1, ArrowDown: 1 }[event.key as "ArrowLeft"] ?? 0;
    if (!step) return;
    event.preventDefault();
    const sideways = event.key === "ArrowLeft" || event.key === "ArrowRight";
    if (locked || sideways !== piece.horizontal) return;
    const { min, max } = slideRange(pieces, index);
    const to = offsetOf(piece) + step;
    if (to >= min && to <= max) onMove({ piece: index, to });
  }

  const inner = SIZE * cell;

  return (
    <div className="relative shrink-0" style={{ paddingRight: EXIT_WIDTH }}>
      <div
        className="relative border-t-[#808080] border-r-white border-b-white border-l-[#808080]"
        style={{ borderWidth: BORDER, borderStyle: "solid" }}
      >
        <div
          role="group"
          aria-label={`Parking lot, ${SIZE} by ${SIZE}. Get the red car out through the exit on the right of row ${EXIT_ROW + 1}.`}
          className="relative touch-none overflow-hidden bg-[#808080] select-none [-webkit-touch-callout:none]"
          style={{
            width: inner,
            height: inner,
            // Faint parking bays.
            backgroundImage:
              "linear-gradient(to right, rgb(0 0 0 / 0.18) 1px, transparent 1px), linear-gradient(to bottom, rgb(0 0 0 / 0.18) 1px, transparent 1px)",
            backgroundSize: `${cell}px ${cell}px`,
          }}
        >
          {pieces.map((piece, index) => {
            const look = looks[index];
            const dragging = drag?.piece === index;
            const offset = dragging ? drag.offset : offsetOf(piece);
            const gone = escaping && index === 0;
            const left = gone ? (SIZE + 1) * cell : (piece.horizontal ? offset : piece.col) * cell;
            const top = (piece.horizontal ? piece.row : offset) * cell;
            const width = (piece.horizontal ? piece.length : 1) * cell;
            const height = (piece.horizontal ? 1 : piece.length) * cell;
            return (
              <button
                key={piece.id}
                type="button"
                aria-label={`${vehicleName(look, index)}, ${positionLabel(piece)}. Use the arrow keys to slide it ${piece.horizontal ? "left or right" : "up or down"}.`}
                aria-disabled={locked || undefined}
                onPointerDown={(event) => onPointerDown(event, index)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onKeyDown={(event) => onKeyDown(event, index)}
                className={`group absolute border-0 bg-transparent p-[2px] outline-none motion-reduce:!transition-none ${locked ? "cursor-default" : "cursor-grab active:cursor-grabbing"} ${dragging ? "z-10" : ""}`}
                style={{
                  left,
                  top,
                  width,
                  height,
                  transition: dragging ? "none" : gone ? "left 450ms ease-in" : "left 120ms ease-out, top 120ms ease-out",
                }}
              >
                <span
                  className={`flex size-full items-center justify-center p-[3px] shadow-[inset_-1px_-1px_#000,inset_1px_1px_#fff,inset_-2px_-2px_#808080,inset_2px_2px_#dfdfdf] group-focus-visible:outline-1 group-focus-visible:-outline-offset-4 group-focus-visible:outline-black group-focus-visible:outline-dotted ${highlight === index ? "bg-[#ffffe1]" : "bg-[#c0c0c0]"}`}
                >
                  <Image
                    src={look.sprite[look.direction]}
                    alt=""
                    unoptimized
                    draggable={false}
                    className="pointer-events-none size-full object-contain [image-rendering:pixelated]"
                  />
                </span>
              </button>
            );
          })}
        </div>
        {/* The exit: a gap in the frame next to the red car's row. */}
        <span
          aria-hidden
          className="absolute bg-[#808080]"
          style={{ right: -BORDER, width: BORDER, top: EXIT_ROW * cell, height: cell }}
        />
      </div>
      <span
        aria-hidden
        title="Exit"
        className="absolute right-0 flex items-center justify-center font-bold text-win-navy"
        style={{ width: EXIT_WIDTH, top: BORDER + EXIT_ROW * cell, height: cell, fontSize: Math.max(14, cell * 0.4) }}
      >
        ►
      </span>
    </div>
  );
}
