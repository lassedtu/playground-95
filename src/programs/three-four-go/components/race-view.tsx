"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";

import { useElementSize } from "@/lib/use-element-size";
import { useElementVisible } from "@/lib/use-element-visible";

import { CPU_DRIVERS } from "../data/personalities";
import { TRACKS } from "../data/tracks";
import { type Vehicle, VEHICLES } from "../data/vehicles";
import { makeDefaultSky, makeOutsideTile, SKY_BOTTOM } from "../engine/backdrop";
import { type Camera, cameraBehind, followCar, lerpCamera, VIEW_HEIGHT, VIEW_WIDTH } from "../engine/camera";
import { type Car, makeCar, NO_INPUT } from "../engine/car";
import { collideCars, collideWithWalls, type Contact } from "../engine/collisions";
import { catchUp, type CpuDriver, DEFAULT_STYLE, drive, makeDriver } from "../engine/cpu";
import { drawContacts, drawCpuDebug, drawNameTag } from "../engine/draw-car";
import { drawHud } from "../engine/hud";
import { createKeyboard, type Keyboard, readPlayerInput } from "../engine/input";
import { createLoop, type Loop } from "../engine/loop";
import { drawGround, drawSky, type Fog } from "../engine/mode7";
import { stepCar, SURFACES } from "../engine/physics";
import { bestLap, makeRace, type Race, standings, started, updateRace } from "../engine/race";
import { seededRandom } from "../engine/random";
import { type CarPose, drawCars, loadSpriteSheets, type SpriteSheets } from "../engine/sprites";
import { loadTrack, surfaceAt, type Track } from "../engine/track";
import { lerp, wrapAngle } from "../engine/vector";
import type { RaceSettings } from "../lib/settings";
import type { ResultRow } from "./results-dialog";
import { TouchControls } from "./touch-controls";

const FOG: Fog = { color: SKY_BOTTOM, start: 260, end: 760 };
/** The debug view keeps showing the last collision contacts this long. */
const CONTACTS_SHOWN = 0.5;
/** Moving further than this in one tick is a respawn, not driving. */
const TELEPORT = 20;
/** Seconds between you finishing and the results (the finish screen shows meanwhile). */
const RESULTS_AFTER = 2.5;

export type ViewStats = {
  track: string;
  lap: number;
  laps: number;
  place: number;
  racers: number;
  time: number;
  bestLap: number | null;
  finished: boolean;
  paused: boolean;
};

export type ViewOptions = {
  /** Draw hitboxes, vectors, CPU whiskers and names (development only). */
  hitboxes: boolean;
  /** Show the logic layer instead of the ground texture (development only). */
  logic: boolean;
};

/** A finished race, as the results dialog shows it. */
export type FinishedRace = { settings: RaceSettings; trackName: string; rows: ResultRow[]; time: number; bestLap: number | null };

/** What the window can tell a running race to do. */
export type RaceControls = { restart(): void; togglePause(): void; press(code: string, down: boolean): void };

type RaceViewProps = {
  /** The race to run; a new object starts a new race. Null shows a title screen. */
  settings: RaceSettings | null;
  options: ViewOptions;
  /** Holds the race (e.g. while a dialog is open over it). */
  hold: boolean;
  /** Called a few times a second with what the status bar shows. */
  onStats: (stats: ViewStats) => void;
  /** Called once, a moment after you cross the line on your last lap. */
  onFinish: (race: FinishedRace) => void;
  /** Filled in while a race is running. */
  controls: RefObject<RaceControls | null>;
};

type Refs = {
  options: { current: ViewOptions };
  hold: { current: boolean };
  onStats: { current: (stats: ViewStats) => void };
  onFinish: { current: (race: FinishedRace) => void };
  controls: RefObject<RaceControls | null>;
  loop: { current: Loop | null };
  visible: { current: boolean };
};

const tracks = new Map<string, Promise<Track>>();
function trackFor(id: string) {
  let track = tracks.get(id);
  if (!track) {
    track = loadTrack(TRACKS.find((t) => t.id === id) ?? TRACKS[0]);
    track.catch(() => tracks.delete(id));
    tracks.set(id, track);
  }
  return track;
}

/** Your car, and one different car per CPU (theirs are fixed, yours can be any). */
function carsFor(settings: RaceSettings) {
  const yours = VEHICLES.find((v) => v.name === settings.car) ?? VEHICLES[0];
  const others = VEHICLES.filter((v) => v !== yours);
  return { yours, theirs: CPU_DRIVERS.slice(0, settings.cpus).map((_, i) => others[i % others.length]) };
}

