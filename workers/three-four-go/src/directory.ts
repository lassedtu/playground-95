import { DurableObject } from "cloudflare:workers";

import type { LobbyListing } from "../../../src/programs/three-four-go/net/protocol";
import type { Env } from "./env";

/** Lobbies not heard from in this long are left out (and removed). Rooms check in every minute. */
const STALE_AFTER = 3 * 60 * 1000;
/** Most lobbies the list shows. */
const LIST_MAX = 50;

/**
 * The list of open lobbies. Rooms tell it when they open, change and
 * close, and check in every minute while anyone is in them, so a room that
 * vanished without saying so drops off after a few minutes.
 */
export class Directory extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS lobbies (code TEXT PRIMARY KEY, listing TEXT NOT NULL, created INTEGER NOT NULL, seen INTEGER NOT NULL)",
    );
  }

  update(listing: LobbyListing) {
    const now = Date.now();
    this.ctx.storage.sql.exec(
      `INSERT INTO lobbies (code, listing, created, seen) VALUES (?, ?, ?, ?)
       ON CONFLICT(code) DO UPDATE SET listing = excluded.listing, seen = excluded.seen`,
      listing.code,
      JSON.stringify(listing),
      now,
      now,
    );
  }

  remove(code: string) {
    this.ctx.storage.sql.exec("DELETE FROM lobbies WHERE code = ?", code);
  }

  /** Open lobbies, newest first. */
  list(): LobbyListing[] {
    const sql = this.ctx.storage.sql;
    sql.exec("DELETE FROM lobbies WHERE seen < ?", Date.now() - STALE_AFTER);
    return sql
      .exec<{ listing: string }>("SELECT listing FROM lobbies ORDER BY created DESC LIMIT ?", LIST_MAX)
      .toArray()
      .map((row) => JSON.parse(row.listing) as LobbyListing);
  }
}
