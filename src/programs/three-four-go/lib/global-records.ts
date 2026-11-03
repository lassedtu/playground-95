"use client";

import { useEffect, useState } from "react";

import { getBoards, onlineAvailable, ServerError, type ServerProblem } from "../net/client";
import type { TrackBoards } from "../net/protocol";

/** Boards fetched less than this long ago (ms) are used again instead of asking the server. */
const FRESH_FOR = 60_000;

const cache = new Map<string, { at: number; boards: Promise<TrackBoards> }>();

/** A track's boards, from the server or (if fetched a moment ago) the cache. */
function loadBoards(track: string, fresh: boolean) {
  const cached = cache.get(track);
  if (cached && !fresh && Date.now() - cached.at < FRESH_FOR) return cached.boards;
  const boards = getBoards(track);
  boards.catch(() => cache.delete(track));
  cache.set(track, { at: Date.now(), boards });
  return boards;
}

/** After a time is sent: the next look at this track's boards asks the server. */
export const forgetBoards = (track: string) => cache.delete(track);

type Loaded = { track: string; boards: TrackBoards | null; problem: ServerProblem | null };

/**
 * A track's global records boards (null while loading, or if online play
 * isn't set up), and `refresh` to fetch them again.
 */
export function useBoards(track: string) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [refreshes, setRefreshes] = useState(0);

  useEffect(() => {
    if (!onlineAvailable) return;
    let stopped = false;
    loadBoards(track, refreshes > 0).then(
      (boards) => !stopped && setLoaded({ track, boards, problem: null }),
      (error: unknown) =>
        !stopped && setLoaded({ track, boards: null, problem: error instanceof ServerError ? error.problem : "unreachable" }),
    );
    return () => {
      stopped = true;
    };
  }, [track, refreshes]);

  const current = loaded?.track === track ? loaded : null;
  return {
    boards: current?.boards ?? null,
    problem: current?.problem ?? null,
    loading: onlineAvailable && !current,
    refresh: () => {
      setLoaded(null);
      setRefreshes((n) => n + 1);
    },
  };
}
