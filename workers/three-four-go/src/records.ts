import { DurableObject } from "cloudflare:workers";

import {
  BOARD_SIZE,
  cleanRecord,
  LAP_CHOICES,
  type RecordEntry,
  type RecordPlaces,
  type TrackBoards,
} from "../../../src/programs/three-four-go/net/protocol";
import { LAP_LENGTHS, minLapTime } from "../../../src/programs/three-four-go/net/tracks";
import type { Env } from "./env";

/** Submissions a minute from one address; more are ignored. */
const SUBMIT_LIMIT = 20;
/** `laps` for the fastest-lap board (races are 1, 3 or 5 laps). */
const LAP_BOARD = 0;

/**
 * The global records: per track, the 10 fastest laps and the 10 fastest
 * races for each number of laps. One time per name and board (beating your
 * own time replaces it), so one player can't fill a board. Stored in the
 * Durable Object's own SQLite; nothing else is kept.
 */
export class Records extends DurableObject<Env> {
  /** Submissions per address this minute (in memory only). */
  private submits = new Map<string, { minute: number; count: number }>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS times (
        track TEXT NOT NULL,
        laps INTEGER NOT NULL,
        name TEXT NOT NULL,
        car TEXT NOT NULL,
        time REAL NOT NULL,
        at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS times_board ON times (track, laps, time, at);
    `);
  }

  /** A track's boards, or null if there's no such track. */
  boards(track: string): TrackBoards | null {
    if (LAP_LENGTHS[track] === undefined) return null;
    const board = (laps: number) =>
      this.ctx.storage.sql
        .exec<RecordEntry>(
          "SELECT name, car, time, at FROM times WHERE track = ? AND laps = ? ORDER BY time, at LIMIT ?",
          track,
          laps,
          BOARD_SIZE,
        )
        .toArray()
        .map((row) => ({ ...row }));
    return { laps: board(LAP_BOARD), races: Object.fromEntries(LAP_CHOICES.map((laps) => [String(laps), board(laps)])) };
  }

  /** A finished race: its best lap and its total time onto the boards. Null if it was refused. */
  submit(input: unknown, address: string): RecordPlaces | null {
    if (this.overLimit(address)) return null;
    const record = cleanRecord(input, minLapTime);
    if (!record) return null;
    const total = Math.round(record.lapTimes.reduce((sum, t) => sum + t, 0) * 1000) / 1000;
    const best = Math.min(...record.lapTimes);
    return {
      lap: this.place(record.track, LAP_BOARD, record.name, record.car, best),
      race: this.place(record.track, record.laps, record.name, record.car, total),
    };
  }

  /** Puts a time on a board if it makes the top 10 (and beats that name's own); returns its place, or null. */
  private place(track: string, laps: number, name: string, car: string, time: number) {
    const sql = this.ctx.storage.sql;
    const own = sql
      .exec<{ time: number }>("SELECT time FROM times WHERE track = ? AND laps = ? AND lower(name) = lower(?)", track, laps, name)
      .toArray()[0];
    if (own && own.time <= time) return null;
    // Ties go to whoever was first.
    const ahead = sql
      .exec<{ n: number }>(
        "SELECT count(*) AS n FROM times WHERE track = ? AND laps = ? AND time <= ? AND lower(name) <> lower(?)",
        track,
        laps,
        time,
        name,
      )
      .one().n;
    if (ahead >= BOARD_SIZE) return null;
    sql.exec("DELETE FROM times WHERE track = ? AND laps = ? AND lower(name) = lower(?)", track, laps, name);
    sql.exec("INSERT INTO times (track, laps, name, car, time, at) VALUES (?, ?, ?, ?, ?, ?)", track, laps, name, car, time, Date.now());
    // Only the top 10 are kept.
    sql.exec(
      `DELETE FROM times WHERE track = ? AND laps = ? AND rowid NOT IN (
         SELECT rowid FROM times WHERE track = ? AND laps = ? ORDER BY time, at LIMIT ?
       )`,
      track,
      laps,
      track,
      laps,
      BOARD_SIZE,
    );
    return ahead + 1;
  }

  private overLimit(address: string) {
    const minute = Math.floor(Date.now() / 60_000);
    const entry = this.submits.get(address);
    if (!entry || entry.minute !== minute) {
      if (this.submits.size > 10_000) this.submits.clear();
      this.submits.set(address, { minute, count: 1 });
      return false;
    }
    entry.count++;
    return entry.count > SUBMIT_LIMIT;
  }
}