/** Starts a race on a loaded track; returns a function that stops it all. */
function startRacing(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  settings: RaceSettings,
  track: Track,
  sheets: SpriteSheets,
  keyboard: Keyboard,
  refs: Refs,
) {
  const outside = makeOutsideTile();
  const sky = makeDefaultSky();
  const image = ctx.createImageData(VIEW_WIDTH, VIEW_HEIGHT);
  const pixels = new Uint32Array(image.data.buffer);
  const { yours, theirs } = carsFor(settings);

  // The CPUs on the grid in a different order every race, you at the back
  // (like the old kart games).
  const PLAYER = Math.min(settings.cpus, track.start.length - 1);
  const shuffle = seededRandom(Date.now() >>> 0);
  let cars: Car[] = [];
  let drivers: CpuDriver[] = [];
  let entries: { name: string; label: string; vehicle: Vehicle }[] = [];
  let race: Race = makeRace(track, []);
  let previousCamera: Camera = cameraBehind(makeCar(yours, 0, 0, 0));
  let camera: Camera = previousCamera;
  let paused = false;
  let reported = false;
  let place = 1;
  let recentContacts: Contact[] = [];
  let contactsAt = 0;

  const restart = () => {
    const grid = CPU_DRIVERS.slice(0, PLAYER)
      .map((entry, i) => ({ entry, vehicle: theirs[i], key: shuffle() }))
      .sort((a, b) => a.key - b.key);
    entries = [
      ...grid.map(({ entry, vehicle }) => ({ name: entry.name, label: entry.personality.label, vehicle })),
      { name: "You", label: "", vehicle: yours },
    ];
    cars = track.start.slice(0, PLAYER + 1).map((slot, i) => makeCar(entries[i].vehicle, slot.x, slot.y, slot.angle));
    // Every car gets a driver; yours takes over once you've finished.
    const seed = Math.floor(shuffle() * 1e9);
    drivers = cars.map((_, i) => makeDriver(i === PLAYER ? DEFAULT_STYLE : grid[i].entry.personality.style, seed + i));
    race = makeRace(track, cars, settings.laps);
    previousCamera = camera = cameraBehind(cars[PLAYER]);
    paused = false;
    reported = false;
  };
  restart();

  const finishedRace = (): FinishedRace => {
    const you = race.racers[PLAYER];
    return {
      settings,
      trackName: track.name,
      time: you.finished ?? 0,
      bestLap: bestLap(you),
      rows: standings(race).map((i) => ({
        name: entries[i].name,
        car: entries[i].vehicle.label,
        you: i === PLAYER,
        time: race.racers[i].finished,
        bestLap: bestLap(race.racers[i]),
      })),
    };
  };

  const update = (dt: number) => {
    if (paused || refs.hold.current) return;
    const player = cars[PLAYER];
    const you = race.racers[PLAYER];
    const before = { ...player.p };
    cars.forEach((car, i) => {
      const input =
        i === PLAYER && you.finished === null
          ? started(race)
            ? readPlayerInput(keyboard)
            : NO_INPUT
          : drive(race, race.racers[i], i, drivers[i], dt);
      const surface = SURFACES[surfaceAt(track, car.p.x, car.p.y)];
      // CPUs well behind you get a little extra top speed.
      const boost = i === PLAYER ? 1 : catchUp(race, race.racers[i], you);
      stepCar(car, input, boost === 1 ? surface : { ...surface, max: surface.max * boost }, dt);
    });
    // Bumps: cars against each other first, then walls (walls always win).
    const contacts: Contact[] = [];
    collideCars(cars, contacts);
    for (const car of cars) collideWithWalls(track, car, contacts);
    if (contacts.length) {
      recentContacts = contacts;
      contactsAt = race.time;
    } else if (race.time - contactsAt > CONTACTS_SHOWN) {
      recentContacts = [];
    }
    // Laps and the clock follow the cars' movement. A respawn moves the car
    // without it driving there; the camera jumps with it.
    updateRace(race, dt);
    place = standings(race).indexOf(PLAYER) + 1;
    if (Math.hypot(player.p.x - before.x, player.p.y - before.y) > TELEPORT) camera = cameraBehind(player);
    previousCamera = camera;
    camera = followCar(camera, player, dt);

    if (!reported && you.finished !== null && race.time - you.finished > RESULTS_AFTER) {
      reported = true;
      refs.onFinish.current(finishedRace());
    }
  };

  const pose = (c: Car, alpha: number): CarPose => ({
    car: c,
    p: { x: lerp(c.previous.p.x, c.p.x, alpha), y: lerp(c.previous.p.y, c.p.y, alpha) },
    heading: c.previous.heading + wrapAngle(c.heading - c.previous.heading) * alpha,
  });

  const render = (alpha: number) => {
    const still = paused || refs.hold.current;
    const t = still ? 1 : alpha;
    const options = refs.options.current;
    const view = lerpCamera(previousCamera, camera, t);
    drawSky(pixels, sky, view);
    drawGround(pixels, options.logic ? track.logicImage : track.ground, outside, view, FOG);
    ctx.putImageData(image, 0, 0);
    drawCars(ctx, view, cars.map((c) => pose(c, t)), sheets, options.hitboxes);
    if (options.hitboxes) {
      drawContacts(ctx, view, recentContacts);
      drivers.forEach((d, i) => {
        if (d.seen && (i !== PLAYER || race.racers[PLAYER].finished !== null)) drawCpuDebug(ctx, view, d.seen);
      });
      cars.forEach((c, i) => i !== PLAYER && drawNameTag(ctx, view, c.p, `${entries[i].name} (${entries[i].label})`));
    }
    drawHud(ctx, race, race.racers[PLAYER], place, paused);
  };

  const loop = createLoop(update, render);
  refs.loop.current = loop;
  refs.controls.current = {
    restart,
    togglePause: () => {
      paused = !paused;
      render(1);
    },
    press: keyboard.press,
  };
  render(0);
  if (refs.visible.current) loop.start();

  const report = setInterval(() => {
    const racer = race.racers[PLAYER];
    refs.onStats.current({
      track: track.name,
      lap: Math.min(Math.max(1, racer.lap), race.laps),
      laps: race.laps,
      place,
      racers: race.racers.length,
      time: racer.finished ?? Math.max(0, race.time),
      bestLap: bestLap(racer),
      finished: racer.finished !== null,
      paused,
    });
  }, 250);

  return () => {
    loop.stop();
    refs.loop.current = null;
    refs.controls.current = null;
    clearInterval(report);
  };
}

