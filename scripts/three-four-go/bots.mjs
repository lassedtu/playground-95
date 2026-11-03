#!/usr/bin/env node
/**
 * Fake players for testing 3-4-Go!'s online play without 8 browsers: they
 * join a lobby, and when the host starts a race they drive the middle of the
 * road at a steady speed (each a bit faster than the last, in their own
 * lane), report their laps and finish like a real player, and wait in the
 * lobby for the next race. They never send times to the global records.
 *
 *   node --no-warnings scripts/three-four-go/bots.mjs <lobby code> [bots] [--password <pw>] [--server <url>]
 *
 * Make the lobby in the game first and stay its host (bots can't start races
 * or drive CPUs). The server defaults to NEXT_PUBLIC_THREE_FOUR_GO_SERVER in
 * .env.local, else http://localhost:8787. Ctrl+C makes them leave.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { PING, PONG, PROTOCOL, STATE_RATE } from "../../src/programs/three-four-go/net/protocol.ts";
import { sampleCurve } from "./curve.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));

function option(name) {
  const at = process.argv.indexOf(name);
  if (at < 0) return null;
  const [value] = process.argv.splice(at, 2).slice(1);
  return value ?? null;
}
const password = option("--password") ?? "";
const envFile = `${root}.env.local`;
const fromEnv = existsSync(envFile) ? /^NEXT_PUBLIC_THREE_FOUR_GO_SERVER=(.+)$/m.exec(readFileSync(envFile, "utf8"))?.[1].trim() : null;
const SERVER = (option("--server") ?? fromEnv ?? "http://localhost:8787").replace(/\/+$/, "");
const code = process.argv[2]?.toUpperCase();
const count = Math.max(1, Math.min(7, Number(process.argv[3] ?? 3)));
if (!code) {
  console.error("Usage: bots.mjs <lobby code> [bots] [--password <pw>] [--server <url>]");
  process.exit(1);
}

/** Cars they pick, in turn. */
const CARS = ["police", "van", "jeep", "rally", "mobil", "armor", "kamaro"];
/** Steady speed of the first bot (map units/s), and how much faster each next one is. */
const SPEED = 120;
const SPEED_STEP = 8;
/** Pulling away from the grid (units/s²). */
const ACCEL = 110;
/** Lanes across the road, so they don't all drive on top of each other. */
const LANES = [-16, 0, 16];

/** A track's road, its gates and its grid. */
const tracks = new Map();
async function trackFor(id) {
  if (!tracks.has(id)) {
    const design = (await import(`./designs/${id}.mjs`)).default;
    const info = JSON.parse(readFileSync(`${root}src/programs/three-four-go/data/tracks/${id}/track.json`, "utf8"));
    tracks.set(id, { design, info, ...sampleCurve(design) });
  }
  return tracks.get(id);
}

/** Point, direction and sideways normal at a distance along the road. */
function along(track, distance) {
  const { curve, arc, count, lapLength } = track;
  const s = ((distance % lapLength) + lapLength) % lapLength;
  let lo = 0;
  let hi = count;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (arc[mid] <= s) lo = mid;
    else hi = mid;
  }
  const [ax, ay] = curve[lo];
  const [bx, by] = curve[(lo + 1) % count];
  const t = (s - arc[lo]) / (arc[lo + 1] - arc[lo] || 1);
  const dx = bx - ax;
  const dy = by - ay;
  const l = Math.hypot(dx, dy) || 1;
  return { x: ax + dx * t, y: ay + dy * t, fx: dx / l, fy: dy / l };
}

/** How far before the finish line (negative) a grid slot is, along the road. */
function gridDistance(track, slot) {
  const { x, y } = track.info.start[slot];
  let best = 0;
  let bestGap = Infinity;
  track.curve.forEach(([cx, cy], i) => {
    const gap = Math.hypot(cx - x, cy - y);
    if (gap < bestGap) {
      bestGap = gap;
      best = track.arc[i];
    }
  });
  const behind = (((best - track.finishArc) % track.lapLength) + track.lapLength) % track.lapLength;
  return behind > track.lapLength / 2 ? behind - track.lapLength : behind;
}

const round = (value, places) => Math.round(value * 10 ** places) / 10 ** places;

