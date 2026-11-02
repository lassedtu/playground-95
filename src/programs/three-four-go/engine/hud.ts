import { CAR } from "../data/tuning";
import { VIEW_HEIGHT, VIEW_WIDTH } from "./camera";
import { bestLap, countdownText, currentLapTime, formatTime, isWrongWay, noteText, ordinal, type Race, type Racer } from "./race";
import { dot, fromAngle } from "./vector";

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

/** Lap, times and speed in the corners, position bottom left, countdown and messages in the middle. */
export function drawHud(ctx: CanvasRenderingContext2D, race: Race, racer: Racer, place: number, paused: boolean) {
  const lap = Math.min(Math.max(1, racer.lap), race.laps);
  label(ctx, `LAP ${lap}/${race.laps}`, 6, 5, 10, "#ffff00", "left");
  label(ctx, formatTime(racer.finished ?? Math.max(0, race.time)), VIEW_WIDTH - 6, 5, 10, "#ffffff", "right");
  if (racer.lap > 0 && racer.finished === null) {
    label(ctx, `Lap ${formatTime(currentLapTime(race, racer))}`, VIEW_WIDTH - 6, 17, 8, "#c0c0c0", "right");
  }

  // Position (bottom left), only when there's someone to race.
  if (race.racers.length > 1) {
    label(ctx, ordinal(place), 6, VIEW_HEIGHT - 26, 20, place === 1 ? "#ffff00" : "#ffffff", "left");
    label(ctx, `/${race.racers.length}`, 8 + ctx.measureText(ordinal(place)).width, VIEW_HEIGHT - 16, 9, "#c0c0c0", "left");
  }
  // Speed bar (bottom right): Win95 sunken box, filling green to red.
  const speed = Math.max(0, dot(racer.car.v, fromAngle(racer.car.heading)));
  const share = Math.min(1, speed / (CAR.maxSpeed * CAR.driftSpeed));
  const bar = { x: VIEW_WIDTH - 66, y: VIEW_HEIGHT - 12, w: 60, h: 6 };
  ctx.fillStyle = "#808080";
  ctx.fillRect(bar.x - 1, bar.y - 1, bar.w + 2, bar.h + 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(bar.x, bar.y + bar.h, bar.w + 1, 1);
  ctx.fillRect(bar.x + bar.w, bar.y, 1, bar.h + 1);
  ctx.fillStyle = "#000000";
  ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
  ctx.fillStyle = share > 0.85 ? "#ff4040" : share > 0.6 ? "#ffff00" : "#00c000";
  ctx.fillRect(bar.x, bar.y, Math.round(bar.w * share), bar.h);
  if (racer.car.drift) label(ctx, "DRIFT", bar.x + bar.w, bar.y - 11, 8, "#ffa040", "right");

  const middle = VIEW_HEIGHT / 2 - 30;
  const countdown = countdownText(race);
  if (racer.finished !== null) {
    label(ctx, place === 1 && race.racers.length > 1 ? "YOU WIN!" : "FINISHED!", VIEW_WIDTH / 2, middle, 22, "#ffff00", "center");
    const best = bestLap(racer);
    label(ctx, `${race.racers.length > 1 ? `${ordinal(place)} place   ` : ""}Time ${formatTime(racer.finished)}${best ? `   Best lap ${formatTime(best)}` : ""}`, VIEW_WIDTH / 2, middle + 28, 9, "#ffffff", "center");
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
