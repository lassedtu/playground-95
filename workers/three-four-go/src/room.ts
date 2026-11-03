import { DurableObject } from "cloudflare:workers";

import {
  type ClientMessage,
  cleanName,
  cleanSettings,
  cpusFor,
  type GridEntry,
  isCarState,
  isId,
  type LobbyListing,
  type LobbyPhase,
  type LobbyPlayer,
  type LobbySettings,
  type LobbyState,
  MAX_CARS,
  MESSAGE_MAX,
  MIN_PLAYERS,
  NAME_MAX,
  PING,
  PONG,
  PROTOCOL,
  RACE_LIMIT,
  type RefusedReason,
  type ResultEntry,
  RESULTS_GRACE,
  type ServerMessage,
  START_DELAY,
} from "../../../src/programs/three-four-go/net/protocol";
import { directory, type Env } from "./env";

/** A new room nobody joins is closed after this long. */
const EMPTY_TIMEOUT = 60 * 1000;
/** How often a room with players in it checks in with the directory. */
const CHECK_IN = 60 * 1000;
/** Messages a second one connection may send; more are ignored. */
const RATE_LIMIT = 30;
/** WebSocket close code for "refused" (application codes are 4000–4999). */
const CLOSE_REFUSED = 4000;

/** A race in progress. */
type Race = {
  /** Server time of GO (ms). */
  goAt: number;
  track: string;
  laps: number;
  grid: GridEntry[];
  /** Finish time and best lap per grid slot, as reported. */
  finishes: Record<number, { time: number; bestLap: number | null }>;
  /** When the results come at the latest (server time, ms). */
  resultsAt: number;
};

/** The lobby as stored (survives hibernation). */
type Stored = {
  code: string;
  settings: LobbySettings;
  /** SHA-256 of code + password, or null when open. */
  passwordHash: string | null;
  phase: LobbyPhase;
  race?: Race;
};

/** One player, kept on their connection (survives hibernation with it). */
type Player = { id: string; name: string; car: string; joinedAt: number };

