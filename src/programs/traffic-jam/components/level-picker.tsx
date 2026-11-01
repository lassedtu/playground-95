"use client";

import { useState } from "react";
import { Button } from "@react95/core";

import { LEVELS, LEVELS_PER_TIER, TIER_NAMES } from "../data/levels";
import type { Result } from "../lib/progress";
import { formatTime } from "../lib/puzzles";

const BEVEL_OUT = "shadow-[inset_-1px_-1px_#000,inset_1px_1px_#fff,inset_-2px_-2px_#808080,inset_2px_2px_#dfdfdf]";
const BEVEL_IN = "shadow-[inset_1px_1px_#000,inset_-1px_-1px_#fff,inset_2px_2px_#808080,inset_-2px_-2px_#dfdfdf]";

type LevelPickerProps = {
  current: number;
  solved: Record<number, Result>;
  onPlay: (index: number) => void;
  onCancel: () => void;
};

/** "Choose Level" dialog: a tier switch and a grid of the tier's 50 levels. */
export function LevelPicker({ current, solved, onPlay, onCancel }: LevelPickerProps) {
  const [selected, setSelected] = useState(current);
  const [tier, setTier] = useState(Math.floor(current / LEVELS_PER_TIER));
  const first = tier * LEVELS_PER_TIER;
  const best = solved[selected];
  const solvedCount = Object.keys(solved).length;

  return (
    <div className="flex flex-col gap-2">
      <div role="radiogroup" aria-label="Difficulty" className="flex">
        {TIER_NAMES.map((name, i) => {
          const done = Array.from({ length: LEVELS_PER_TIER }, (_, k) => solved[i * LEVELS_PER_TIER + k]).filter(Boolean).length;
          return (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={tier === i}
              onClick={() => setTier(i)}
              className={`flex-1 cursor-default border-0 bg-[#c0c0c0] px-1 py-1 text-xs outline-none focus-visible:outline-1 focus-visible:-outline-offset-4 focus-visible:outline-dotted focus-visible:outline-black ${tier === i ? `${BEVEL_IN} font-bold` : BEVEL_OUT}`}
            >
              {name}
              <span className="block text-[10px] text-[#404040]">
                {done}/{LEVELS_PER_TIER}
              </span>
            </button>
          );
        })}
      </div>

      <div
        role="listbox"
        aria-label={`${TIER_NAMES[tier]} levels`}
        className="grid grid-cols-10 gap-0.5 border-2 border-t-[#808080] border-r-white border-b-white border-l-[#808080] bg-white p-1"
      >
        {Array.from({ length: LEVELS_PER_TIER }, (_, k) => {
          const index = first + k;
          const done = solved[index];
          const isSelected = index === selected;
          return (
            <button
              key={index}
              type="button"
              role="option"
              aria-selected={isSelected}
              aria-label={`Level ${index + 1}${done ? ", solved" : ""}`}
              onClick={() => setSelected(index)}
              onDoubleClick={() => onPlay(index)}
              className={`relative h-6 cursor-default border-0 p-0 text-xs tabular-nums outline-none focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-dotted focus-visible:outline-black ${isSelected ? "bg-win-navy text-white" : "bg-transparent"}`}
            >
              {index + 1}
              {done && (
                <span aria-hidden className={`absolute top-0 right-0 text-[9px] leading-none ${isSelected ? "text-white" : "text-[#008000]"}`}>
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="m-0 min-h-8 text-xs">
        <span className="font-bold">Level {selected + 1}</span> · par {LEVELS[selected][0]} moves
        <br />
        {best
          ? `Best: ${best.moves} moves in ${formatTime(best.seconds)}${best.moves <= LEVELS[selected][0] ? " (perfect!)" : ""}`
          : "Not solved yet."}{" "}
        <span className="text-[#404040]">({solvedCount}/{LEVELS.length} solved)</span>
      </p>

      <div className="flex justify-end gap-2">
        <Button onClick={() => onPlay(selected)}>Play</Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