function bot(index) {
  const name = `Bot ${index + 1}`;
  const speed = SPEED + index * SPEED_STEP;
  const lane = LANES[index % LANES.length];
  const ws = new WebSocket(`${SERVER.replace(/^http/, "ws")}/lobbies/${code}/socket`);
  let you = null;
  let offset = 0;
  let bestTrip = Infinity;
  let racing = null;
  let sender = null;
  const send = (message) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(message));
  const log = (text) => console.log(`${name}: ${text}`);

  const stopRacing = () => {
    clearInterval(sender);
    sender = null;
    racing = null;
  };

  ws.addEventListener("open", () => {
    send({ type: "hello", protocol: PROTOCOL, name, car: CARS[index % CARS.length], password });
    setInterval(() => ws.readyState === WebSocket.OPEN && ws.send(PING), 30_000);
  });

  ws.addEventListener("message", async (event) => {
    if (event.data === PONG) return;
    const message = JSON.parse(event.data);
    switch (message.type) {
      case "welcome":
        you = message.you;
        log(`joined ${code} as "${message.lobby.players.find((p) => p.id === you)?.name}"`);
        for (let i = 0; i < 5; i++) setTimeout(() => send({ type: "time", sent: Date.now() }), i * 200);
        break;
      case "time": {
        const now = Date.now();
        if (now - message.sent < bestTrip) {
          bestTrip = now - message.sent;
          offset = message.server - (message.sent + now) / 2;
        }
        break;
      }
      case "refused":
        log(`not let in: ${message.reason}`);
        break;
      case "start": {
        stopRacing();
        const entry = message.grid.find((g) => g.kind === "player" && g.id === you);
        if (!entry) break;
        const track = await trackFor(message.track);
        const gates = track.design.checkpoints + 1;
        const lapLength = track.lapLength;
        const startAt = gridDistance(track, entry.slot);
        const accelTime = speed / ACCEL;
        racing = { slot: entry.slot, finished: -1 };
        log(`racing ${message.track} from grid slot ${entry.slot + 1}`);

        sender = setInterval(() => {
          const t = (Date.now() + offset - message.goAt) / 1000;
          const slot = track.info.start[entry.slot];
          let state;
          if (t < 0) {
            state = [entry.slot, slot.x, slot.y, 0, 0, slot.angle, 0, 0, 0, 0, -1, -1];
          } else {
            const driven = t < accelTime ? 0.5 * ACCEL * t * t : 0.5 * ACCEL * accelTime ** 2 + speed * (t - accelTime);
            const now = Math.min(speed, ACCEL * t);
            const fromLine = startAt + driven;
            const p = along(track, track.finishArc + fromLine);
            const x = p.x - p.fy * lane;
            const y = p.y + p.fx * lane;
            // Laps started, and gates crossed this lap (0 = the line, 1… = checkpoints).
            const lap = fromLine < 0 ? 0 : Math.floor(fromLine / lapLength) + 1;
            const passed = fromLine < 0 ? -1 : Math.floor(((fromLine % lapLength) / lapLength) * gates);
            const next = (passed + 1) % gates;
            if (racing.finished < 0 && fromLine >= message.laps * lapLength) {
              racing.finished = round(t, 3);
              send({ type: "finish", slot: entry.slot, time: racing.finished, bestLap: round(lapLength / speed, 3) });
              log(`finished in ${racing.finished.toFixed(1)} s`);
            }
            state = [
              entry.slot,
              round(x, 1),
              round(y, 1),
              round(p.fx * now, 1),
              round(p.fy * now, 1),
              round(Math.atan2(p.fy, p.fx), 3),
              0,
              0,
              racing.finished >= 0 ? message.laps : lap,
              next,
              Math.max(passed, -1),
              racing.finished,
            ];
          }
          send({ type: "state", t: round(t, 3), cars: [state] });
        }, 1000 / STATE_RATE);
        break;
      }
      case "results":
        stopRacing();
        log("race over, back in the lobby");
        break;
    }
  });

  ws.addEventListener("close", () => {
    stopRacing();
    log("left");
  });
  return () => ws.close(1000, "bye");
}

console.log(`${count} bot${count === 1 ? "" : "s"} joining ${code} on ${SERVER}. Ctrl+C to make them leave.`);
const leave = [];
for (let i = 0; i < count; i++) {
  leave.push(bot(i));
  // One at a time, so they join in order.
  await new Promise((resolve) => setTimeout(resolve, 300));
}
process.on("SIGINT", () => {
  leave.forEach((close) => close());
  setTimeout(() => process.exit(0), 300);
});
