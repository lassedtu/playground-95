"use client";

import { useCallback, useEffect, useRef } from "react";

import { useElementSize } from "@/lib/use-element-size";
import { useElementVisible } from "@/lib/use-element-visible";

import { type Camera, cameraBehind, followCar, lerpCamera, VIEW_HEIGHT, VIEW_WIDTH } from "../engine/camera";
import { makeCar } from "../engine/car";
import { drawCarDebug, drawCarPlaceholder } from "../engine/draw-car";
import { createKeyboard, readPlayerInput } from "../engine/input";
import { createLoop } from "../engine/loop";
import { drawGround, drawSky, type Fog } from "../engine/mode7";
import { keepInside, ROAD, stepCar } from "../engine/physics";
import { makeTestGround, makeTestOutside, makeTestSky, SKY_BOTTOM, TEST_START } from "../engine/test-track";
import { dot, fromAngle, length, lerp, wrapAngle } from "../engine/vector";

const FOG: Fog = { color: SKY_BOTTOM, start: 260, end: 760 };

export type ViewStats = { speed: number; drift: -1 | 0 | 1; fps: number };

type RaceViewProps = {
  /** Draw hitboxes and the heading / velocity vectors. */
  debug: boolean;
  /** Called a few times a second with what the status bar shows. */
  onStats: (stats: ViewStats) => void;
};

/**
 * The 3D view: a 320×200 canvas scaled up (pixelated) as large as fits,
 * keeping its aspect ratio; whole-number scales when there's room for 2× or
 * more. The game loop only runs while the view is on screen.
 */
export function RaceView({ debug, onStats }: RaceViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onStatsRef = useRef(onStats);
  const debugRef = useRef(debug);
  const loopRef = useRef<ReturnType<typeof createLoop> | null>(null);
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
    debugRef.current = debug;
  }, [onStats, debug]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const ground = makeTestGround();
    const outside = makeTestOutside();
    const sky = makeTestSky();
    const image = ctx.createImageData(VIEW_WIDTH, VIEW_HEIGHT);
    const pixels = new Uint32Array(image.data.buffer);
    const keyboard = createKeyboard(canvas);

    const car = makeCar(TEST_START.x, TEST_START.y, TEST_START.angle);
    let previousCamera: Camera = cameraBehind(car);
    let camera: Camera = previousCamera;
    let frames = 0;

    const update = (dt: number) => {
      stepCar(car, readPlayerInput(keyboard), ROAD, dt);
      keepInside(car, ground.width, ground.height);
      previousCamera = camera;
      camera = followCar(camera, car, dt);
    };

    const render = (alpha: number) => {
      const view = lerpCamera(previousCamera, camera, alpha);
      drawSky(pixels, sky, view);
      drawGround(pixels, ground, outside, view, FOG);
      ctx.putImageData(image, 0, 0);

      const p = {
        x: lerp(car.previous.p.x, car.p.x, alpha),
        y: lerp(car.previous.p.y, car.p.y, alpha),
      };
      const heading = car.previous.heading + wrapAngle(car.heading - car.previous.heading) * alpha;
      drawCarPlaceholder(ctx, view, car, p, heading);
      if (debugRef.current) drawCarDebug(ctx, view, car, p, heading);
      frames++;
    };

    const loop = createLoop(update, render);
    loopRef.current = loop;
    render(0);
    canvas.focus();

    let lastReport = performance.now();
    const report = setInterval(() => {
      const now = performance.now();
      onStatsRef.current({
        speed: length(car.v) * Math.sign(dot(car.v, fromAngle(car.heading)) || 1),
        drift: car.drift,
        fps: loop.running ? (frames * 1000) / (now - lastReport) : 0,
      });
      frames = 0;
      lastReport = now;
    }, 250);

    return () => {
      loop.stop();
      loopRef.current = null;
      keyboard.dispose();
      clearInterval(report);
    };
  }, []);

  // Paused while minimized or scrolled out of view (and so behind the boss screen).
  useEffect(() => {
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
        aria-label="3-4-Go! race view. Up arrow or W for gas, down arrow or S to brake and reverse, left and right to steer, hold Shift or Space while steering to drift."
        onPointerDown={(event) => event.currentTarget.focus()}
        className="block bg-black outline-none [image-rendering:pixelated]"
        style={{ width: VIEW_WIDTH * scale || undefined, height: VIEW_HEIGHT * scale || undefined }}
      />
    </div>
  );
}
