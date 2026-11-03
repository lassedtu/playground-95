import type { ResultRow } from "../components/results-dialog";
import { CPU_DRIVERS } from "../data/personalities";
import { type Vehicle, VEHICLES } from "../data/vehicles";
import type { ClientMessage, GridEntry, ResultEntry, ServerMessage } from "../net/protocol";
import { RemoteBuffer } from "../net/remote-car";
import type { RaceEntry } from "./lineup";

/** What a race view needs to race online. */
export type OnlineRace = {
  track: string;
  laps: number;
  grid: GridEntry[];
  /** Your place on the grid (your car's index in the race). */
  yourSlot: number;
  /** The grid as race entries, in slot order. */
  entries: RaceEntry[];
  /** Every car but yours, fed by the state messages. */
  remotes: Map<number, RemoteBuffer>;
  /** Race time now on the shared clock, in seconds (negative before GO). */
  raceTime(): number;
  /** Whether you're the host now: the host drives the CPUs. */
  hosting(): boolean;
  send(message: Extract<ClientMessage, { type: "state" | "finish" }>): void;
};

const vehicleNamed = (name: string) => VEHICLES.find((v) => v.name === name) ?? VEHICLES[0];

/** The CPUs' cars: the ones no player picked, in order (the same in every game). */
function cpuVehicles(grid: GridEntry[]): Vehicle[] {
  const picked = new Set(grid.flatMap((g) => (g.kind === "player" ? [vehicleNamed(g.car).name] : [])));
  const free = VEHICLES.filter((v) => !picked.has(v.name));
  return free.length ? free : [...VEHICLES];
}

/** A CPU's name and personality. */
const cpuDriver = (cpu: number) => CPU_DRIVERS[cpu % CPU_DRIVERS.length];

export function makeOnlineRace(
  start: Extract<ServerMessage, { type: "start" }>,
  you: { id: string; name: string },
  /** The lobby connection: the server's clock, whether you're host, and sending. */
  link: { serverNow(): number; hosting(): boolean; send: OnlineRace["send"] },
): OnlineRace | null {
  const grid = [...start.grid].sort((a, b) => a.slot - b.slot);
  const mine = grid.find((g): g is Extract<GridEntry, { kind: "player" }> => g.kind === "player" && g.id === you.id);
  if (!mine) return null;
  const hostNow = link.hosting();
  const cpuCars = cpuVehicles(grid);
  const remotes = new Map<number, RemoteBuffer>();

  const entries = grid.map((g): RaceEntry => {
    if (g.slot === mine.slot) {
      return { name: you.name, label: "", tag: null, vehicle: vehicleNamed(mine.car), control: { kind: "you" } };
    }
    const buffer = new RemoteBuffer();
    remotes.set(g.slot, buffer);
    if (g.kind === "player") {
      return { name: g.name, label: "", tag: g.name, vehicle: vehicleNamed(g.car), control: { kind: "remote", car: buffer } };
    }
    const driver = cpuDriver(g.cpu);
    const style = driver.personality.style;
    return {
      name: driver.name,
      label: driver.personality.label,
      tag: `${driver.name} (CPU)`,
      vehicle: cpuCars[g.cpu % cpuCars.length],
      // The host drives them; everyone else sees them like another player (and takes over if they become host).
      control: hostNow ? { kind: "cpu", style } : { kind: "remote", car: buffer, cpu: style },
    };
  });

  return {
    track: start.track,
    laps: start.laps,
    grid,
    yourSlot: mine.slot,
    entries,
    remotes,
    raceTime: () => (link.serverNow() - start.goAt) / 1000,
    hosting: link.hosting,
    send: link.send,
  };
}

/** The server's results as rows for the results dialog. */
export function onlineResultRows(race: OnlineRace, rows: ResultEntry[]): ResultRow[] {
  return rows.flatMap((row) => {
    const entry = race.entries[row.slot];
    if (!entry) return [];
    return [
      {
        name: entry.name,
        car: entry.vehicle.label,
        you: row.slot === race.yourSlot,
        time: row.time,
        bestLap: row.bestLap,
        note: row.left ? "Left" : row.time === null ? "DNF" : undefined,
      },
    ];
  });
}
