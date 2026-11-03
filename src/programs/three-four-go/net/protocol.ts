/**
 * What the game and the race server (workers/three-four-go) say to each
 * other. Shared by both, so keep it plain TypeScript: no DOM, no Workers
 * types, no imports from the game.
 */

/** Bumped when the messages change; older clients are told to reload. */
export const PROTOCOL = 1;

/** Cars on the grid, players and CPUs together. */
export const MAX_CARS = 8;
export const MIN_PLAYERS = 2;
export const MAX_CPUS = MAX_CARS - 1;
export const LAP_CHOICES = [1, 3, 5] as const;

/** Lobby codes: no look-alikes (0/O, 1/I/L). */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 5;

export const NAME_MAX = 16;
export const LOBBY_NAME_MAX = 32;
export const PASSWORD_MAX = 32;
/** Longest message either side accepts, in characters. */
export const MESSAGE_MAX = 1024;

/**
 * Text as it's shown: control characters removed, runs of spaces made one,
 * trimmed, at most `max` characters. Empty if nothing is left.
 */
export function cleanText(text: string, max: number) {
  const cleaned = text.replace(/\p{C}/gu, "").replace(/\s+/g, " ").trim();
  return Array.from(cleaned).slice(0, max).join("").trim();
}

export const cleanName = (name: string) => cleanText(name, NAME_MAX);

/** A code as typed (any case, spaces) → the code, or null if it can't be one. */
export function normalizeCode(text: string) {
  const code = text.toUpperCase().replace(/[\s-]/g, "");
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c)) ? code : null;
}

/** Track ids and car names: short, plain identifiers (the game checks they exist). */
const ID = /^[A-Za-z0-9_-]{1,40}$/;
export const isId = (value: unknown): value is string => typeof value === "string" && ID.test(value);

/** What the host picks. */
export type LobbySettings = {
  name: string;
  track: string;
  laps: number;
  /** Players, host included (2–8). */
  maxPlayers: number;
  /** Up to this many CPUs fill the seats players leave empty. */
  cpus: number;
};

/** A new lobby, as the Create Lobby panel sends it. Empty password = open. */
export type NewLobby = LobbySettings & { password: string };

export type LobbyPlayer = { id: string; name: string; car: string; host: boolean };

export type LobbyPhase = "lobby" | "racing";

/** Everything a player in the lobby sees. */
export type LobbyState = {
  code: string;
  settings: LobbySettings;
  locked: boolean;
  phase: LobbyPhase;
  /** In the order they joined; the first is the host. */
  players: LobbyPlayer[];
};

/** One line in the list of open lobbies. */
export type LobbyListing = {
  code: string;
  name: string;
  track: string;
  laps: number;
  players: number;
  maxPlayers: number;
  locked: boolean;
  racing: boolean;
};

/** CPUs that race with this many players: as many as asked for, as long as there's room. */
export const cpusFor = (settings: LobbySettings, players: number) =>
  Math.max(0, Math.min(settings.cpus, MAX_CARS - players));

const clampInt = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : fallback;

/**
 * Lobby settings from untrusted input, each field checked and clamped;
 * anything missing or wrong keeps the value in `base`.
 */
export function cleanSettings(input: unknown, base: LobbySettings): LobbySettings {
  const raw = (typeof input === "object" && input !== null ? input : {}) as Partial<Record<keyof LobbySettings, unknown>>;
  const name = typeof raw.name === "string" ? cleanText(raw.name, LOBBY_NAME_MAX) : "";
  return {
    name: name || base.name,
    track: isId(raw.track) ? raw.track : base.track,
    laps: LAP_CHOICES.includes(raw.laps as 1) ? (raw.laps as number) : base.laps,
    maxPlayers: clampInt(raw.maxPlayers, MIN_PLAYERS, MAX_CARS, base.maxPlayers),
    cpus: clampInt(raw.cpus, 0, MAX_CPUS, base.cpus),
  };
}

export const DEFAULT_LOBBY: LobbySettings = { name: "Lobby", track: "hill-climb", laps: 3, maxPlayers: MAX_CARS, cpus: 0 };

export type RefusedReason = "password" | "full" | "racing" | "gone" | "version";

/** Game -> server. */
export type ClientMessage =
  | { type: "hello"; protocol: number; name: string; car: string; password: string }
  | { type: "settings"; settings: Partial<LobbySettings> }
  | { type: "car"; car: string }
  | { type: "name"; name: string }
  /** Clock sync: the server answers with its time. */
  | { type: "time"; sent: number };

/** Server -> game. */
export type ServerMessage =
  | { type: "welcome"; you: string; lobby: LobbyState }
  | { type: "refused"; reason: RefusedReason }
  | { type: "lobby"; lobby: LobbyState }
  | { type: "time"; sent: number; server: number };

/** Sent as plain text (not JSON) to keep a connection open; answered with "pong" for free. */
export const PING = "ping";
export const PONG = "pong";
