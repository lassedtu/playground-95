"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createLobby, joinLobby, type LobbyConnection, ServerError, type ServerProblem } from "../net/client";
import {
  type ClientMessage,
  isCarState,
  type LobbySettings,
  type LobbyState,
  type NewLobby,
  type RefusedReason,
  type ResultEntry,
} from "../net/protocol";
import { makeOnlineRace, type OnlineRace } from "./online-race";

export type Online =
  | { kind: "offline" }
  /** Creating a lobby or connecting to one. */
  | { kind: "joining"; code: string | null }
  | { kind: "lobby"; you: string; lobby: LobbyState };

/** Why you're not (or no longer) in a lobby. */
export type OnlineProblem =
  | { kind: "refused"; reason: RefusedReason; code: string; triedPassword: boolean }
  | { kind: "server"; problem: ServerProblem }
  | { kind: "lost" };

type Options = {
  /** Your name and car, sent when you join (and again when they change). */
  name: string;
  car: string;
  /** You're in a lobby (also after a reconnect). */
  onJoined: () => void;
  onProblem: (problem: OnlineProblem) => void;
  /** The host started a race (you're on the grid). */
  onStart: (race: OnlineRace) => void;
  /** The race is over: the results, for the race they belong to. */
  onResults: (rows: ResultEntry[], race: OnlineRace) => void;
};

/**
 * Being in an online lobby: joining (or creating and joining), what the
 * lobby looks like now, and changing your car, name or (as host) the
 * settings. Leaves the lobby when the window closes.
 */
export function useOnline({ name, car, onJoined, onProblem, onStart, onResults }: Options) {
  const [online, setOnline] = useState<Online>({ kind: "offline" });
  const connection = useRef<LobbyConnection | null>(null);
  const nameRef = useRef(name);
  const carRef = useRef(car);
  const onJoinedRef = useRef(onJoined);
  const onProblemRef = useRef(onProblem);
  const onStartRef = useRef(onStart);
  const onResultsRef = useRef(onResults);
  /** Bumped on every join/leave, so events from an old connection are ignored. */
  const attempt = useRef(0);
  /** Your player id in the lobby, whether you're its host, and the race being driven. */
  const you = useRef("");
  const hosting = useRef(false);
  const race = useRef<OnlineRace | null>(null);

  useEffect(() => {
    onJoinedRef.current = onJoined;
    onProblemRef.current = onProblem;
    onStartRef.current = onStart;
    onResultsRef.current = onResults;
  }, [onJoined, onProblem, onStart, onResults]);

  const send = useCallback((message: Exclude<ClientMessage, { type: "hello" | "time" }>) => {
    connection.current?.send(message);
  }, []);

  // Name and car changes go to the lobby (the server keeps names unique).
  useEffect(() => {
    if (nameRef.current === name) return;
    nameRef.current = name;
    send({ type: "name", name });
  }, [name, send]);
  useEffect(() => {
    if (carRef.current === car) return;
    carRef.current = car;
    send({ type: "car", car });
  }, [car, send]);

  const leave = useCallback(() => {
    attempt.current++;
    connection.current?.close();
    connection.current = null;
    race.current = null;
    setOnline({ kind: "offline" });
  }, []);

  const join = useCallback((code: string, password: string) => {
    connection.current?.close();
    const mine = ++attempt.current;
    const current = () => attempt.current === mine;
    let joined = false;
    const fail = (problem: OnlineProblem) => {
      if (!current()) return;
      connection.current = null;
      race.current = null;
      setOnline({ kind: "offline" });
      onProblemRef.current(problem);
    };
    setOnline({ kind: "joining", code });
    connection.current = joinLobby(code, { name: nameRef.current, car: carRef.current, password }, {
      welcome(id, lobby) {
        if (!current()) return;
        joined = true;
        you.current = id;
        hosting.current = lobby.players.some((p) => p.id === id && p.host);
        race.current = null;
        setOnline({ kind: "lobby", you: id, lobby });
        onJoinedRef.current();
      },
      lobby(lobby) {
        if (!current()) return;
        hosting.current = lobby.players.some((p) => p.id === you.current && p.host);
        setOnline((o) => (o.kind === "lobby" ? { ...o, lobby } : o));
      },
      start(start) {
        if (!current()) return;
        const next = makeOnlineRace(
          start,
          { id: you.current, name: nameRef.current },
          {
            serverNow: () => Date.now() + (connection.current?.clockOffset() ?? 0),
            hosting: () => hosting.current,
            send: (message) => connection.current?.send(message),
          },
        );
        race.current = next;
        if (next) onStartRef.current(next);
      },
      state({ t, cars }) {
        const ongoing = race.current;
        if (!current() || !ongoing || typeof t !== "number" || !Array.isArray(cars)) return;
        for (const car of cars) {
          if (isCarState(car) && car[0] !== ongoing.yourSlot) ongoing.remotes.get(car[0])?.push(t, car);
        }
      },
      results(rows) {
        if (current() && race.current && Array.isArray(rows)) onResultsRef.current(rows, race.current);
      },
      refused(reason) {
        fail({ kind: "refused", reason, code, triedPassword: password !== "" });
      },
      closed(problem) {
        fail(joined ? { kind: "lost" } : { kind: "server", problem });
      },
    });
  }, []);

  /** Makes a lobby and joins it (as its host). */
  const create = useCallback(
    async (lobby: NewLobby) => {
      const mine = ++attempt.current;
      setOnline({ kind: "joining", code: null });
      try {
        const code = await createLobby(lobby);
        if (attempt.current === mine) join(code, lobby.password);
      } catch (error) {
        if (attempt.current !== mine) return;
        setOnline({ kind: "offline" });
        onProblemRef.current({ kind: "server", problem: error instanceof ServerError ? error.problem : "unreachable" });
      }
    },
    [join],
  );

  const changeSettings = useCallback((settings: Partial<LobbySettings>) => send({ type: "settings", settings }), [send]);
  /** Host: start the race. */
  const startRace = useCallback(() => send({ type: "start" }), [send]);

  // Closing the window leaves the lobby.
  useEffect(
    () => () => {
      attempt.current++;
      connection.current?.close();
    },
    [],
  );

  return { online, join, create, leave, changeSettings, startRace };
}
