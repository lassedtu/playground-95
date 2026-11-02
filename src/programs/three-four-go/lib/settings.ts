import { TRACKS } from "../data/tracks";
import { VEHICLES } from "../data/vehicles";
import { CPU_DRIVERS } from "../data/personalities";

/** What the New Race dialog picks. */
export type RaceSettings = {
  track: string;
  /** Your car (vehicle name). */
  car: string;
  laps: number;
  cpus: number;
};

export const LAP_CHOICES = [1, 3, 5] as const;
export const MAX_CPUS = CPU_DRIVERS.length;

const KEY = "playground95.three-four-go.settings";

export const DEFAULT_SETTINGS: RaceSettings = {
  track: TRACKS[0].id,
  car: VEHICLES[0].name,
  laps: 3,
  cpus: MAX_CPUS,
};

/** Last used settings, with anything no longer valid replaced by the default. */
export function loadSettings(): RaceSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<RaceSettings>;
    return {
      track: TRACKS.some((t) => t.id === saved.track) ? saved.track! : DEFAULT_SETTINGS.track,
      car: VEHICLES.some((v) => v.name === saved.car) ? saved.car! : DEFAULT_SETTINGS.car,
      laps: LAP_CHOICES.includes(saved.laps as 1) ? saved.laps! : DEFAULT_SETTINGS.laps,
      cpus: Number.isInteger(saved.cpus) && saved.cpus! >= 0 && saved.cpus! <= MAX_CPUS ? saved.cpus! : DEFAULT_SETTINGS.cpus,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: RaceSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // not remembered
  }
}
