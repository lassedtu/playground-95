"use client";

import { useState } from "react";
import { Button, Fieldset, Input, Range } from "@react95/core";

import {
  cleanText,
  LOBBY_NAME_MAX,
  type LobbySettings,
  MAX_CARS,
  MAX_CPUS,
  MIN_PLAYERS,
  type NewLobby,
  PASSWORD_MAX,
} from "../../net/protocol";
import { LapsChoice, TrackList } from "../race-pickers";

type LobbySettingsDialogProps =
  | {
    mode: "create";
    initial: NewLobby;
    onSave: (lobby: NewLobby) => void;
    onCancel: () => void;
    busy: boolean;
  }
  | {
    mode: "edit";
    initial: LobbySettings;
    /** Players in the lobby now: max players can't go below it. */
    players: number;
    onSave: (settings: LobbySettings) => void;
    onCancel: () => void;
  };

function Slider({ label, value, min, max, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex h-8 items-center justify-center">
      <Range
        aria-label={label}
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(Number(event.target.value))}
        className="w-3/4"
      />
    </div>
  );
}

/** A new lobby (name, password, track, laps, players, CPUs), or the host changing one. */
export function LobbySettingsDialog(props: LobbySettingsDialogProps) {
  const { mode, onCancel } = props;
  const [settings, setSettings] = useState<LobbySettings>(props.initial);
  const [password, setPassword] = useState(mode === "create" ? props.initial.password : "");
  const update = (next: Partial<LobbySettings>) => setSettings((s) => ({ ...s, ...next }));
  const busy = mode === "create" && props.busy;
  const minPlayers = mode === "edit" ? Math.max(MIN_PLAYERS, props.players) : MIN_PLAYERS;

  const save = () => {
    const cleaned = { ...settings, name: cleanText(settings.name, LOBBY_NAME_MAX) || props.initial.name };
    if (props.mode === "create") props.onSave({ ...cleaned, password });
    else props.onSave(cleaned);
  };

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!busy) save();
      }}
    >
      <div className={`grid gap-2 ${mode === "create" ? "grid-cols-2" : "grid-cols-1"}`}>
        <div className="flex flex-col gap-0.5">
          <label htmlFor="three-four-go-lobby-name">Lobby name:</label>
          <Input
            id="three-four-go-lobby-name"
            value={settings.name}
            maxLength={LOBBY_NAME_MAX}
            autoComplete="off"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => update({ name: event.target.value })}
            className="w-full"
          />
        </div>
        {mode === "create" && (
          <div className="flex flex-col gap-0.5">
            <label htmlFor="three-four-go-lobby-password">Password (optional):</label>
            <Input
              id="three-four-go-lobby-password"
              value={password}
              maxLength={PASSWORD_MAX}
              autoComplete="off"
              spellCheck={false}
              placeholder="None: anyone can join"
              aria-describedby="three-four-go-lobby-password-note"
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
              className="w-full"
            />
            <p id="three-four-go-lobby-password-note" className="m-0 text-xs">
              Just keeps strangers out; not very secret.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Fieldset legend="Track">
          <TrackList value={settings.track} onChange={(track) => update({ track })} />
        </Fieldset>
        <div className="flex flex-col gap-2">
          <Fieldset legend="Laps">
            <LapsChoice value={settings.laps} onChange={(laps) => update({ laps })} />
          </Fieldset>
          <Fieldset legend={`Players: up to ${settings.maxPlayers}`}>
            <Slider
              label="Most players"
              value={Math.max(settings.maxPlayers, minPlayers)}
              min={minPlayers}
              max={MAX_CARS}
              onChange={(maxPlayers) => update({ maxPlayers })}
            />
          </Fieldset>
        </div>
      </div>

      <Fieldset legend={`CPU drivers: up to ${settings.cpus}`}>
        <Slider label="Most CPU drivers" value={settings.cpus} min={0} max={MAX_CPUS} onChange={(cpus) => update({ cpus })} />
        <p className="m-0 text-xs">
          CPUs fill the seats players leave empty ({MAX_CARS} cars at most), and step aside as people join.
        </p>
      </Fieldset>

      <div className="flex items-center justify-end gap-2">
        {busy && (
          <span className="mr-auto text-xs" role="status">
            Creating the lobby…
          </span>
        )}
        <Button type="submit" className="min-w-20 font-bold" disabled={busy}>
          {mode === "create" ? "Create" : "OK"}
        </Button>
        <Button type="button" className="min-w-20" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
