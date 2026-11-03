#!/usr/bin/env node
/**
 * Checks the race server's lobbies end to end, like a few players would:
 * create, list, passwords, full lobbies, host-only settings, duplicate
 * names, clock sync, keep-alive, host handover and closing.
 *
 *   node scripts/three-four-go/check-lobbies.mjs [server]
 *
 * Without `server`, starts the server locally (`wrangler dev` in
 * workers/three-four-go, port 8788) for the checks and stops it after.
 * Needs Node 23+ (built-in WebSocket and TypeScript imports).
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { PING, PONG, PROTOCOL } from "../../src/programs/three-four-go/net/protocol.ts";

const LOCAL_PORT = 8788;
const WAIT = 3000;

/** Starts `wrangler dev` and resolves once it's ready; returns a function that stops it. */
function startLocalServer() {
  const cwd = fileURLToPath(new URL("../../workers/three-four-go/", import.meta.url));
  const child = spawn("pnpm", ["exec", "wrangler", "dev", "--port", String(LOCAL_PORT), "--ip", "127.0.0.1"], {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  const stop = () => {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      // already gone
    }
  };
  return new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => {
      stop();
      reject(new Error(`wrangler dev didn't start:\n${output}`));
    }, 60_000);
    const onData = (data) => {
      output += data;
      if (/Ready on/i.test(output)) {
        clearTimeout(timer);
        resolve(stop);
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("exit", (exitCode) => {
      clearTimeout(timer);
      reject(new Error(`wrangler dev exited (${exitCode}):\n${output}`));
    });
  });
}

const stopServer = process.argv[2] ? () => {} : await startLocalServer();
const SERVER = (process.argv[2] ?? `http://127.0.0.1:${LOCAL_PORT}`).replace(/\/+$/, "");

