"use client";

import type { ReactNode } from "react";
import { RadioButton } from "@react95/core";

import { TRACKS } from "../data/tracks";
import { VEHICLES } from "../data/vehicles";
import { LAP_CHOICES } from "../lib/settings";
import { CarPreview } from "./car-preview";
import { CarStatBars } from "./car-stat-bars";

/** A sunken white Win95 list box. */
export const LIST =
  "m-0 flex list-none flex-col overflow-y-auto border-2 border-t-[#808080] border-r-white border-b-white border-l-[#808080] bg-white p-0.5";

export function ListItem({ selected, onSelect, onActivate, children }: {
  selected: boolean;
  onSelect: () => void;
  onActivate?: () => void;
  children: ReactNode;
}) {
  return (
    <li role="none">
      <button
        type="button"
        role="option"
        aria-selected={selected}
        onClick={onSelect}
        onDoubleClick={onActivate}
        className={`flex w-full cursor-default items-center gap-2 border-0 px-1 py-0.5 text-left outline-none focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-dotted focus-visible:outline-black ${selected ? "bg-win-navy text-white" : "bg-transparent"}`}
      >
        {children}
      </button>
    </li>
  );
}

/** A track's name from its id (the id itself if it's one we don't have). */
export const trackName = (id: string) => TRACKS.find((t) => t.id === id)?.name ?? id;

/** The tracks with their thumbnails. Double-click = `onActivate`. */
export function TrackList({ value, onChange, onActivate, className = "h-24" }: {
  value: string;
  onChange: (track: string) => void;
  onActivate?: () => void;
  className?: string;
}) {
  return (
    <ul role="listbox" aria-label="Track" className={`${LIST} ${className}`}>
      {TRACKS.map((track) => (
        <ListItem key={track.id} selected={track.id === value} onSelect={() => onChange(track.id)} onActivate={onActivate}>
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny local thumbnail */}
          <img src={track.ground.src} alt="" width={32} height={32} className="shrink-0 [image-rendering:pixelated]" />
          {track.name}
        </ListItem>
      ))}
    </ul>
  );
}

/** The selected car turning round, its stats, and the list of cars. */
export function CarPicker({ value, onChange, onActivate }: {
  value: string;
  onChange: (car: string) => void;
  onActivate?: () => void;
}) {
  const vehicle = VEHICLES.find((v) => v.name === value) ?? VEHICLES[0];
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex h-20 items-center justify-center">
        <CarPreview key={vehicle.name} vehicle={vehicle} />
      </div>
      <CarStatBars vehicle={vehicle} />
      <ul role="listbox" aria-label="Car" className={`${LIST} h-24 w-full`}>
        {VEHICLES.map((v) => (
          <ListItem key={v.name} selected={v.name === vehicle.name} onSelect={() => onChange(v.name)} onActivate={onActivate}>
            {v.label}
          </ListItem>
        ))}
      </ul>
    </div>
  );
}

/** 1, 3 or 5 laps, centred in a box as tall as a slider's. */
export function LapsChoice({ value, onChange }: { value: number; onChange: (laps: number) => void }) {
  return (
    <div className="flex h-8 items-center justify-center gap-4">
      {LAP_CHOICES.map((laps) => (
        <RadioButton key={laps} name="laps" value={laps} checked={value === laps} onChange={() => onChange(laps)}>
          {laps}
        </RadioButton>
      ))}
    </div>
  );
}