function drawMessage(ctx: CanvasRenderingContext2D, title: string, text: string) {
  ctx.fillStyle = "#000080";
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffff00";
  ctx.font = "bold 24px Arial, sans-serif";
  ctx.fillText(title, VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - 12);
  ctx.fillStyle = "#c0c0c0";
  ctx.font = "8px Arial, sans-serif";
  ctx.fillText(text, VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 14);
}

/**
 * The 3D view: a 320×200 canvas scaled up (pixelated) as large as fits,
 * keeping its aspect ratio; whole-number scales when there's room for 2× or
 * more. The game loop only runs while the view is on screen.
 */
export function RaceView({ settings, options, hold, onStats, onFinish, controls }: RaceViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Mutable values the game loop reads; kept up to date by the effect below.
  const optionsRef = useRef(options);
  const holdRef = useRef(hold);
  const onStatsRef = useRef(onStats);
  const onFinishRef = useRef(onFinish);
  const loopRef = useRef<Loop | null>(null);
  const visibleNow = useRef(false);
  const [areaRef, area] = useElementSize<HTMLDivElement>();
  const [visibleRef, visible] = useElementVisible<HTMLCanvasElement>();
  const [touch] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);
  const setCanvas = useCallback(
    (element: HTMLCanvasElement | null) => {
      canvasRef.current = element;
      visibleRef(element);
    },
    [visibleRef],
  );

  useEffect(() => {
    optionsRef.current = options;
    holdRef.current = hold;
    onStatsRef.current = onStats;
    onFinishRef.current = onFinish;
    // Coming back from a dialog: the view gets the keys again.
    if (!hold) canvasRef.current?.focus();
  }, [options, hold, onStats, onFinish]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (!settings) {
      drawMessage(ctx, "3-4-Go!", "Pick a track and a car to start.");
      return;
    }
    const refs: Refs = {
      options: optionsRef,
      hold: holdRef,
      onStats: onStatsRef,
      onFinish: onFinishRef,
      controls,
      loop: loopRef,
      visible: visibleNow,
    };
    const keyboard = createKeyboard(canvas);
    let stop = () => {};
    let cancelled = false;
    drawMessage(ctx, "3-4-Go!", "Loading track…");
    const { yours, theirs } = carsFor(settings);
    Promise.all([trackFor(settings.track), loadSpriteSheets([yours, ...theirs])]).then(
      ([track, sheets]) => {
        if (!cancelled) stop = startRacing(canvas, ctx, settings, track, sheets, keyboard, refs);
      },
      () => !cancelled && drawMessage(ctx, "3-4-Go!", "Couldn't load the track."),
    );
    return () => {
      cancelled = true;
      stop();
      keyboard.dispose();
    };
  }, [settings, controls]);

  // Paused while minimized or scrolled out of view (and so behind the boss screen).
  useEffect(() => {
    visibleNow.current = visible;
    if (visible) loopRef.current?.start();
    else loopRef.current?.stop();
  }, [visible]);

  const fit = Math.min(area.width / VIEW_WIDTH, area.height / VIEW_HEIGHT);
  const scale = fit >= 2 ? Math.floor(fit) : fit;

  return (
    <div ref={areaRef} className="relative flex size-full items-center justify-center overflow-hidden">
      <canvas
        ref={setCanvas}
        width={VIEW_WIDTH}
        height={VIEW_HEIGHT}
        tabIndex={0}
        aria-label="3-4-Go! race view. Up arrow or W for gas, down arrow or S to brake and reverse, left and right to steer, hold Shift or Space while steering to drift. P pauses, F2 restarts."
        onPointerDown={(event) => event.currentTarget.focus()}
        className="block bg-black outline-none [image-rendering:pixelated]"
        style={{ width: VIEW_WIDTH * scale || undefined, height: VIEW_HEIGHT * scale || undefined }}
      />
      {touch && settings && !hold && <TouchControls press={(code, down) => controls.current?.press(code, down)} />}
    </div>
  );
}