let failures = 0;
function check(ok, what) {
  console.log(`${ok ? "  ok  " : "  FAIL"} ${what}`);
  if (!ok) failures++;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function api(path, init) {
  const response = await fetch(`${SERVER}${path}`, { ...init, headers: { "Content-Type": "application/json" } });
  return { status: response.status, body: await response.json() };
}

/** A fake player: a socket, everything it received, and a way to wait for the next message of a type. */
function player(code, hello) {
  const ws = new WebSocket(`${SERVER.replace(/^http/, "ws")}/lobbies/${code}/socket`);
  const inbox = [];
  const waiting = [];
  let closed = false;
  const deliver = (message) => {
    const i = waiting.findIndex((w) => w.type === message.type);
    if (i >= 0) waiting.splice(i, 1)[0].resolve(message);
    else inbox.push(message);
  };
  ws.addEventListener("open", () => ws.send(JSON.stringify({ type: "hello", protocol: PROTOCOL, password: "", car: "sedan", ...hello })));
  ws.addEventListener("message", (event) => deliver(event.data === PONG ? { type: "pong" } : JSON.parse(event.data)));
  ws.addEventListener("close", () => {
    closed = true;
    deliver({ type: "closed" });
  });
  return {
    send: (message) => ws.send(typeof message === "string" ? message : JSON.stringify(message)),
    close: () => ws.close(1000, "done"),
    get closed() {
      return closed;
    },
    /** The next message of this type (null if none comes in time). */
    next(type, ms = WAIT) {
      const i = inbox.findIndex((m) => m.type === type);
      if (i >= 0) return Promise.resolve(inbox.splice(i, 1)[0]);
      return new Promise((resolve) => {
        const entry = { type, resolve };
        waiting.push(entry);
        setTimeout(() => {
          const at = waiting.indexOf(entry);
          if (at >= 0) {
            waiting.splice(at, 1);
            resolve(null);
          }
        }, ms);
      });
    },
    /** The next message of this type that passes `test` (null if none comes in time); others are skipped. */
    async until(type, test, ms = WAIT) {
      const end = Date.now() + ms;
      for (let left = ms; left > 0; left = end - Date.now()) {
        const message = await this.next(type, left);
        if (!message || test(message)) return message;
      }
      return null;
    },
    /** Drops everything received so far. */
    clear: () => inbox.splice(0),
  };
}

const listed = async (code) => (await api("/lobbies")).body.find((l) => l.code === code);

/** The lobby's listing once it passes `test` (the list updates a moment after joins and leaves), or null. */
async function listedWhen(code, test, ms = WAIT) {
  const end = Date.now() + ms;
  do {
    const listing = await listed(code);
    if (test(listing)) return listing ?? true;
    await sleep(200);
  } while (Date.now() < end);
  return null;
}

console.log(`Race server: ${SERVER}`);

// Create
const created = await api("/lobbies", {
  method: "POST",
  body: JSON.stringify({ name: "Check lobby", password: "pw", track: "winterland", laps: 5, maxPlayers: 2, cpus: 3 }),
});
const code = created.body.code;
check(created.status === 201 && /^[A-Z2-9]{5}$/.test(code), `lobby created (${code})`);
check(!(await listed(code)), "empty lobby isn't listed yet");

// Host joins
const host = player(code, { name: "Hosty", password: "pw" });
const welcome = await host.next("welcome");
check(welcome?.lobby.players.length === 1 && welcome.lobby.players[0].host, "first player in is host");
check(welcome?.lobby.settings.track === "winterland" && welcome.lobby.settings.laps === 5, "settings kept");
check(welcome?.lobby.locked === true, "lobby is locked");
const listing = await listedWhen(code, (l) => l?.players === 1);
check(listing?.players === 1 && listing.maxPlayers === 2 && listing.locked, "listed with 1/2 players and a lock");

// Wrong password
const sneaky = player(code, { name: "Sneaky", password: "nope" });
check((await sneaky.next("refused"))?.reason === "password", "wrong password refused");
check((await sneaky.next("closed")) !== null, "refused connection closed");

// Right password, same name as the host
const guest = player(code, { name: "hosty", password: "pw" });
const guestWelcome = await guest.next("welcome");
const guestMe = guestWelcome?.lobby.players.find((p) => p.id === guestWelcome.you);
check(guestMe?.name === "hosty (2)" && !guestMe.host, `duplicate name made unique ("${guestMe?.name}")`);
check((await host.next("lobby"))?.lobby.players.length === 2, "host sees the guest join");

// Full
const third = player(code, { name: "Third", password: "pw" });
check((await third.next("refused"))?.reason === "full", "third player refused: full");

// Only the host changes settings; max players never drops below the players in
guest.send({ type: "settings", settings: { track: "westico" } });
check((await host.next("lobby", 1000)) === null, "guest can't change settings");
host.send({ type: "settings", settings: { track: "westico", maxPlayers: 1, cpus: 99, laps: 2, name: "  Renamed\u0007 lobby " } });
const changed = (await guest.next("lobby"))?.lobby.settings;
check(changed?.track === "westico", "host changed the track");
check(changed?.maxPlayers === 2, "max players clamped to the players in");
check(changed?.cpus === 7, "CPUs clamped to 7");
check(changed?.laps === 5, "bad lap count ignored");
check(changed?.name === "Renamed lobby", `lobby name cleaned ("${changed?.name}")`);
host.clear();

// Car and name changes
guest.send({ type: "car", car: "taxi" });
check((await host.until("lobby", (m) => m.lobby.players[1].car === "taxi")) !== null, "car change seen by host");
guest.send({ type: "name", name: "Guest" });
check((await host.until("lobby", (m) => m.lobby.players[1].name === "Guest")) !== null, "name change seen by host");
guest.clear();

// Clock sync and keep-alive
const sent = Date.now();
host.send({ type: "time", sent });
const time = await host.next("time");
check(time?.sent === sent && Math.abs(time.server - Date.now()) < 5000, "clock sync answered");
host.send(PING);
check((await host.next("pong")) !== null, "ping answered with pong");

// Junk is ignored
host.send("not json");
host.send({ type: "settings", settings: { name: "x".repeat(2000) } });
check(!host.closed, "junk messages ignored");
host.clear();

// Host leaves: the guest takes over
host.close();
const handover = await guest.until("lobby", (m) => m.lobby.players.length === 1);
check(handover?.lobby.players[0].host === true, "guest becomes host when the host leaves");
check((await listedWhen(code, (l) => l?.players === 1)) !== null, "list shows 1 player");

// Last one out closes the lobby
guest.close();
check((await listedWhen(code, (l) => !l)) !== null, "closed lobby leaves the list");
const late = player(code, { name: "Late" });
check((await late.next("refused"))?.reason === "gone", "joining a closed lobby: gone");

// Open lobby, wrong protocol
const open = (await api("/lobbies", { method: "POST", body: JSON.stringify({}) })).body.code;
const old = player(open, { name: "Old", protocol: 0 });
check((await old.next("refused"))?.reason === "version", "old game version refused");
const anyone = player(open, { name: "Anyone", password: "whatever" });
check((await anyone.next("welcome"))?.lobby.locked === false, "open lobby lets anyone in");
anyone.close();

// Bad routes
check((await api("/nope")).status === 404, "unknown route: 404");
const blocked = await fetch(`${SERVER}/lobbies`, { headers: { Origin: "https://evil.example" } });
check(blocked.status === 403, "other websites refused");

// A race: start, states passed on, finishes, results
console.log("Racing:");
const raceCode = (
  await api("/lobbies", { method: "POST", body: JSON.stringify({ name: "Race check", track: "westico", laps: 1, maxPlayers: 3, cpus: 2 }) })
).body.code;
const racer1 = player(raceCode, { name: "One" });
const one = await racer1.next("welcome");
racer1.send({ type: "start" });
check((await racer1.next("start", 800)) === null, "a race needs 2 players");
const racer2 = player(raceCode, { name: "Two", car: "taxi" });
const two = await racer2.next("welcome");
await racer1.until("lobby", (m) => m.lobby.players.length === 2);
racer2.send({ type: "start" });
check((await racer1.next("start", 800)) === null, "only the host starts");
racer1.send({ type: "start" });
const start1 = await racer1.next("start");
const start2 = await racer2.next("start");
check(start1 !== null && start2 !== null, "start sent to both");
const grid = start1?.grid ?? [];
check(grid.length === 4 && grid.filter((g) => g.kind === "cpu").length === 2, "grid: 2 players + the 2 CPUs asked for");
check(grid.every((g, i) => g.slot === i), "grid slots in order");
check(Math.abs((start1?.goAt ?? 0) - Date.now() - 4000) < 2500, "GO about 4 s away");
check((await racer2.until("lobby", (m) => m.lobby.phase === "racing")) !== null, "lobby says racing");
const late2 = player(raceCode, { name: "Late" });
check((await late2.next("refused"))?.reason === "racing", "can't join a race in progress");

const slotOf = (id) => grid.find((g) => g.kind === "player" && g.id === id).slot;
const cpuSlot = grid.find((g) => g.kind === "cpu").slot;
const car = (slot, lap = 0) => [slot, 100.5, 200.5, 10, 0, 1.5, 0, 0, lap, 1, 0, -1];
racer2.send({ type: "state", t: -3, cars: [car(slotOf(two.you))] });
check((await racer1.next("state"))?.cars[0][0] === slotOf(two.you), "state passed on to the other player");
racer2.send({ type: "state", t: -3, cars: [car(slotOf(one.you))] });
racer2.send({ type: "state", t: -3, cars: [car(cpuSlot)] });
check((await racer1.next("state", 800)) === null, "can't send someone else's car (or a CPU, unless host)");
racer1.send({ type: "state", t: -3, cars: [car(slotOf(one.you)), car(cpuSlot)] });
check((await racer2.next("state"))?.cars.length === 2, "host sends its car and the CPU");
racer2.send({ type: "finish", slot: slotOf(two.you), time: 30, bestLap: 30 });

await sleep(Math.max(0, (start1?.goAt ?? 0) - Date.now()) + 1500);
racer2.send({ type: "finish", slot: slotOf(two.you), time: 1.2, bestLap: 1.2 });
racer1.send({ type: "finish", slot: cpuSlot, time: 1.0, bestLap: 1.0 });
check((await racer1.next("results", 800)) === null, "no results while a player is still racing");
racer1.send({ type: "finish", slot: slotOf(one.you), time: 1.3, bestLap: null });
const results = await racer2.next("results");
check((await racer1.next("results")) !== null && results !== null, "results to both once every player finished");
check(
  results?.rows.slice(0, 3).map((r) => r.slot).join() === [cpuSlot, slotOf(two.you), slotOf(one.you)].join() &&
    results.rows[3].time === null,
  "results in finishing order, the CPU that didn't finish last (a too-early finish was ignored)",
);
check((await racer1.until("lobby", (m) => m.lobby.phase === "lobby")) !== null, "back to the lobby after the results");

// Someone leaves mid-race: the race ends when the rest have finished, and they're "left"
racer1.clear();
racer1.send({ type: "start" });
const again = await racer1.next("start");
await racer2.next("start");
await sleep(Math.max(0, (again?.goAt ?? 0) - Date.now()) + 1200);
racer2.close();
await racer1.until("lobby", (m) => m.lobby.players.length === 1);
racer1.send({ type: "finish", slot: again.grid.find((g) => g.kind === "player" && g.id === one.you).slot, time: 1, bestLap: 1 });
const afterLeave = await racer1.next("results");
const leftRow = afterLeave?.rows.find((r) => r.slot === again.grid.find((g) => g.kind === "player" && g.id === two.you).slot);
check(leftRow?.left === true && leftRow.time === null, "a player who left shows as left");
racer1.close();

await sleep(200);
console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
stopServer();
process.exit(failures ? 1 : 0);
