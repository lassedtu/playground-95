"use client";

import { Button } from "@react95/core";

import { formatTime, ordinal } from "../engine/race";
import type { RecordPlaces } from "../net/protocol";

export type ResultRow = {
  name: string;
  car: string;
  you: boolean;
  time: number | null;
  bestLap: number | null;
  /** Shown instead of a time when there's none, e.g. "DNF" (default "Still racing"). */
  note?: string;
};

export type RaceResults = {
  trackName: string;
  laps: number;
  /** In finishing order. */
  rows: ResultRow[];
  /** Records you set this race (on this computer). */
  newRace: boolean;
  newLap: boolean;
  /** Tells this race's results apart (the global records answer comes later). */
  id: number;
};

/** The global records' answer for your race: still sending, where it got, or couldn't send. */
export type GlobalPlaces = RecordPlaces | "pending" | "failed";

function GlobalMessage({ places, laps }: { places: GlobalPlaces; laps: number }) {
  if (places === "pending") return <p className="m-0 text-xs">Sending your time to the global records…</p>;
  if (places === "failed") return <p className="m-0 text-xs">Couldn&apos;t reach the global records this time.</p>;
  const made = [
    places.lap !== null && `#${places.lap} fastest lap`,
    places.race !== null && `#${places.race} fastest ${laps}-lap race`,
  ].filter(Boolean);
  if (!made.length) return <p className="m-0 text-xs">Not in the global top 10 this time.</p>;
  return <p className="m-0 font-bold text-[#000080]">Global records: {made.join(" and ")}!</p>;
}

type ResultsDialogProps = {
  results: RaceResults;
  onAgain: () => void;
  onNewRace: () => void;
  onClose: () => void;
  /** An online race: back to the lobby, and (for the host) Race Again instead of the single-player buttons. */
  online?: { host: boolean; onBackToLobby: () => void };
  /** Where your race got on the global records (null: not sent, e.g. you didn't finish). */
  global: GlobalPlaces | null;
};

/** Finishing order like a Win95 list view: place, driver, car, time, best lap. */
export function ResultsDialog({ results, onAgain, onNewRace, onClose, online, global }: ResultsDialogProps) {
  const place = results.rows.findIndex((row) => row.you) + 1;
  const solo = results.rows.length === 1;
  const finished = results.rows.find((row) => row.you)?.time !== null;
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 font-bold">
        {solo ? "Time trial" : !finished ? "You didn't finish." : place === 1 ? "You won!" : `You finished ${ordinal(place)}.`}{" "}
        <span className="font-normal">
          {results.trackName}, {results.laps} lap{results.laps > 1 ? "s" : ""}
        </span>
      </p>
      {(results.newRace || results.newLap) && (
        <p className="m-0 text-[#000080]">
          New record{results.newRace && results.newLap ? "s" : ""}:{" "}
          {[results.newRace && "race time", results.newLap && "lap"].filter(Boolean).join(" and ")}!
        </p>
      )}
      {global && <GlobalMessage places={global} laps={results.laps} />}
      <div className="max-h-56 overflow-auto border-2 border-t-[#808080] border-r-white border-b-white border-l-[#808080] bg-white">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr>
              {["#", "Driver", "Car", "Time", "Best lap"].map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="sticky top-0 bg-[#c0c0c0] px-1 py-0.5 font-normal shadow-[inset_-1px_-1px_#808080,inset_1px_1px_#fff]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.rows.map((row, i) => (
              <tr key={i} className={row.you ? "bg-win-navy text-white" : ""}>
                <td className="px-1 py-0.5 tabular-nums">{i + 1}</td>
                <td className="px-1 py-0.5">
                  {row.name}
                  {row.you && " (you)"}
                </td>
                <td className="px-1 py-0.5">{row.car}</td>
                <td className="px-1 py-0.5 tabular-nums">{row.time === null ? (row.note ?? "Still racing") : formatTime(row.time)}</td>
                <td className="px-1 py-0.5 tabular-nums">{row.bestLap === null ? "–" : formatTime(row.bestLap)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {online ? (
        <div className="flex items-center justify-end gap-2">
          {!online.host && (
            <span className="mr-auto text-xs" role="status">
              The host can start another race.
            </span>
          )}
          {online.host && (
            <Button className="min-w-20 font-bold" onClick={onAgain}>
              Race Again
            </Button>
          )}
          <Button className={`min-w-20 ${online.host ? "" : "font-bold"}`} onClick={online.onBackToLobby}>
            Back to Lobby
          </Button>
        </div>
      ) : (
        <div className="flex justify-end gap-2">
          <Button className="min-w-20 font-bold" onClick={onAgain}>
            Race Again
          </Button>
          <Button className="min-w-20" onClick={onNewRace}>
            New Race…
          </Button>
          <Button className="min-w-20" onClick={onClose}>
            Close
          </Button>
        </div>
      )}
    </div>
  );
}
