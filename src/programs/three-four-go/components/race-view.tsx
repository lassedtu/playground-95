"use client";

import { type RefObject, useCallback, useEffect, useRef } from "react";

import { useElementSize } from "@/lib/use-element-size";
import { useElementVisible } from "@/lib/use-element-visible";

import { SURFACE } from "../data/palette";
import { TRACKS } from "../data/tracks";
import { VEHICLES } from "../data/vehicles";
import { makeDefaultSky, makeOutsideTile, SKY_BOTTOM } from "../engine/backdrop";
import { type Camera, cameraBehind, followCar, lerpCamera, VIEW_HEIGHT, VIEW_WIDTH } from "../engine/camera";
import { type Car, makeCar, NO_INPUT } from "../engine/car";
import { drawHud } from "../engine/hud";
import { createKeyboard, readPlayerInput } from "../engine/input";
import { createLoop, type Loop } from "../engine/loop";
import { drawGround, drawSky, type Fog } from "../engine/mode7";
import { bounceOffWall, stepCar, SURFACES } from "../engine/physics";
import { bestLap, makeRace, type Race, started, updateRace } from "../engine/race";
import { type CarPose, drawCars, loadSpriteSheets, type SpriteSheets } from "../engine/sprites";
import { loadTrack, surfaceAt, type Track } from "../engine/track";
import { dot, fromAngle, length, lerp, wrapAngle } from "../engine/vector";

const FOG: Fog = { color: SKY_BOTTOM, start: 260, end: 760 };

export type ViewStats = {
  track: string;
  lap: number;
  laps: number;
  time: number;
  bestLap: number | null;
  finished: boolean;
  paused: boolean;
  speed: number;
  drift: -1 | 0 | 1;
  fps: number;
};

export type ViewOptions = {
  /** Draw hitboxes and the heading / velocity vectors. */
  hitboxes: boolean;
  /** Show the logic layer instead of the ground texture. */
  logic: boolean;
};

/** What the window can tell a running race to do. */
export type RaceControls = { restart(): void; togglePause(): void };

type RaceViewProps = {
  options: ViewOptions;
  /** Called a few times a second with what the status bar shows. */
  onStats: (stats: ViewStats) => void;
  /** Filled in once the track has loaded. */
  controls: RefObject<RaceControls | null>;
};

