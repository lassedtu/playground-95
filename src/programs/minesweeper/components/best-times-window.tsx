"use client";

import { useState } from "react";
import { Button, Frame } from "@react95/core";

import { LEVELS } from "../data/levels";
import { clearBestTimes, readBestTimes } from "../lib/best-times";

export const BEST_TIMES_SIZE = { width: 260, height: 140 };

/** Content of the "Fastest Mine Sweepers" window. */
export function BestTimesWindow({ onClose }: { onClose: () => void }) {
  const [times, setTimes] = useState(readBestTimes);

  return (
    <div className="flex size-full flex-col gap-3">
      <Frame boxShadow="$in" bgColor="$inputBackground" className="flex-1 p-2">
        <table className="w-full border-collapse">
          <caption className="sr-only">Fastest times per level</caption>
          <tbody>
            {LEVELS.map((level) => {
              const seconds = times[level.id];
              return (
                <tr key={level.id}>
                  <th scope="row" className="text-left font-normal">
                    {level.name}:
                  </th>
                  <td className="text-right">{seconds === undefined ? "999 seconds" : `${seconds} seconds`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Frame>
      <div className="flex justify-end gap-2">
        <Button
          onClick={() => {
            clearBestTimes();
            setTimes({});
          }}
        >
          Reset Scores
        </Button>
        <Button onClick={onClose}>OK</Button>
      </div>
    </div>
  );
}
