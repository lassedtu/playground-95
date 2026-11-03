"use client";

import { useState } from "react";
import { Button, Fieldset, Range } from "@react95/core";
import { Network3 } from "@react95/icons";

import { formatTime } from "../engine/race";
import { trackRecords } from "../lib/records";
import { MAX_CPUS, type RaceSettings } from "../lib/settings";
import { CarPicker, LapsChoice, TrackList } from "./race-pickers";

type NewRaceDialogProps = {
  initial: RaceSettings;
  onStart: (settings: RaceSettings) => void;
  /** Null when there's no race to go back to. */
  onCancel: (() => void) | null;
  /** Opens Play Online; null when online play isn't available. */
  onPlayOnline: (() => void) | null;
};

/** Track, car, laps and number of CPU drivers. */
export function NewRaceDialog({ initial, onStart, onCancel, onPlayOnline }: NewRaceDialogProps) {
  const [settings, setSettings] = useState(initial);
  const update = (next: Partial<RaceSettings>) => setSettings((s) => ({ ...s, ...next }));
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
          <TrackList value={settings.track} onChange={(track) => update({ track })} onActivate={start} />
          <p className="m-0 mt-1 text-xs">
            Best lap: {records.bestLap === null ? "–" : formatTime(records.bestLap)}
            <br />
            Best {settings.laps}-lap race: {best === undefined ? "–" : formatTime(best)}
          </p>
        </Fieldset>

        <Fieldset legend="Car">
          <CarPicker value={settings.car} onChange={(car) => update({ car })} onActivate={start} />
        </Fieldset>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Fieldset legend="Laps">
          <LapsChoice value={settings.laps} onChange={(laps) => update({ laps })} />
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

      <div className="flex items-center justify-end gap-2">
        {onPlayOnline && (
          <Button type="button" className="mr-auto flex items-center gap-1.5" onClick={onPlayOnline}>
            <Network3 variant="16x16_4" aria-hidden className="shrink-0" />
            Play Online with Friends…
          </Button>
        )}
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
