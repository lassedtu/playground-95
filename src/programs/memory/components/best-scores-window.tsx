"use client";

import { useState } from "react";
import { Button, Frame } from "@react95/core";

import { DIFFICULTIES } from "../data/difficulties";
import { clearBestScores, formatTime, readBestScores } from "../lib/best-scores";

export const BEST_SCORES_SIZE = { width: 300, height: 150 };

/** Content of the "Best Scores" window, like Minesweeper's "Fastest Mine Sweepers". */
export function BestScoresWindow({ onClose }: { onClose: () => void }) {
  const [scores, setScores] = useState(readBestScores);

  return (
    <div className="flex size-full flex-col gap-3">
      <Frame boxShadow="$in" bgColor="$inputBackground" className="flex-1 p-2">
        <table className="w-full border-collapse">
          <caption className="sr-only">Best scores per difficulty</caption>
          <thead>
            <tr className="text-left">
              <th scope="col" className="font-normal">Difficulty</th>
              <th scope="col" className="text-right font-normal">Moves</th>
              <th scope="col" className="text-right font-normal">Time</th>
            </tr>
          </thead>
          <tbody>
            {DIFFICULTIES.map((difficulty) => {
              const score = scores[difficulty.id];
              return (
                <tr key={difficulty.id}>
                  <th scope="row" className="text-left font-normal">
                    {difficulty.name}
                  </th>
                  <td className="text-right">{score ? score.moves : "–"}</td>
                  <td className="text-right">{score ? formatTime(score.seconds) : "–"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Frame>
      <div className="flex justify-end gap-2">
        <Button
          onClick={() => {
            clearBestScores();
            setScores({});
          }}
        >
          Reset Scores
        </Button>
        <Button onClick={onClose}>OK</Button>
      </div>
    </div>
  );
}
