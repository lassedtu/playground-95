"use client";

import { Button } from "@react95/core";

import { formatTime, ordinal } from "../engine/race";

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
  /** Records you set this race. */
  newRace: boolean;
  newLap: boolean;
};

type ResultsDialogProps = {
  results: RaceResults;
  onAgain: () => void;
  onNewRace: () => void;
  onClose: () => void;
  /** An online race: back to the lobby, and (for the host) Race Again instead of the single-player buttons. */
  online?: { host: boolean; onBackToLobby: () => void };
};

/** Finishing order like a Win95 list view: place, driver, car, time, best lap. */
export function ResultsDialog({ results, onAgain, onNewRace, onClose, online }: ResultsDialogProps) {
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
