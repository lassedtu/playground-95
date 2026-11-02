import { VIEW_HEIGHT, VIEW_WIDTH } from "./camera";
import { bestLap, countdownText, currentLapTime, formatTime, isWrongWay, noteText, type Race, type Racer } from "./race";

const FONT = "Arial, sans-serif";

/** Text with a dark outline so it reads on any background. */
function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign) {
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(2, size / 5);
  ctx.strokeStyle = "#000";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/** Lap and times in the corners, countdown and messages in the middle. */
export function drawHud(ctx: CanvasRenderingContext2D, race: Race, racer: Racer, paused: boolean) {
  const lap = Math.min(Math.max(1, racer.lap), race.laps);
  label(ctx, `LAP ${lap}/${race.laps}`, 6, 5, 10, "#ffff00", "left");
  label(ctx, formatTime(racer.finished ?? Math.max(0, race.time)), VIEW_WIDTH - 6, 5, 10, "#ffffff", "right");
  if (racer.lap > 0 && racer.finished === null) {
    label(ctx, `Lap ${formatTime(currentLapTime(race, racer))}`, VIEW_WIDTH - 6, 17, 8, "#c0c0c0", "right");
  }

  const middle = VIEW_HEIGHT / 2 - 30;
  const countdown = countdownText(race);
  if (racer.finished !== null) {
    label(ctx, "FINISHED!", VIEW_WIDTH / 2, middle, 22, "#ffff00", "center");
    const best = bestLap(racer);
    label(ctx, `Time ${formatTime(racer.finished)}${best ? `   Best lap ${formatTime(best)}` : ""}`, VIEW_WIDTH / 2, middle + 28, 9, "#ffffff", "center");
    label(ctx, "Press F2 to race again", VIEW_WIDTH / 2, middle + 42, 8, "#c0c0c0", "center");
  } else if (countdown) {
    label(ctx, countdown, VIEW_WIDTH / 2, middle, 32, countdown === "GO!" ? "#00ff00" : "#ffff00", "center");
  } else if (isWrongWay(racer)) {
    label(ctx, "WRONG WAY", VIEW_WIDTH / 2, middle, 18, "#ff4040", "center");
  } else {
    const note = noteText(race, racer);
    if (note) label(ctx, note, VIEW_WIDTH / 2, middle, 14, "#ffffff", "center");
  }
  if (paused) label(ctx, "PAUSED", VIEW_WIDTH / 2, middle + 60, 14, "#ffffff", "center");
}
