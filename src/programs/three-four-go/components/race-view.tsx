"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";

import { useElementSize } from "@/lib/use-element-size";
import { useElementVisible } from "@/lib/use-element-visible";

import { THEMES } from "../data/ground-style";
import { SKIES } from "../data/skies";
import { TRACKS } from "../data/tracks";
import { type LoadedSky, loadSky, makeOutsideTile } from "../engine/backdrop";
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
import type { RemoteSample } from "../engine/remote";
import { type CarPose, drawCars, loadSpriteSheets, type SpriteSheets } from "../engine/sprites";
import { loadTrack, surfaceAt, type Track } from "../engine/track";
import { lerp, wrapAngle } from "../engine/vector";
import { type RaceEntry, soloLineup, soloVehicles } from "../lib/lineup";
import type { OnlineRace } from "../lib/online-race";
import type { RaceSettings } from "../lib/settings";
import { onlineAvailable } from "../net/client";
import { type CarState, STATE_RATE } from "../net/protocol";
import type { ResultRow } from "./results-dialog";
import { TouchControls } from "./touch-controls";

/** Distant ground fades into the sky's horizon colour between these distances. */
const FOG_START = 260;
const FOG_END = 760;
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

/** A finished race, as the results dialog shows it (online, the server's results come separately). */
export type FinishedRace = {
  settings: RaceSettings;
  trackName: string;
  rows: ResultRow[];
  time: number;
  bestLap: number | null;
  online: boolean;
};

/** What the window can tell a running race to do. */
export type RaceControls = { restart(): void; togglePause(): void; press(code: string, down: boolean): void };

type RaceViewProps = {
  /** The race to run; a new object starts a new race. Null shows a title screen. */
  settings: RaceSettings | null;
  /** Racing online: the grid and the shared clock (with `settings` for the track and laps). */
  online: OnlineRace | null;
  options: ViewOptions;
  /** Holds the race (e.g. while a dialog is open over it). */
  hold: boolean;
  /** Your name in the results. */
  playerName: string;
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
  playerName: { current: string };
  onStats: { current: (stats: ViewStats) => void };
  onFinish: { current: (race: FinishedRace) => void };
  controls: RefObject<RaceControls | null>;
  loop: { current: Loop | null };
  visible: { current: boolean };
};

const tracks = new Map<string, Promise<{ track: Track; sky: LoadedSky }>>();
/** A track and its sky, loaded once and kept for the next race. */
function trackFor(id: string) {
  let loaded = tracks.get(id);
  if (!loaded) {
    const definition = TRACKS.find((t) => t.id === id) ?? TRACKS[0];
    loaded = Promise.all([loadTrack(definition), loadSky(SKIES[definition.id])]).then(([track, sky]) => ({ track, sky }));
    loaded.catch(() => tracks.delete(id));
    tracks.set(id, loaded);
  }
  return loaded;
}

/** A number rounded to `places` decimals (to keep the state messages short). */
const round = (value: number, places: number) => Math.round(value * 10 ** places) / 10 ** places;

/**
 * Starts a race on a loaded track; returns a function that stops it all.
 * `lineup` gives the grid (called again on every restart). Online, the
 * race runs on the shared clock and can't be paused or restarted.
 */
