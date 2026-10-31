"use client";

import type { CardIcon } from "../data/icons";
import type { CardState } from "../lib/game";

type MemoryCardProps = {
  icon: CardIcon;
  state: CardState;
  /** Card size in CSS px; the icon is scaled by whole pixels to stay crisp. */
  size: number;
  /** 1-based position, for the accessible name of face-down cards. */
  position: number;
  onFlip: () => void;
};

/** Pixel-art icons look best at whole multiples of their 32 px. */
function iconSize(cardSize: number) {
  return 32 * Math.max(1, Math.floor((cardSize * 0.7) / 32));
}

export function MemoryCard({ icon, state, size, position, onFlip }: MemoryCardProps) {
  const { Icon, label } = icon;
  const faceUp = state !== "down";
  const name =
    state === "down" ? `Card ${position}` : state === "matched" ? `${label}, matched` : label;

  return (
    <button
      type="button"
      aria-label={name}
      // Face-up cards can't be clicked but stay focusable, so keyboard
      // users don't lose their place.
      aria-disabled={faceUp}
      onClick={() => !faceUp && onFlip()}
      style={{ width: size, height: size }}
      className="group cursor-pointer border-0 bg-transparent p-0 outline-none perspective-[600px] aria-disabled:cursor-default"
    >
      <span
        className={`relative block size-full transition-transform duration-300 ease-out transform-3d motion-reduce:transition-none ${
          faceUp ? "rotate-y-180" : ""
        }`}
      >
        {/* Back: Win95 Solitaire-style pattern with a raised edge. */}
        <span className="absolute inset-0 border-2 border-white bg-[repeating-linear-gradient(45deg,#000080_0_3px,#1084d0_3px_5px)] shadow-[1px_1px_0_#000,inset_0_0_0_1px_#000080] backface-hidden group-hover:brightness-110 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-dotted group-focus-visible:outline-black" />
        {/* Face */}
        <span
          className={`absolute inset-0 flex rotate-y-180 items-center justify-center border border-black bg-white shadow-[1px_1px_0_#000] backface-hidden group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-dotted group-focus-visible:outline-black ${
            state === "matched" ? "bg-[#ffffe1]" : ""
          }`}
        >
          <Icon
            variant="32x32_4"
            aria-hidden
            width={iconSize(size)}
            height={iconSize(size)}
            className={state === "matched" ? "opacity-60" : undefined}
          />
        </span>
      </span>
    </button>
  );
}
