"use client";

import { useEffect, useState } from "react";
import { Button, Fieldset } from "@react95/core";
import { Lock, Star } from "@react95/icons";

import { CPU_DRIVERS } from "../../data/personalities";
import { VEHICLES } from "../../data/vehicles";
import { cpusFor, type LobbyState, MAX_CARS, MIN_PLAYERS } from "../../net/protocol";
import { CarPicker, trackName } from "../race-pickers";

type LobbyDialogProps = {
  lobby: LobbyState;
  /** Your player id. */
  you: string;
  /** Your car (shown straight away; the lobby catches up). */
  car: string;
  onCar: (car: string) => void;
  onChangeName: () => void;
  /** Host only: opens the lobby settings. */
  onSettings: () => void;
  /** Host only: starts the race. */
  onStart: () => void;
  onLeave: () => void;
};

const carLabel = (name: string) => VEHICLES.find((v) => v.name === name)?.label ?? "–";

const ROW = "flex items-center gap-1 px-1 py-0.5";

/** The waiting room: the code to share, who's in, your car, and (for the host) the settings and Start. */
export function LobbyDialog({ lobby, you, car, onCar, onChangeName, onSettings, onStart, onLeave }: LobbyDialogProps) {
  const [copied, setCopied] = useState(false);
  const { settings, players } = lobby;
  const isHost = players.find((p) => p.id === you)?.host ?? false;
  const cpus = cpusFor(settings, players.length);
  const openSeats = Math.max(0, settings.maxPlayers - players.length);
  const racing = lobby.phase === "racing";
  const canStart = isHost && !racing && players.length >= MIN_PLAYERS;

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = () => {
    navigator.clipboard?.writeText(lobby.code).then(
      () => setCopied(true),
      () => {},
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="text-xs">Lobby code</span>
          <span className="font-mono text-2xl leading-none font-bold tracking-[0.2em]" aria-live="polite">
            {lobby.code}
          </span>
        </div>
        <Button className="min-w-20" onClick={copy}>
          {copied ? "Copied!" : "Copy"}
        </Button>
        <p className="m-0 min-w-0 flex-1 truncate text-right">
          {lobby.locked && <Lock variant="16x16_4" aria-label="Has a password" className="mr-1 inline-block align-text-bottom" />}
          <span className="font-bold">{settings.name}</span>
        </p>
      </div>

      <div className="grid grid-cols-[1fr_12rem] gap-2">
        <Fieldset legend={`Drivers: ${players.length + cpus}/${MAX_CARS}`}>
          <ul className="m-0 flex h-[13.5rem] list-none flex-col overflow-y-auto border-2 border-t-[#808080] border-r-white border-b-white border-l-[#808080] bg-white p-0.5 text-xs">
            {players.map((player) => {
              const mine = player.id === you;
              return (
                <li key={player.id} className={`${ROW} ${mine ? "bg-win-navy text-white" : ""}`}>
                  <span className="w-4 shrink-0">
                    {player.host && <Star variant="16x16_4" aria-label="Host" className="block" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {player.name}
                    {mine && " (you)"}
                  </span>
                  <span className="shrink-0">{carLabel(mine ? car : player.car)}</span>
                  {mine && (
                    <Button className="ml-1 shrink-0 text-black" onClick={onChangeName}>
                      Change…
                    </Button>
                  )}
                </li>
              );
            })}
            {CPU_DRIVERS.slice(0, cpus).map((driver) => (
              <li key={driver.name} className={`${ROW} text-[#808080]`}>
                <span className="w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{driver.name} (CPU)</span>
              </li>
            ))}
            {openSeats > 0 && (
              <li className={`${ROW} text-[#808080] italic`}>
                <span className="w-4 shrink-0" />
                {openSeats} open seat{openSeats === 1 ? "" : "s"}
              </li>
            )}
          </ul>
        </Fieldset>

        <Fieldset legend="Your car">
          <CarPicker value={car} onChange={onCar} />
        </Fieldset>
      </div>

      <Fieldset legend="Race">
        <div className="flex items-center gap-2">
          <p className="m-0 flex-1">
            {trackName(settings.track)}, {settings.laps} lap{settings.laps === 1 ? "" : "s"}. Up to {settings.maxPlayers}{" "}
            players and {settings.cpus} CPU{settings.cpus === 1 ? "" : "s"}.
          </p>
          {isHost && (
            <Button className="min-w-20" onClick={onSettings}>
              Settings…
            </Button>
          )}
        </div>
      </Fieldset>

      <div className="flex items-center justify-end gap-2">
        <span className="mr-auto text-xs" role="status">
          {racing
            ? "A race is on…"
            : isHost
              ? players.length < MIN_PLAYERS
                ? `Share the code: a race needs at least ${MIN_PLAYERS} players.`
                : "Everyone's here? Start the race!"
              : "Waiting for the host to start the race…"}
        </span>
        {isHost && (
          <Button className="min-w-24 font-bold" disabled={!canStart} onClick={onStart}>
            Start Race
          </Button>
        )}
        <Button className="min-w-20" onClick={onLeave}>
          Leave
        </Button>
      </div>
    </div>
  );
}
