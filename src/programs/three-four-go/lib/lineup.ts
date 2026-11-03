import { CPU_DRIVERS } from "../data/personalities";
import { type Vehicle, VEHICLES } from "../data/vehicles";
import type { DrivingStyle } from "../engine/cpu";
import type { RemoteCar } from "../engine/remote";
import type { RaceSettings } from "./settings";

/** Who drives a car: you (keyboard), a CPU, or another player's machine. */
export type Control =
  | { kind: "you" }
  | { kind: "cpu"; style: DrivingStyle }
  /** `cpu`: a CPU the host drives, which you take over if you become host. */
  | { kind: "remote"; car: RemoteCar; cpu?: DrivingStyle };

/** One car on the grid, in grid order. */
export type RaceEntry = {
  name: string;
  /** Shown in the debug view after the name, e.g. the CPU's personality. */
  label: string;
  /** Drawn under the car, or null for none. */
  tag: string | null;
  vehicle: Vehicle;
  control: Control;
};

/** Your car, and one different car per CPU (theirs are fixed, yours can be any). */
export function soloVehicles(settings: RaceSettings) {
  const yours = VEHICLES.find((v) => v.name === settings.car) ?? VEHICLES[0];
  const others = VEHICLES.filter((v) => v !== yours);
  return { yours, theirs: CPU_DRIVERS.slice(0, settings.cpus).map((_, i) => others[i % others.length]) };
}

/**
 * A single-player grid: the CPUs in a different order every race, you at
 * the back (like the old kart games). At most `slots` cars.
 */
export function soloLineup(settings: RaceSettings, slots: number, random: () => number): RaceEntry[] {
  const { yours, theirs } = soloVehicles(settings);
  const cpus = Math.min(settings.cpus, slots - 1);
  const grid = CPU_DRIVERS.slice(0, cpus)
    .map((driver, i) => ({ driver, vehicle: theirs[i], key: random() }))
    .sort((a, b) => a.key - b.key);
  return [
    ...grid.map(({ driver, vehicle }): RaceEntry => ({
      name: driver.name,
      label: driver.personality.label,
      tag: null,
      vehicle,
      control: { kind: "cpu", style: driver.personality.style },
    })),
    { name: "You", label: "", tag: null, vehicle: yours, control: { kind: "you" } },
  ];
}
