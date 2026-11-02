/** Physics runs at this fixed rate, whatever the screen's refresh rate. */
export const TICK = 1 / 60;
/** After a long stall (tab in the background), don't try to catch up more than this. */
const MAX_FRAME = 0.25;

export type Loop = { start(): void; stop(): void; readonly running: boolean };

/**
 * Game loop: `update` runs in fixed TICK steps, `render` once per screen
 * frame with how far it is between the last tick and the next (0–1), for
 * smooth drawing.
 */
export function createLoop(update: (dt: number) => void, render: (alpha: number) => void): Loop {
  let frame = 0;
  let last = 0;
  let accumulator = 0;

  const tick = (now: number) => {
    accumulator += Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    while (accumulator >= TICK) {
      update(TICK);
      accumulator -= TICK;
    }
    render(accumulator / TICK);
    frame = requestAnimationFrame(tick);
  };

  return {
    start() {
      if (frame) return;
      last = performance.now();
      accumulator = 0;
      frame = requestAnimationFrame(tick);
    },
    stop() {
      cancelAnimationFrame(frame);
      frame = 0;
    },
    get running() {
      return frame !== 0;
    },
  };
}
