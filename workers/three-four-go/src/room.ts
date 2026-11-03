import { DurableObject } from "cloudflare:workers";

import {
  type ClientMessage,
  cleanName,
  cleanSettings,
  isId,
  type LobbyListing,
  type LobbyPhase,
  type LobbyPlayer,
  type LobbySettings,
  type LobbyState,
  MESSAGE_MAX,
  NAME_MAX,
  PING,
  PONG,
  PROTOCOL,
  type RefusedReason,
  type ServerMessage,
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

/** The lobby as stored (survives hibernation). */
type Stored = {
  code: string;
  settings: LobbySettings;
  /** SHA-256 of code + password, or null when open. */
  passwordHash: string | null;
  phase: LobbyPhase;
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
    await this.ctx.storage.put("lobby", stored);
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
        await this.ctx.storage.put("lobby", { ...stored, settings } satisfies Stored);
        await this.changed();
        return;
      }
    }
  }

  async webSocketClose(ws: WebSocket) {
    await this.left(ws);
  }

  async webSocketError(ws: WebSocket) {
    await this.left(ws);
  }

  /** Empty-room timeout, or the regular check-in with the directory. */
  async alarm() {
    const stored = await this.load();
    if (!stored) return;
    if (this.players().length === 0) {
      await this.closeRoom(stored.code);
      return;
    }
    await directory(this.env).update(this.listing(stored));
    await this.ctx.storage.setAlarm(Date.now() + CHECK_IN);
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
    if (this.players(ws).length === 0) await this.closeRoom(stored.code);
    else await this.changed(undefined, ws);
  }

  /** Last one out: the lobby is wiped (so nobody can join it any more), then leaves the list. */
  private async closeRoom(code: string) {
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
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

  private load() {
    return this.ctx.storage.get<Stored>("lobby");
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
