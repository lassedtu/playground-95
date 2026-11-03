import { cleanName } from "../net/protocol";

export { cleanName, NAME_MAX } from "../net/protocol";

/** You, as other drivers (and the results) see you. */
export type Profile = { name: string };

const KEY = "playground95.three-four-go.profile";

/** Kept for the session too, in case localStorage isn't available. */
let current: Profile | null = null;

/** "Player" and a random four-digit number, e.g. "Player 4821". */
const defaultName = () => `Player ${1000 + Math.floor(Math.random() * 9000)}`;

/** Your saved profile; the first time, makes up a name and saves it. */
export function loadProfile(): Profile {
  if (current) return current;
  // Server render: nothing to load, and nothing to keep between visitors.
  if (typeof window === "undefined") return { name: "Player" };
  let saved: Partial<Profile> = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Profile>;
  } catch {
    // nothing saved (or no localStorage)
  }
  const name = typeof saved.name === "string" ? cleanName(saved.name) : "";
  if (name) {
    current = { name };
  } else {
    current = { name: defaultName() };
    saveProfile(current);
  }
  return current;
}

export function saveProfile(profile: Profile) {
  current = profile;
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // remembered for this session only
  }
}