/** Starts a race on a loaded track; returns a function that stops it all. */
function startRacing(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  track: Track,
  sheets: SpriteSheets,
  options: { current: ViewOptions },
  onStats: { current: (stats: ViewStats) => void },
  controls: RefObject<RaceControls | null>,
  loopRef: { current: Loop | null },
  visible: { current: boolean },
) {
  const outside = makeOutsideTile();
  const sky = makeDefaultSky();
  const image = ctx.createImageData(VIEW_WIDTH, VIEW_HEIGHT);
  const pixels = new Uint32Array(image.data.buffer);
  const keyboard = createKeyboard(canvas);

  // Just the player on pole for now (CPU drivers fill the rest of the grid later).
  const gridCars = () => {
    const pole = track.start[0];
    return [makeCar(VEHICLES[0], pole.x, pole.y, pole.angle)];
  };
  let cars: Car[] = [];
  let race: Race = makeRace(track, []);
  let previousCamera: Camera = cameraBehind(makeCar(VEHICLES[0], 0, 0, 0));
  let camera: Camera = previousCamera;
  let paused = false;
  let frames = 0;

  const restart = () => {
    cars = gridCars();
    race = makeRace(track, [cars[0]]);
    previousCamera = camera = cameraBehind(cars[0]);
    paused = false;
  };
  restart();

  const update = (dt: number) => {
    if (paused) return;
    const player = cars[0];
    stepCar(player, started(race) ? readPlayerInput(keyboard) : NO_INPUT, SURFACES[surfaceAt(track, player.p.x, player.p.y)], dt);
    bounceOffWall(player, surfaceAt(track, player.p.x, player.p.y) === SURFACE.wall);
    // Laps and the clock follow the cars' movement. A respawn moves the car
    // without it driving there; the camera jumps with it.
    const before = { ...player.p };
    updateRace(race, dt);
    if (player.p.x !== before.x || player.p.y !== before.y) camera = cameraBehind(player);
    previousCamera = camera;
    camera = followCar(camera, player, dt);
  };

  const pose = (c: Car, alpha: number): CarPose => ({
    car: c,
    p: { x: lerp(c.previous.p.x, c.p.x, alpha), y: lerp(c.previous.p.y, c.p.y, alpha) },
    heading: c.previous.heading + wrapAngle(c.heading - c.previous.heading) * alpha,
  });

  const render = (alpha: number) => {
    const view = lerpCamera(previousCamera, camera, paused ? 1 : alpha);
    drawSky(pixels, sky, view);
    drawGround(pixels, options.current.logic ? track.logicImage : track.ground, outside, view, FOG);
    ctx.putImageData(image, 0, 0);
    drawCars(ctx, view, cars.map((c) => pose(c, paused ? 1 : alpha)), sheets, options.current.hitboxes);
    drawHud(ctx, race, race.racers[0], paused);
    frames++;
  };

  const loop = createLoop(update, render);
  loopRef.current = loop;
  controls.current = {
    restart,
    togglePause: () => {
      paused = !paused;
      render(1);
    },
  };
  render(0);
  if (visible.current) loop.start();

  let lastReport = performance.now();
  const report = setInterval(() => {
    const now = performance.now();
    const racer = race.racers[0];
    const player = cars[0];
    onStats.current({
      track: track.name,
      lap: Math.min(Math.max(1, racer.lap), race.laps),
      laps: race.laps,
      time: racer.finished ?? Math.max(0, race.time),
      bestLap: bestLap(racer),
      finished: racer.finished !== null,
      paused,
      speed: length(player.v) * Math.sign(dot(player.v, fromAngle(player.heading)) || 1),
      drift: player.drift,
      fps: loop.running ? (frames * 1000) / (now - lastReport) : 0,
    });
    frames = 0;
    lastReport = now;
  }, 250);

  return () => {
    loop.stop();
    loopRef.current = null;
    controls.current = null;
    keyboard.dispose();
    clearInterval(report);
  };
}

function drawMessage(ctx: CanvasRenderingContext2D, text: string) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  ctx.fillStyle = "#c0c0c0";
  ctx.font = "8px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, VIEW_WIDTH / 2, VIEW_HEIGHT / 2);
}

/**
 * The 3D view: a 320×200 canvas scaled up (pixelated) as large as fits,
 * keeping its aspect ratio; whole-number scales when there's room for 2× or
 * more. The game loop only runs while the view is on screen.
 */
export function RaceView({ options, onStats, controls }: RaceViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onStatsRef = useRef(onStats);
  const optionsRef = useRef(options);
  const loopRef = useRef<Loop | null>(null);
  const visibleNow = useRef(false);
  const [areaRef, area] = useElementSize<HTMLDivElement>();
  const [visibleRef, visible] = useElementVisible<HTMLCanvasElement>();
  const setCanvas = useCallback(
    (element: HTMLCanvasElement | null) => {
      canvasRef.current = element;
      visibleRef(element);
    },
    [visibleRef],
  );

  useEffect(() => {
    onStatsRef.current = onStats;
    optionsRef.current = options;
  }, [onStats, options]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let stop = () => {};
    let cancelled = false;
    drawMessage(ctx, "Loading track…");
    canvas.focus();
    Promise.all([loadTrack(TRACKS[0]), loadSpriteSheets(VEHICLES.slice(0, 1))]).then(
      ([track, sheets]) => {
        if (cancelled) return;
        stop = startRacing(canvas, ctx, track, sheets, optionsRef, onStatsRef, controls, loopRef, visibleNow);
      },
      () => !cancelled && drawMessage(ctx, "Couldn't load the track."),
    );
    return () => {
      cancelled = true;
      stop();
    };
  }, [controls]);

  // Paused while minimized or scrolled out of view (and so behind the boss screen).
  useEffect(() => {
    visibleNow.current = visible;
    if (visible) loopRef.current?.start();
    else loopRef.current?.stop();
  }, [visible]);

  const fit = Math.min(area.width / VIEW_WIDTH, area.height / VIEW_HEIGHT);
  const scale = fit >= 2 ? Math.floor(fit) : fit;

  return (
    <div ref={areaRef} className="flex size-full items-center justify-center overflow-hidden">
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
    </div>
  );
}
