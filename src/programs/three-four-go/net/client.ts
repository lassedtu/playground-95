import {
  type ClientMessage,
  type LobbyListing,
  type LobbyState,
  type NewLobby,
  PING,
  PONG,
  PROTOCOL,
  type RefusedReason,
  type ServerMessage,
} from "./protocol";

/**
 * The race server's address (e.g. https://three-four-go.you.workers.dev),
 * from NEXT_PUBLIC_THREE_FOUR_GO_SERVER. Empty: online play isn't set up.
 */
export const SERVER = (process.env.NEXT_PUBLIC_THREE_FOUR_GO_SERVER ?? "").replace(/\/+$/, "");
export const onlineAvailable = SERVER !== "";

/** Keep-alive ping interval (answered by the server for free). */
const PING_EVERY = 30_000;
/** Clock sync: this many round trips right after joining, this far apart. */
const SYNC_SAMPLES = 5;
const SYNC_SPACING = 200;

/**
 * Why talking to the server failed: it's over its free daily limit (or
 * down), we can't reach it, it doesn't allow this site (ALLOWED_ORIGINS), or
 * it answered nonsense.
 */
export type ServerProblem = "busy" | "unreachable" | "not-allowed" | "bad-reply";

export class ServerError extends Error {
  constructor(readonly problem: ServerProblem) {
    super(`3-4-Go! server: ${problem}`);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  if (!onlineAvailable) throw new ServerError("unreachable");
  let response: Response;
  try {
    response = await fetch(`${SERVER}${path}`, { ...init, headers: { "Content-Type": "application/json" } });
  } catch {
    throw new ServerError("unreachable");
  }
  // Over the free plan's daily limit, Cloudflare answers with errors until 00:00 UTC.
  if (response.status === 429 || response.status >= 500) throw new ServerError("busy");
  if (response.status === 403) throw new ServerError("not-allowed");
  if (!response.ok) throw new ServerError("bad-reply");
  try {
    return (await response.json()) as T;
  } catch {
    throw new ServerError("bad-reply");
  }
}

/** The open lobbies, newest first. */
export const listLobbies = () => call<LobbyListing[]>("/lobbies");

/** Makes a lobby; returns its code. Join it with `joinLobby` to become its host. */
export async function createLobby(lobby: NewLobby) {
  const { code } = await call<{ code: string }>("/lobbies", { method: "POST", body: JSON.stringify(lobby) });
  return code;
}

export type LobbyEvents = {
  /** You're in. `you` is your player id. Called again after a reconnect (with a new id). */
  welcome(you: string, lobby: LobbyState): void;
  /** The lobby changed (players, cars, names, settings, host). */
  lobby(lobby: LobbyState): void;
  /** Not let in (or the lobby is gone). The connection is closed. */
  refused(reason: RefusedReason): void;
  /** Connection lost for good (after one try at reconnecting), or never made. */
  closed(problem: ServerProblem): void;
};

export type LobbyConnection = {
  send(message: Exclude<ClientMessage, { type: "hello" | "time" }>): void;
  /** Leave the lobby. No more events after this. */
  close(): void;
  /** Server clock minus ours, in ms (0 until measured). */
  clockOffset(): number;
};

/** Joins the lobby with this code. Wrong password, full lobby etc. come back as `refused`. */
export function joinLobby(
  code: string,
  hello: { name: string; car: string; password: string },
  events: LobbyEvents,
): LobbyConnection {
  const url = `${SERVER.replace(/^http/, "ws")}/lobbies/${encodeURIComponent(code)}/socket`;
  let socket: WebSocket | null = null;
  let closedByUs = false;
  let reconnected = false;
  let pinger: ReturnType<typeof setInterval> | undefined;
  const syncTimers: ReturnType<typeof setTimeout>[] = [];
  /** Best clock sample so far: the one with the shortest round trip. */
  let sync = { offset: 0, roundTrip: Infinity };

  const raw = (message: ClientMessage) => {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  };

  const stopTimers = () => {
    clearInterval(pinger);
    syncTimers.splice(0).forEach(clearTimeout);
  };

  const connect = () => {
    let welcomed = false;
    let refused = false;
    const ws = new WebSocket(url);
    socket = ws;

    ws.addEventListener("open", () => {
      raw({ type: "hello", protocol: PROTOCOL, ...hello });
      pinger = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send(PING), PING_EVERY);
    });

    ws.addEventListener("message", (event) => {
      if (closedByUs || typeof event.data !== "string" || event.data === PONG) return;
      let message: ServerMessage;
      try {
        message = JSON.parse(event.data) as ServerMessage;
      } catch {
        return;
      }
      switch (message.type) {
        case "welcome":
          welcomed = true;
          events.welcome(message.you, message.lobby);
          for (let i = 0; i < SYNC_SAMPLES; i++) {
            syncTimers.push(setTimeout(() => raw({ type: "time", sent: Date.now() }), i * SYNC_SPACING));
          }
          break;
        case "lobby":
          events.lobby(message.lobby);
          break;
        case "refused":
          refused = true;
          events.refused(message.reason);
          break;
        case "time": {
          const now = Date.now();
          const roundTrip = now - message.sent;
          if (roundTrip >= 0 && roundTrip < sync.roundTrip) {
            sync = { offset: message.server - (message.sent + now) / 2, roundTrip };
          }
          break;
        }
      }
    });

    ws.addEventListener("close", () => {
      stopTimers();
      if (closedByUs || refused || socket !== ws) return;
      // Dropped after we were in: try once more (as a new player).
      if (welcomed && !reconnected) {
        reconnected = true;
        connect();
        return;
      }
      // A failed upgrade (server down, or over its free daily limit) looks
      // the same as no network from here.
      events.closed("unreachable");
    });
  };

  connect();

  return {
    send: raw,
    close() {
      closedByUs = true;
      stopTimers();
      socket?.close(1000, "left");
    },
    clockOffset: () => sync.offset,
  };
}
