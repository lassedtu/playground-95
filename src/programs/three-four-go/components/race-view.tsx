"use client";

import { useCallback, useEffect, useRef } from "react";

import { useElementSize } from "@/lib/use-element-size";
import { useElementVisible } from "@/lib/use-element-visible";

import { type Camera, lerpCamera, makeCamera, VIEW_HEIGHT, VIEW_WIDTH } from "../engine/camera";
import { createKeyboard } from "../engine/input";
import { createLoop } from "../engine/loop";
import { drawGround, drawSky, type Fog } from "../engine/mode7";
import { makeTestGround, makeTestOutside, makeTestSky, SKY_BOTTOM, TEST_START } from "../engine/test-track";

/** Debug fly camera (until there's a car to follow). */
const FLY_SPEED = 160;
const FLY_FAST = 3;
const TURN_SPEED = 1.8;
const FOG: Fog = { color: SKY_BOTTOM, start: 260, end: 760 };

export type ViewStats = { x: number; y: number; angle: number; fps: number };

type RaceViewProps = {
  /** Called a few times a second with what the status bar shows. */
  onStats: (stats: ViewStats) => void;
};

/**
 * The 3D view: a 320×200 canvas scaled up (pixelated) as large as fits,
 * keeping its aspect ratio; whole-number scales when there's room for 2× or
 * more. The game loop only runs while the view is on screen.
 */
export function RaceView({ onStats }: RaceViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onStatsRef = useRef(onStats);
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
  }, [onStats]);

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

    let previous: Camera = makeCamera(TEST_START.x, TEST_START.y, TEST_START.angle);
    let current: Camera = previous;
    let frames = 0;

    const held = (...codes: string[]) => codes.some((code) => keyboard.isDown(code));

    const update = (dt: number) => {
      previous = current;
      const turn = (held("ArrowRight", "KeyD") ? 1 : 0) - (held("ArrowLeft", "KeyA") ? 1 : 0);
      const move = (held("ArrowUp", "KeyW") ? 1 : 0) - (held("ArrowDown", "KeyS") ? 1 : 0);
      const speed = FLY_SPEED * (held("ShiftLeft", "ShiftRight") ? FLY_FAST : 1);
      const angle = current.angle + turn * TURN_SPEED * dt;
      current = {
        ...current,
        angle,
        x: current.x + Math.cos(angle) * move * speed * dt,
        y: current.y + Math.sin(angle) * move * speed * dt,
      };
    };

    const render = (alpha: number) => {
      const camera = lerpCamera(previous, current, alpha);
      drawSky(pixels, sky, camera);
      drawGround(pixels, ground, outside, camera, FOG);
      ctx.putImageData(image, 0, 0);
      frames++;
    };

    const loop = createLoop(update, render);
    loopRef.current = loop;
    render(0);
    canvas.focus();

    let lastReport = performance.now();
    const report = setInterval(() => {
      const now = performance.now();
      const degrees = ((((current.angle * 180) / Math.PI) % 360) + 360) % 360;
      onStatsRef.current({
        x: current.x,
        y: current.y,
        angle: degrees,
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
        aria-label="3-4-Go! race view. Arrow keys or W A S D to fly the camera, hold Shift to go faster."
        onPointerDown={(event) => event.currentTarget.focus()}
        className="block bg-black outline-none [image-rendering:pixelated]"
        style={{ width: VIEW_WIDTH * scale || undefined, height: VIEW_HEIGHT * scale || undefined }}
      />
    </div>
  );
}