async function hashPassword(code: string, password: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${code}:${password}`));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const send = (ws: WebSocket, message: ServerMessage) => {
  try {
    ws.send(JSON.stringify(message));
  } catch {
    // closing already
  }
};

/**
 * One lobby: the players' connections, its settings and who's host (the
 * player who's been in it longest). Uses hibernatable WebSockets, so a
 * lobby where nothing happens costs nothing; keep-alive pings are answered
 * by the runtime without waking it.
 */
export class Room extends DurableObject<Env> {
  /** Message counts per connection this second (lost on hibernation, which is fine). */
  private rates = new WeakMap<WebSocket, { second: number; count: number }>();
  /** The stored lobby, kept in memory (undefined = not read yet); written through `save`. */
  private cached: Stored | null | undefined;
  /**
   * How far round each grid slot is (lap and gate, from the state
   * messages), to order the cars that didn't finish. In memory only: a
   * room doesn't hibernate during a race (messages keep coming).
   */
  private progress = new Map<number, number>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(PING, PONG));
  }

  /** Sets up a new lobby. False if this code is already in use. */
  async create(code: string, settings: LobbySettings, password: string): Promise<boolean> {
    if (await this.load()) return false;
    const stored: Stored = {
      code,
      settings,
      passwordHash: password ? await hashPassword(code, password) : null,
      phase: "lobby",
    };
    await this.save(stored);
    await this.ctx.storage.setAlarm(Date.now() + EMPTY_TIMEOUT);
    return true;
  }

  /** A WebSocket upgrade for this lobby. Who it is comes in the first message ("hello"). */
  async fetch(): Promise<Response> {
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer) {
    if (typeof data !== "string" || data.length > MESSAGE_MAX || this.overLimit(ws)) return;
    let message: ClientMessage;
    try {
      message = JSON.parse(data) as ClientMessage;
    } catch {
      return;
    }
    if (typeof message !== "object" || message === null) return;

    const player = ws.deserializeAttachment() as Player | null;
    if (message.type === "hello") {
      if (!player) await this.hello(ws, message);
      return;
    }
    if (!player) return;
    switch (message.type) {
      case "time":
        if (typeof message.sent === "number") send(ws, { type: "time", sent: message.sent, server: Date.now() });
        return;
      case "car":
        if (!isId(message.car)) return;
        ws.serializeAttachment({ ...player, car: message.car } satisfies Player);
        await this.changed();
        return;
      case "name": {
        const name = typeof message.name === "string" ? cleanName(message.name) : "";
        if (!name) return;
        ws.serializeAttachment({ ...player, name: this.uniqueName(name, ws) } satisfies Player);
        await this.changed();
        return;
      }
      case "settings": {
        const stored = await this.load();
        const players = this.players();
        if (!stored || players[0]?.ws !== ws || stored.phase !== "lobby") return;
        const settings = cleanSettings(message.settings, stored.settings);
        // Never below the players already in.
        settings.maxPlayers = Math.max(settings.maxPlayers, players.length);
        await this.save({ ...stored, settings });
        await this.changed();
        return;
      }
      case "start":
        await this.start(ws);
        return;
      case "state":
        await this.relayState(ws, player, message, data);
        return;
      case "finish":
        await this.finish(ws, player, message);
        return;
    }
  }

  async webSocketClose(ws: WebSocket) {
    await this.left(ws);
  }

  async webSocketError(ws: WebSocket) {
    await this.left(ws);
  }

  /** Empty-room timeout, the results being due, or the regular check-in with the directory. */
  async alarm() {
    const stored = await this.load();
    if (!stored) return;
    if (this.players().length === 0) {
      await this.closeRoom(stored.code);
      return;
    }
    if (stored.race && Date.now() >= stored.race.resultsAt) {
      await this.endRace(stored);
      return;
    }
    await directory(this.env).update(this.listing(stored));
    await this.schedule();
  }

  /** Next alarm: the check-in, or the results if they're due sooner. */
  private async schedule() {
    const stored = await this.load();
    const checkIn = Date.now() + CHECK_IN;
    await this.ctx.storage.setAlarm(stored?.race ? Math.min(checkIn, stored.race.resultsAt) : checkIn);
  }

  /** Host: everyone in the lobby (and the CPUs that fit) onto a shuffled grid. GO in a few seconds. */
  private async start(ws: WebSocket) {
    const stored = await this.load();
    const players = this.players();
    if (!stored || stored.phase !== "lobby" || players[0]?.ws !== ws || players.length < MIN_PLAYERS) return;
    const entries: GridEntry[] = [
      ...players.map(({ player }): GridEntry => ({ slot: 0, kind: "player", id: player.id, name: player.name, car: player.car })),
      ...Array.from({ length: cpusFor(stored.settings, players.length) }, (_, cpu): GridEntry => ({ slot: 0, kind: "cpu", cpu })),
    ];
    const random = crypto.getRandomValues(new Uint32Array(entries.length));
    const grid = entries
      .map((entry, i) => ({ entry, key: random[i] }))
      .sort((a, b) => a.key - b.key)
      .map(({ entry }, slot) => ({ ...entry, slot }));
    const goAt = Date.now() + START_DELAY;
    const race: Race = {
      goAt,
      track: stored.settings.track,
      laps: stored.settings.laps,
      grid,
      finishes: {},
      resultsAt: goAt + RACE_LIMIT,
    };
    this.progress.clear();
    const next = { ...stored, phase: "racing" as const, race };
    await this.save(next);
    for (const p of players) send(p.ws, { type: "start", goAt, track: race.track, laps: race.laps, grid });
    await this.changed();
    await this.schedule();
  }

  /**
   * Whether `ws` may send this grid slot's car: its own car, and the CPUs
   * if it's the host. Returns the grid entry, or null.
   */
  private allowedSlot(race: Race, ws: WebSocket, player: Player, slot: unknown) {
    if (typeof slot !== "number") return null;
    const entry = race.grid[slot];
    if (!entry) return null;
    if (entry.kind === "player") return entry.id === player.id ? entry : null;
    return this.players()[0]?.ws === ws ? entry : null;
  }

  /** A player's car states (and the host's CPUs): checked, then passed on to everyone else as they are. */
  private async relayState(ws: WebSocket, player: Player, message: Extract<ClientMessage, { type: "state" }>, data: string) {
    const race = (await this.load())?.race;
    if (!race || typeof message.t !== "number" || !Array.isArray(message.cars) || message.cars.length > MAX_CARS) return;
    for (const car of message.cars) {
      if (!isCarState(car) || !this.allowedSlot(race, ws, player, car[0])) return;
    }
    for (const [slot, , , , , , , , lap, next] of message.cars) {
      // Gate 0 (the line) is the last one of a lap.
      this.progress.set(slot, lap * 1000 + (next === 0 ? 999 : next));
    }
    for (const other of this.players()) {
      if (other.ws === ws) continue;
      try {
        other.ws.send(data);
      } catch {
        // closing
      }
    }
  }

  /** A car's finish. The results come once every player still here is in (or the time's up). */
  private async finish(ws: WebSocket, player: Player, message: Extract<ClientMessage, { type: "finish" }>) {
    const stored = await this.load();
    const race = stored?.race;
    if (!stored || !race) return;
    const entry = this.allowedSlot(race, ws, player, message.slot);
    const elapsed = (Date.now() - race.goAt) / 1000;
    const { time, bestLap } = message;
    if (!entry || race.finishes[entry.slot]) return;
    // Not before GO, not later than now (a second of slack for the clocks).
    if (typeof time !== "number" || !(time > 0) || time > elapsed + 1) return;
    const lap = typeof bestLap === "number" && bestLap > 0 && bestLap <= time ? bestLap : null;
    race.finishes[entry.slot] = { time, bestLap: lap };
    if (entry.kind === "player") race.resultsAt = Math.min(race.resultsAt, Date.now() + RESULTS_GRACE);
    await this.save(stored);
    if (this.everyoneFinished(race)) await this.endRace(stored);
    else await this.schedule();
  }

  /** Every player on the grid who's still connected has finished. */
  private everyoneFinished(race: Race) {
    const here = new Set(this.players().map(({ player }) => player.id));
    return race.grid.every((g) => g.kind === "cpu" || !here.has(g.id) || race.finishes[g.slot] !== undefined);
  }

  /** Results to everyone, and back to the lobby. */
  private async endRace(stored: Stored) {
    const race = stored.race;
    if (!race) return;
    const here = new Set(this.players().map(({ player }) => player.id));
    const rows: ResultEntry[] = race.grid
      .map((g) => ({
        slot: g.slot,
        time: race.finishes[g.slot]?.time ?? null,
        bestLap: race.finishes[g.slot]?.bestLap ?? null,
        left: g.kind === "player" && !here.has(g.id),
      }))
      .sort((a, b) =>
        a.time !== null && b.time !== null
          ? a.time - b.time
          : a.time !== null
            ? -1
            : b.time !== null
              ? 1
              : (this.progress.get(b.slot) ?? 0) - (this.progress.get(a.slot) ?? 0),
      );
    await this.save({ ...stored, phase: "lobby", race: undefined });
    for (const { ws } of this.players()) send(ws, { type: "results", rows });
    await this.changed();
    await this.schedule();
  }

  private async hello(ws: WebSocket, message: Extract<ClientMessage, { type: "hello" }>) {
    const refuse = (reason: RefusedReason) => {
      send(ws, { type: "refused", reason });
      ws.close(CLOSE_REFUSED, reason);
    };
    const stored = await this.load();
    if (!stored) return refuse("gone");
    if (message.protocol !== PROTOCOL) return refuse("version");
    if (stored.phase !== "lobby") return refuse("racing");
    if (stored.passwordHash) {
      const password = typeof message.password === "string" ? message.password : "";
      if ((await hashPassword(stored.code, password)) !== stored.passwordHash) return refuse("password");
    }
    const players = this.players();
    if (players.length >= stored.settings.maxPlayers) return refuse("full");

    const name = (typeof message.name === "string" && cleanName(message.name)) || "Player";
    const player: Player = {
      id: crypto.randomUUID().slice(0, 8),
      name: this.uniqueName(name, ws),
      car: isId(message.car) ? message.car : "",
      joinedAt: Date.now(),
    };
    ws.serializeAttachment(player);
    if (players.length === 0) await this.ctx.storage.setAlarm(Date.now() + CHECK_IN);
    send(ws, { type: "welcome", you: player.id, lobby: this.state(stored) });
    await this.changed(ws);
  }

  private async left(ws: WebSocket) {
    const player = ws.deserializeAttachment() as Player | null;
    if (!player) return;
    // Forget it, so a second close/error event doesn't count it again.
    ws.serializeAttachment(null);
    const stored = await this.load();
    if (!stored) return;
    if (this.players(ws).length === 0) {
      await this.closeRoom(stored.code);
      return;
    }
    await this.changed(undefined, ws);
    // The last player still racing left: no need to wait for them.
    if (stored.race && this.everyoneFinished(stored.race)) await this.endRace(stored);
  }

  /** Last one out: the lobby is wiped (so nobody can join it any more), then leaves the list. */
  private async closeRoom(code: string) {
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
    this.cached = null;
    await directory(this.env).remove(code);
  }

  /**
   * Sends the lobby to everyone (except `skip`, who got it already) and
   * updates the directory. `gone` is a connection that's closing.
   */
  private async changed(skip?: WebSocket, gone?: WebSocket) {
    const stored = await this.load();
    if (!stored) return;
    const lobby = this.state(stored, gone);
    for (const { ws } of this.players(gone)) if (ws !== skip) send(ws, { type: "lobby", lobby });
    await directory(this.env).update(this.listing(stored, gone));
  }

  private async load() {
    if (this.cached === undefined) this.cached = (await this.ctx.storage.get<Stored>("lobby")) ?? null;
    return this.cached;
  }

  private async save(stored: Stored) {
    this.cached = stored;
    await this.ctx.storage.put("lobby", stored);
  }

  /** Players in the order they joined (the first is host), without `except`. */
  private players(except?: WebSocket) {
    return this.ctx
      .getWebSockets()
      .filter((ws) => ws !== except)
      .map((ws) => ({ ws, player: ws.deserializeAttachment() as Player | null }))
      .filter((p): p is { ws: WebSocket; player: Player } => p.player !== null)
      .sort((a, b) => a.player.joinedAt - b.player.joinedAt);
  }

  private state(stored: Stored, gone?: WebSocket): LobbyState {
    const players: LobbyPlayer[] = this.players(gone).map(({ player }, i) => ({
      id: player.id,
      name: player.name,
      car: player.car,
      host: i === 0,
    }));
    return { code: stored.code, settings: stored.settings, locked: stored.passwordHash !== null, phase: stored.phase, players };
  }

  private listing(stored: Stored, gone?: WebSocket): LobbyListing {
    return {
      code: stored.code,
      name: stored.settings.name,
      track: stored.settings.track,
      laps: stored.settings.laps,
      players: this.players(gone).length,
      maxPlayers: stored.settings.maxPlayers,
      locked: stored.passwordHash !== null,
      racing: stored.phase === "racing",
    };
  }

  /** `name`, or "name (2)", "name (3)"… if someone else here has it. */
  private uniqueName(name: string, self: WebSocket) {
    const taken = new Set(
      this.players(self).map(({ player }) => player.name.toLowerCase()),
    );
    if (!taken.has(name.toLowerCase())) return name;
    for (let n = 2; ; n++) {
      const suffix = ` (${n})`;
      const candidate = Array.from(name).slice(0, NAME_MAX - suffix.length).join("").trim() + suffix;
      if (!taken.has(candidate.toLowerCase())) return candidate;
    }
  }

  private overLimit(ws: WebSocket) {
    const second = Math.floor(Date.now() / 1000);
    const rate = this.rates.get(ws);
    if (!rate || rate.second !== second) {
      this.rates.set(ws, { second, count: 1 });
      return false;
    }
    rate.count++;
    return rate.count > RATE_LIMIT;
  }
}