function startRacing(
  ctx: CanvasRenderingContext2D,
  lineup: () => RaceEntry[],
  online: OnlineRace | null,
  settings: RaceSettings,
  track: Track,
  sky: LoadedSky,
  sheets: SpriteSheets,
  keyboard: Keyboard,
  refs: Refs,
) {
  const outside = makeOutsideTile(THEMES[track.theme] ?? THEMES.castle);
  const fog: Fog = { color: sky.fog, start: FOG_START, end: FOG_END };
  const image = ctx.createImageData(VIEW_WIDTH, VIEW_HEIGHT);
  const pixels = new Uint32Array(image.data.buffer);
  const random = seededRandom(Date.now() >>> 0);

  let entries: RaceEntry[] = [];
  /** Index of your car. */
  let yourIndex = 0;
  let cars: Car[] = [];
  /** A driver per car except remote ones; yours takes over once you've finished. */
  let drivers: (CpuDriver | null)[] = [];
  /** Remote cars whose position isn't known yet aren't drawn. */
  let known: boolean[] = [];
  let race: Race = makeRace(track, []);
  // Set by restart(), straight below.
  let previousCamera!: Camera;
  let camera!: Camera;
  let paused = false;
  let reported = false;
  let place = 1;
  let recentContacts: Contact[] = [];
  let contactsAt = 0;
  let driverSeed = 0;
  /** Online: cars whose finish has been sent. */
  const finishSent = new Set<number>();

  const restart = () => {
    entries = lineup().slice(0, track.start.length);
    yourIndex = Math.max(0, entries.findIndex((e) => e.control.kind === "you"));
    cars = entries.map((entry, i) => {
      const slot = track.start[i];
      const car = makeCar(entry.vehicle, slot.x, slot.y, slot.angle);
      car.fixed = entry.control.kind === "remote";
      return car;
    });
    driverSeed = Math.floor(random() * 1e9);
    drivers = entries.map(({ control }, i) =>
      control.kind === "remote" ? null : makeDriver(control.kind === "cpu" ? control.style : DEFAULT_STYLE, driverSeed + i),
    );
    known = entries.map((e) => e.control.kind !== "remote");
    race = makeRace(track, cars, settings.laps);
    entries.forEach((e, i) => (race.racers[i].external = e.control.kind === "remote"));
    if (online) race.time = online.raceTime();
    previousCamera = camera = cameraBehind(cars[yourIndex]);
    paused = false;
    reported = false;
  };
  restart();

  /** Puts a remote car where its machine says it is (for this tick). */
  const follow = (i: number, sample: RemoteSample | null) => {
    const car = cars[i];
    const racer = race.racers[i];
    known[i] = sample !== null;
    car.previous = { p: { ...car.p }, heading: car.heading };
    if (!sample) {
      car.ghost = true;
      return;
    }
    car.p = { ...sample.p };
    car.heading = sample.heading;
    car.v = { ...sample.v };
    car.drift = sample.drift;
    car.ghost = sample.ghost;
    racer.lap = sample.lap;
    racer.next = sample.next;
    racer.last = sample.last;
    racer.lapTimes = sample.lapTimes;
    racer.finished = sample.finished;
  };

  const finishedRace = (): FinishedRace => {
    const you = race.racers[yourIndex];
    return {
      settings,
      trackName: track.name,
      time: you.finished ?? 0,
      bestLap: bestLap(you),
      online: online !== null,
      rows: standings(race).map((i) => ({
        name: i === yourIndex ? refs.playerName.current : entries[i].name,
        car: entries[i].vehicle.label,
        you: i === yourIndex,
        time: race.racers[i].finished,
        bestLap: bestLap(race.racers[i]),
      })),
    };
  };

  /** You've just become host: the CPUs are yours to drive now, from where they are. */
  const takeOverCpus = () => {
    entries.forEach((entry, i) => {
      const { control } = entry;
      if (control.kind !== "remote" || !control.cpu) return;
      entries[i] = { ...entry, control: { kind: "cpu", style: control.cpu } };
      cars[i].fixed = false;
      race.racers[i].external = false;
      drivers[i] = makeDriver(control.cpu, driverSeed + i);
      known[i] = true;
    });
  };

  /** Online: tells the server about cars (yours, and the CPUs when hosting) that just finished. */
  const sendFinishes = () => {
    if (!online) return;
    const hosting = online.hosting();
    race.racers.forEach((racer, i) => {
      if (racer.finished === null || finishSent.has(i)) return;
      if (i !== yourIndex && !(hosting && entries[i].control.kind === "cpu")) return;
      finishSent.add(i);
      online.send({ type: "finish", slot: i, time: racer.finished, bestLap: bestLap(racer) });
    });
  };

  const update = (dt: number) => {
    if (online) {
      // On the shared clock (updateRace adds this tick's dt).
      race.time = online.raceTime() - dt;
      if (online.hosting()) takeOverCpus();
    } else if (paused || refs.hold.current) {
      return;
    }
    const player = cars[yourIndex];
    const you = race.racers[yourIndex];
    const before = { ...player.p };
    cars.forEach((car, i) => {
      const control = entries[i].control;
      if (control.kind === "remote") {
        follow(i, control.car.sample(race.time + dt));
        return;
      }
      const input =
        i === yourIndex && you.finished === null
          ? started(race)
            ? readPlayerInput(keyboard)
            : NO_INPUT
          : drive(race, race.racers[i], i, drivers[i]!, dt);
      const surface = SURFACES[surfaceAt(track, car.p.x, car.p.y)];
      // CPUs well behind you get a little extra top speed (not online: there's more than one "you").
      const boost = i === yourIndex || online ? 1 : catchUp(race, race.racers[i], you);
      stepCar(car, input, boost === 1 ? surface : { ...surface, max: surface.max * boost }, dt);
    });
    // Bumps: cars against each other first, then walls (walls always win).
    const contacts: Contact[] = [];
    collideCars(cars, contacts);
    for (const car of cars) if (!car.fixed) collideWithWalls(track, car, contacts);
    if (contacts.length) {
      recentContacts = contacts;
      contactsAt = race.time;
    } else if (race.time - contactsAt > CONTACTS_SHOWN) {
      recentContacts = [];
    }
    // Laps and the clock follow the cars' movement. A respawn moves the car
    // without it driving there; the camera jumps with it.
    updateRace(race, dt);
    sendFinishes();
    place = standings(race).indexOf(yourIndex) + 1;
    if (Math.hypot(player.p.x - before.x, player.p.y - before.y) > TELEPORT) camera = cameraBehind(player);
    previousCamera = camera;
    camera = followCar(camera, player, dt);

    // Online straight away (the server's results follow); alone after a moment on the finish screen.
    if (!reported && you.finished !== null && (online || race.time - you.finished > RESULTS_AFTER)) {
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
    const still = !online && (paused || refs.hold.current);
    const t = still ? 1 : alpha;
    const options = refs.options.current;
    const view = lerpCamera(previousCamera, camera, t);
    drawSky(pixels, sky.layers, view, sky.fog);
    drawGround(pixels, options.logic ? track.logicImage : track.ground, outside, view, fog);
    ctx.putImageData(image, 0, 0);
    const shown = cars.filter((_, i) => known[i]);
    drawCars(ctx, view, shown.map((c) => pose(c, t)), sheets, options.hitboxes);
    if (options.hitboxes) {
      drawContacts(ctx, view, recentContacts);
      drivers.forEach((d, i) => {
        if (d?.seen && (i !== yourIndex || race.racers[yourIndex].finished !== null)) drawCpuDebug(ctx, view, d.seen);
      });
    }
    cars.forEach((c, i) => {
      if (i === yourIndex || !known[i]) return;
      const { name, label, tag } = entries[i];
      const text = options.hitboxes ? (label ? `${name} (${label})` : name) : tag;
      if (text) drawNameTag(ctx, view, pose(c, t).p, text);
    });
    drawHud(ctx, race, race.racers[yourIndex], place, paused);
  };

  const loop = createLoop(update, render);
  refs.loop.current = loop;
  refs.controls.current = {
    restart: () => !online && restart(),
    togglePause: () => {
      if (online) return;
      paused = !paused;
      render(1);
    },
    press: keyboard.press,
  };

  // Online: your car (and, when hosting, the CPUs) to the others, ~15 times a second.
  // A timer rather than the game loop, so it keeps going (as a ghost) while the window is hidden.
  const sender = online
    ? setInterval(() => {
      const away = !refs.loop.current?.running;
      const hosting = online.hosting();
      const states: CarState[] = [];
      cars.forEach((car, i) => {
        if (i !== yourIndex && !(hosting && entries[i].control.kind === "cpu")) return;
        const racer = race.racers[i];
        states.push([
          i,
          round(car.p.x, 1),
          round(car.p.y, 1),
          away ? 0 : round(car.v.x, 1),
          away ? 0 : round(car.v.y, 1),
          round(car.heading, 3),
          car.drift,
          away ? 1 : 0,
          racer.lap,
          racer.next,
          racer.last,
          racer.finished === null ? -1 : round(racer.finished, 3),
        ]);
      });
      online.send({ type: "state", t: away ? online.raceTime() : race.time, cars: states });
    }, 1000 / STATE_RATE)
    : undefined;
  render(0);
  if (refs.visible.current) loop.start();

  const report = setInterval(() => {
    const racer = race.racers[yourIndex];
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
    clearInterval(sender);
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
export function RaceView({ settings, online, options, hold, playerName, onStats, onFinish, controls }: RaceViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Mutable values the game loop reads; kept up to date by the effect below.
  const optionsRef = useRef(options);
  const holdRef = useRef(hold);
  const playerNameRef = useRef(playerName);
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
    playerNameRef.current = playerName;
    onStatsRef.current = onStats;
    onFinishRef.current = onFinish;
    // Coming back from a dialog: the view gets the keys again.
    if (!hold) canvasRef.current?.focus();
  }, [options, hold, playerName, onStats, onFinish]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (!settings) {
      drawMessage(ctx, "3-4-Go!", onlineAvailable ? "Race the CPUs, or play online with friends." : "Pick a track and a car to start.");
      return;
    }
    const refs: Refs = {
      options: optionsRef,
      hold: holdRef,
      playerName: playerNameRef,
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
    const { yours, theirs } = soloVehicles(settings);
    const vehicles = online ? online.entries.map((e) => e.vehicle) : [yours, ...theirs];
    const random = seededRandom(Date.now() >>> 0);
    Promise.all([trackFor(settings.track), loadSpriteSheets(vehicles)]).then(
      ([{ track, sky }, sheets]) => {
        if (cancelled) return;
        const lineup = online ? () => online.entries : () => soloLineup(settings, track.start.length, random);
        stop = startRacing(ctx, lineup, online, settings, track, sky, sheets, keyboard, refs);
      },
      () => !cancelled && drawMessage(ctx, "3-4-Go!", "Couldn't load the track."),
    );
    return () => {
      cancelled = true;
      stop();
      keyboard.dispose();
    };
  }, [settings, online, controls]);

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
