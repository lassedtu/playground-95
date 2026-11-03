"use client";

import { useState } from "react";
import { Button, Fieldset, RadioButton } from "@react95/core";

import { VEHICLES } from "../data/vehicles";
import { formatTime } from "../engine/race";
import { useBoards } from "../lib/global-records";
import { trackRecords } from "../lib/records";
import { LAP_CHOICES } from "../lib/settings";
import { BOARD_SIZE, type RecordEntry } from "../net/protocol";
import { problemText } from "./online/problems";
import { TrackList } from "./race-pickers";

/** Which board: the fastest laps, or the fastest races of a number of laps. */
type Board = "lap" | (typeof LAP_CHOICES)[number];

const carLabel = (name: string) => VEHICLES.find((v) => v.name === name)?.label ?? name;
const dateOf = (at: number) => new Date(at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

type RecordsDialogProps = {
  initialTrack: string;
  /** Your name: your times on the boards are highlighted. */
  playerName: string;
  onClose: () => void;
};

/** The global top 10s per track (fastest laps, fastest races), with your own bests under them. */
export function RecordsDialog({ initialTrack, playerName, onClose }: RecordsDialogProps) {
  const [track, setTrack] = useState(initialTrack);
  const [board, setBoard] = useState<Board>(3);
  const { boards, problem, loading, refresh } = useBoards(track);
  const rows: RecordEntry[] = boards ? (board === "lap" ? boards.laps : (boards.races[String(board)] ?? [])) : [];
  const local = trackRecords(track);
  const yourBest = board === "lap" ? local.bestLap : (local.bestRace[board] ?? null);

  const status = problem
    ? problemText({ kind: "server", problem })
    : loading
      ? "Loading the records…"
      : rows.length === 0
        ? "No times yet. Be the first!"
        : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[10rem_1fr] gap-2">
        <Fieldset legend="Track">
          <TrackList value={track} onChange={setTrack} className="h-auto" />
        </Fieldset>

        <Fieldset legend={`Top ${BOARD_SIZE}`}>
          <div className="flex flex-col gap-1">
            {/* React95 positions a radio button's text absolutely (it takes no room), so each gets a column wide enough for it. */}
            <div className="grid grid-cols-4 gap-2 px-1" role="radiogroup" aria-label="Board">
              <RadioButton
                name="board"
                value="lap"
                checked={board === "lap"}
                onChange={() => setBoard("lap")}
                className="whitespace-nowrap"
              >
                Fastest lap
              </RadioButton>
              {LAP_CHOICES.map((laps) => (
                <RadioButton
                  key={laps}
                  name="board"
                  value={laps}
                  checked={board === laps}
                  onChange={() => setBoard(laps)}
                  className="whitespace-nowrap"
                >
                  {laps} lap{laps === 1 ? "" : "s"}
                </RadioButton>
              ))}
            </div>
            <div className="border-2 border-t-[#808080] border-r-white border-b-white border-l-[#808080] bg-white">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr>
                    {["#", "Driver", "Car", "Time", "Date"].map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="bg-[#c0c0c0] px-1 py-0.5 font-normal shadow-[inset_-1px_-1px_#808080,inset_1px_1px_#fff]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: BOARD_SIZE }, (_, i) => {
                    const row = rows[i];
                    const yours = row && row.name.toLowerCase() === playerName.toLowerCase();
                    return (
                      <tr key={i} className={yours ? "bg-win-navy text-white" : row ? "" : "text-[#808080]"}>
                        <td className="w-5 px-1 py-0.5 tabular-nums">{i + 1}</td>
                        <td className="max-w-28 truncate px-1 py-0.5">{row ? row.name : "–"}</td>
                        <td className="px-1 py-0.5">{row ? carLabel(row.car) : ""}</td>
                        <td className="px-1 py-0.5 tabular-nums">{row ? formatTime(row.time) : ""}</td>
                        <td className="px-1 py-0.5 whitespace-nowrap">{row ? dateOf(row.at) : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className={`m-0 min-h-4 text-xs ${problem ? "text-[#800000]" : ""}`} role="status">
              {status ?? ""}
            </p>
            <p className="m-0 text-xs">
              Your best here (on this computer): {yourBest === null || yourBest === undefined ? "–" : formatTime(yourBest)}
            </p>
          </div>
        </Fieldset>
      </div>

      <div className="flex justify-end gap-2">
        <Button className="min-w-20" disabled={loading} onClick={refresh}>
          Refresh
        </Button>
        <Button className="min-w-20 font-bold" onClick={onClose}>
          OK
        </Button>
      </div>
    </div>
  );
}
