/**
 * What the race server knows about the tracks: which exist and how long a
 * lap is, to throw out impossible record times. Shared with the server, so
 * only the track.json files (no images). Keep in step with data/tracks/index.ts.
 */
import beachDay from "../data/tracks/beach-day/track.json";
import hillClimb from "../data/tracks/hill-climb/track.json";
import westico from "../data/tracks/westico/track.json";
import winterland from "../data/tracks/winterland/track.json";

/** Length of a lap along the middle of the road, by track id. */
export const LAP_LENGTHS: Readonly<Record<string, number>> = {
  "hill-climb": hillClimb.lapLength,
  winterland: winterland.lapLength,
  "beach-day": beachDay.lapLength,
  westico: westico.lapLength,
};

/**
 * Faster than any car can go (map units/s): top speed 180, ×1.1 while
 * drifting, +1.5% for the best speed stat is ~201.
 */
const FASTER_THAN_ANY_CAR = 210;
/** Cutting corners makes a lap shorter than the middle of the road; this leaves room for a lot of it. */
const SHORTEST_LINE = 0.8;

/** No lap on this track can be faster than this (s). Null for a track that doesn't exist. */
export function minLapTime(track: string) {
  const length = LAP_LENGTHS[track];
  return length === undefined ? null : (length * SHORTEST_LINE) / FASTER_THAN_ANY_CAR;
}
