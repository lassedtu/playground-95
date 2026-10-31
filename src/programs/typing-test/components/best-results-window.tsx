"use client";

import { useState } from "react";
import { Button, Frame } from "@react95/core";

import { clearBest, readBest } from "../lib/results";

export const BEST_RESULTS_SIZE = { width: 320, height: 200 };

type BestResultsWindowProps = {
  tests: readonly { id: string; label: string }[];
  onClose: () => void;
};

export function BestResultsWindow({ tests, onClose }: BestResultsWindowProps) {
  const [best, setBest] = useState(readBest);

  return (
    <div className="flex size-full flex-col gap-3">
      <Frame boxShadow="$in" bgColor="$inputBackground" className="min-h-0 flex-1 overflow-auto p-2">
        <table className="w-full border-collapse">
          <caption className="sr-only">Best result per test</caption>
          <thead>
            <tr>
              <th scope="col" className="text-left font-normal">Test</th>
              <th scope="col" className="text-right font-normal">WPM</th>
              <th scope="col" className="text-right font-normal">Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((test) => {
              const result = best[test.id];
              return (
                <tr key={test.id}>
                  <th scope="row" className="truncate text-left font-normal">{test.label}</th>
                  <td className="text-right">{result ? result.wpm : "–"}</td>
                  <td className="text-right">{result ? `${result.accuracy}%` : "–"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Frame>
      <div className="flex justify-end gap-2">
        <Button
          onClick={() => {
            clearBest();
            setBest({});
          }}
        >
          Reset Scores
        </Button>
        <Button onClick={onClose}>OK</Button>
      </div>
    </div>
  );
}
