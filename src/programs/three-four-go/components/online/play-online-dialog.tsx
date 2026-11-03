"use client";

import { useEffect, useState } from "react";
import { Button, Fieldset, Input } from "@react95/core";
import { Lock } from "@react95/icons";

import { listLobbies, ServerError, type ServerProblem } from "../../net/client";
import { CODE_LENGTH, type LobbyListing, normalizeCode } from "../../net/protocol";
import { trackName } from "../race-pickers";
import { PlayingAs } from "./playing-as";
import { problemText } from "./problems";

/** How often the list refreshes itself while it's open. */
const REFRESH_EVERY = 10_000;

type PlayOnlineDialogProps = {
  playerName: string;
  onChangeName: () => void;
  /** Join a lobby; `locked` lobbies ask for the password first. */
  onJoin: (code: string, locked: boolean) => void;
  onCreate: () => void;
  onCancel: () => void;
  /** Joining is in progress (buttons disabled). */
  busy: boolean;
};

const joinable = (lobby: LobbyListing) => !lobby.racing && lobby.players < lobby.maxPlayers;

/** The open lobbies (like Network Neighborhood), a field for a friend's code, and Create Lobby. */
export function PlayOnlineDialog({ playerName, onChangeName, onJoin, onCreate, onCancel, busy }: PlayOnlineDialogProps) {
  const [lobbies, setLobbies] = useState<LobbyListing[] | null>(null);
  const [problem, setProblem] = useState<ServerProblem | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState(false);

  /** Bumped by Refresh: loads the list again (and restarts the timer). */
  const [refreshes, setRefreshes] = useState(0);

  useEffect(() => {
    let stopped = false;
    const load = () => {
      listLobbies().then(
        (list) => {
          if (stopped) return;
          setLobbies(list);
          setProblem(null);
          setLoading(false);
        },
        (error: unknown) => {
          if (stopped) return;
          setProblem(error instanceof ServerError ? error.problem : "unreachable");
          setLoading(false);
        },
      );
    };
    load();
    const timer = setInterval(load, REFRESH_EVERY);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [refreshes]);

  const chosen = lobbies?.find((l) => l.code === selected) ?? null;
  const joinChosen = (lobby: LobbyListing | null) => lobby && joinable(lobby) && !busy && onJoin(lobby.code, lobby.locked);
  const joinCode = () => {
    const normalized = normalizeCode(code);
    if (!normalized) return setCodeError(true);
    // Whether it has a password isn't known yet: the server says so if it does.
    onJoin(normalized, false);
  };

  const status = problem
    ? problemText({ kind: "server", problem })
    : !lobbies
      ? "Looking for lobbies…"
      : lobbies.length === 0
        ? "No open lobbies right now. Create one, or join a friend's with their code."
        : `${lobbies.length} open lobb${lobbies.length === 1 ? "y" : "ies"}.`;

  return (
    <div className="flex flex-col gap-2">
      <PlayingAs name={playerName} onChange={onChangeName} disabled={busy} />

      <Fieldset legend="Open lobbies">
        <div className="flex flex-col gap-1">
          <div className="h-36 overflow-auto border-2 border-t-[#808080] border-r-white border-b-white border-l-[#808080] bg-white">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr>
                  {["Lobby", "Track", "Laps", "Players", ""].map((h, i) => (
                    <th
                      key={i}
                      scope="col"
                      className="sticky top-0 bg-[#c0c0c0] px-1 py-0.5 font-normal shadow-[inset_-1px_-1px_#808080,inset_1px_1px_#fff]"
                    >
                      {h || <span className="sr-only">Password</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lobbies?.map((lobby) => {
                  const isSelected = lobby.code === selected;
                  const open = joinable(lobby);
                  return (
                    <tr
                      key={lobby.code}
                      onClick={() => setSelected(lobby.code)}
                      onDoubleClick={() => joinChosen(lobby)}
                      className={`cursor-default ${isSelected ? "bg-win-navy text-white" : open ? "" : "text-[#808080]"}`}
                    >
                      <td className="max-w-40 truncate px-1 py-0.5">
                        {/* A button in the first cell makes rows reachable with the keyboard. */}
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setSelected(lobby.code)}
                          onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), joinChosen(lobby))}
                          className="w-full cursor-default truncate border-0 bg-transparent p-0 text-left text-inherit outline-none focus-visible:outline-1 focus-visible:outline-dotted"
                        >
                          {lobby.name}
                        </button>
                      </td>
                      <td className="px-1 py-0.5">{trackName(lobby.track)}</td>
                      <td className="px-1 py-0.5 tabular-nums">{lobby.laps}</td>
                      <td className="px-1 py-0.5 tabular-nums">
                        {lobby.racing ? "Racing…" : lobby.players >= lobby.maxPlayers ? "Full" : `${lobby.players}/${lobby.maxPlayers}`}
                      </td>
                      <td className="w-5 px-1 py-0.5">
                        {lobby.locked && <Lock variant="16x16_4" aria-label="Has a password" className="block" />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className={`m-0 text-xs ${problem ? "text-[#800000]" : ""}`} role="status">
            {status}
          </p>
          <div className="flex justify-end gap-2">
            <Button className="min-w-20" disabled={!chosen || !joinable(chosen) || busy} onClick={() => joinChosen(chosen)}>
              Join
            </Button>
            <Button
              className="min-w-20"
              disabled={loading}
              onClick={() => {
                setLoading(true);
                setRefreshes((n) => n + 1);
              }}
            >
              Refresh
            </Button>
          </div>
        </div>
      </Fieldset>

      <Fieldset legend="Have a code?">
        <form
          className="flex flex-col gap-1"
          onSubmit={(event) => {
            event.preventDefault();
            joinCode();
          }}
        >
          <div className="flex items-center gap-2">
            <label htmlFor="three-four-go-code">Lobby code:</label>
            <Input
              id="three-four-go-code"
              value={code}
              maxLength={CODE_LENGTH + 2}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-invalid={codeError}
              aria-describedby={codeError ? "three-four-go-code-error" : undefined}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setCode(event.target.value);
                setCodeError(false);
              }}
              className="w-24 text-center font-bold tracking-widest uppercase"
            />
            <Button type="submit" className="min-w-20" disabled={busy}>
              Join
            </Button>
          </div>
          {codeError && (
            <p id="three-four-go-code-error" className="m-0 text-xs text-[#800000]">
              Codes are {CODE_LENGTH} letters and numbers, like K7QFM.
            </p>
          )}
        </form>
      </Fieldset>

      <div className="flex items-center justify-end gap-2">
        {busy && (
          <span className="mr-auto text-xs" role="status">
            Joining…
          </span>
        )}
        <Button className="min-w-20 font-bold" disabled={busy} onClick={onCreate}>
          Create Lobby…
        </Button>
        <Button className="min-w-20" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
