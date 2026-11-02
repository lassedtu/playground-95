"use client";

import { useState } from "react";
import { Button, Fieldset, RadioButton, Range } from "@react95/core";

import { TRACKS } from "../data/tracks";
import { VEHICLES } from "../data/vehicles";
import { formatTime } from "../engine/race";
import { trackRecords } from "../lib/records";
import { LAP_CHOICES, MAX_CPUS, type RaceSettings } from "../lib/settings";
import { CarPreview } from "./car-preview";
import { CarStatBars } from "./car-stat-bars";

const LIST =
  "m-0 flex list-none flex-col overflow-y-auto border-2 border-t-[#808080] border-r-white border-b-white border-l-[#808080] bg-white p-0.5";

function ListItem({ selected, onSelect, onActivate, children }: {
  selected: boolean;
  onSelect: () => void;
  onActivate: () => void;
  children: React.ReactNode;
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

type NewRaceDialogProps = {
  initial: RaceSettings;
  onStart: (settings: RaceSettings) => void;
  /** Null when there's no race to go back to. */
  onCancel: (() => void) | null;
};

/** Track, car, laps and number of CPU drivers. */
export function NewRaceDialog({ initial, onStart, onCancel }: NewRaceDialogProps) {
  const [settings, setSettings] = useState(initial);
  const update = (next: Partial<RaceSettings>) => setSettings((s) => ({ ...s, ...next }));
  const vehicle = VEHICLES.find((v) => v.name === settings.car) ?? VEHICLES[0];
  const records = trackRecords(settings.track);
  const best = records.bestRace[settings.laps];
  const start = () => onStart(settings);

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        start();
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <Fieldset legend="Track">
          <ul role="listbox" aria-label="Track" className={`${LIST} h-24`}>
            {TRACKS.map((track) => (
              <ListItem
                key={track.id}
                selected={track.id === settings.track}
                onSelect={() => update({ track: track.id })}
                onActivate={start}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- tiny local thumbnail */}
                <img src={track.ground.src} alt="" width={32} height={32} className="shrink-0 [image-rendering:pixelated]" />
                {track.name}
              </ListItem>
            ))}
          </ul>
          <p className="m-0 mt-1 text-xs">
            Best lap: {records.bestLap === null ? "–" : formatTime(records.bestLap)}
            <br />
            Best {settings.laps}-lap race: {best === undefined ? "–" : formatTime(best)}
          </p>
        </Fieldset>

        <Fieldset legend="Car">
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-20 items-center justify-center">
              <CarPreview key={vehicle.name} vehicle={vehicle} />
            </div>
            <CarStatBars vehicle={vehicle} />
            <ul role="listbox" aria-label="Car" className={`${LIST} h-24 w-full`}>
              {VEHICLES.map((v) => (
                <ListItem key={v.name} selected={v.name === settings.car} onSelect={() => update({ car: v.name })} onActivate={start}>
                  {v.label}
                </ListItem>
              ))}
            </ul>
          </div>
        </Fieldset>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Fieldset legend="Laps">
          {/* Same height as the slider's box, laps centred in it. */}
          <div className="flex h-8 items-center justify-center gap-4">
            {LAP_CHOICES.map((laps) => (
              <RadioButton key={laps} name="laps" value={laps} checked={settings.laps === laps} onChange={() => update({ laps })}>
                {laps}
              </RadioButton>
            ))}
          </div>
        </Fieldset>
        <Fieldset legend={`CPU drivers: ${settings.cpus}${settings.cpus === 0 ? " (time trial)" : ""}`}>
          <div className="flex h-8 items-center justify-center">
            <Range
              aria-label="CPU drivers"
              min={0}
              max={MAX_CPUS}
              step={1}
              value={settings.cpus}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => update({ cpus: Number(event.target.value) })}
              className="w-3/4"
            />
          </div>
        </Fieldset>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" className="min-w-20 font-bold">
          Race!
        </Button>
        {onCancel && (
          <Button type="button" className="min-w-20" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
