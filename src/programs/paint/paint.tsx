"use client";

import { type PointerEvent, useEffect, useEffectEvent, useRef, useState } from "react";

import { useDesktop } from "@/components/desktop/desktop-context";
import { type Menu, MenuBar } from "@/components/ui/menu-bar";
import { StatusBar, StatusBarField } from "@/components/ui/status-bar";
import { downloadUrl } from "@/lib/download";
import { hasShortcutModifier, isApplePlatform } from "@/lib/platform";
import { useElementSize } from "@/lib/use-element-size";

import { PALETTE } from "./data/palette";
import { type ToolId, TOOLS } from "./data/tools";
import { onPictureSent, takePendingPicture } from "./lib/paint-inbox";
import { constrain, ellipse, floodFill, line, type Point, rectangle, spray } from "./lib/raster";

/** Must match the id in programs/registry.tsx (used by File → Exit). */
const PROGRAM_ID = "paint";
const DEFAULT_SIZE = { width: 480, height: 300 };
/** Opened pictures larger than this are scaled down (keeps memory and fills fast). */
const MAX_SIZE = 2048;
/** Undo keeps full snapshots; cap their total memory rather than their count. */
const UNDO_BUDGET_BYTES = 200 * 1024 * 1024;
const SPRAY_INTERVAL_MS = 30;

// Paint only renders in the browser (the desktop is client-only), so this is safe at load.
const APPLE = isApplePlatform();
const SHORTCUTS = APPLE ? { undo: "⌘Z", redo: "⇧⌘Z" } : { undo: "Ctrl+Z", redo: "Ctrl+Y" };

/** "fit" shrinks big pictures to the window (never enlarges); numbers are fixed zooms. */
type Zoom = "fit" | 1 | 2 | 4;
const ZOOMS: { zoom: Zoom; label: string }[] = [
  { zoom: "fit", label: "Fit to Window" },
  { zoom: 1, label: "Actual Size (100%)" },
  { zoom: 2, label: "Zoom 200%" },
  { zoom: 4, label: "Zoom 400%" },
];

type Stroke = {
  tool: ToolId;
  color: string;
  /** Tool size in picture pixels (the chosen screen size divided by the zoom). */
  size: number;
  /** One screen pixel, in picture pixels: pencil width and airbrush dot size. */
  pixel: number;
  start: Point;
  last: Point;
  sprayTimer?: ReturnType<typeof setInterval>;
};

/** Paints a square (or round) dab of `size` px centred on a pixel. */
function stamp(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, round: boolean) {
  if (size <= 1) return ctx.fillRect(x, y, 1, 1);
  const offset = Math.floor((size - 1) / 2);
  if (!round) return ctx.fillRect(x - offset, y - offset, size, size);
  const r = size / 2;
  for (let row = 0; row < size; row++) {
    const dy = row - r + 0.5;
    const half = Math.sqrt(Math.max(0, r * r - dy * dy));
    const left = Math.round(x - half + 0.5);
    const width = Math.round(x + half + 0.5) - left;
    if (width > 0) ctx.fillRect(left, y - offset + row, width, 1);
  }
}

const get2d = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D is not available.");
  ctx.imageSmoothingEnabled = false;
  return ctx;
};

export function Paint() {
  const { closeWindow } = useDesktop();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [size, setSize] = useState(DEFAULT_SIZE);
  const [tool, setTool] = useState<ToolId>("pencil");
  const [previousTool, setPreviousTool] = useState<ToolId>("pencil");
  const [toolSizes, setToolSizes] = useState<Partial<Record<ToolId, number>>>({});
  const [foreground, setForeground] = useState("#000000");
  const [background, setBackground] = useState("#ffffff");
  const [cursor, setCursor] = useState<Point | null>(null);
  const [history, setHistory] = useState({ undo: 0, redo: 0 });
  const [zoom, setZoom] = useState<Zoom>("fit");
  const [workspaceRef, workspace] = useElementSize<HTMLDivElement>();

  const stroke = useRef<Stroke | null>(null);
  const undoStack = useRef<ImageData[]>([]);
  const redoStack = useRef<ImageData[]>([]);

  const currentTool = TOOLS.find((t) => t.id === tool)!;
  const toolSize = toolSizes[tool] ?? currentTool.sizes?.[0] ?? 1;

  // Screen px per picture px. The 2 px leaves room for the picture's shadow.
  const scale =
    zoom !== "fit"
      ? zoom
      : workspace.width > 0 && workspace.height > 0
        ? Math.min(1, (workspace.width - 2) / size.width, (workspace.height - 2) / size.height)
        : 1;
  const display = { width: Math.round(size.width * scale), height: Math.round(size.height * scale) };
  // Pixelated when enlarged; smooth when shrunk (pixelated downscaling looks broken).
  const rendering = scale >= 1 ? "[image-rendering:pixelated]" : "";

  // Start with a white picture.
  useEffect(() => {
    const ctx = get2d(canvasRef.current!);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, DEFAULT_SIZE.width, DEFAULT_SIZE.height);
  }, []);

  useEffect(() => () => clearInterval(stroke.current?.sprayTimer), []);

  // --- History ---------------------------------------------------------------

  const snapshot = () => {
    const canvas = canvasRef.current!;
    return get2d(canvas).getImageData(0, 0, canvas.width, canvas.height);
  };

  /** Call before changing the picture. */
  function checkpoint() {
    const stack = [...undoStack.current, snapshot()];
    // Drop the oldest snapshots once they use too much memory (big photos are ~10 MB each).
    let bytes = stack.reduce((sum, image) => sum + image.data.byteLength, 0);
    while (stack.length > 1 && bytes > UNDO_BUDGET_BYTES) bytes -= stack.shift()!.data.byteLength;
    undoStack.current = stack;
    redoStack.current = [];
    setHistory({ undo: stack.length, redo: 0 });
  }

  /** Puts a snapshot back, resizing the canvas if it had another size. */
  function restore(image: ImageData) {
    const canvas = canvasRef.current!;
    if (canvas.width !== image.width || canvas.height !== image.height) {
      canvas.width = image.width;
      canvas.height = image.height;
      overlayRef.current!.width = image.width;
      overlayRef.current!.height = image.height;
      setSize({ width: image.width, height: image.height });
    }
    get2d(canvas).putImageData(image, 0, 0);
  }

  function undo() {
    const image = undoStack.current.pop();
    if (!image) return;
    redoStack.current.push(snapshot());
    restore(image);
    setHistory({ undo: undoStack.current.length, redo: redoStack.current.length });
  }

  function redo() {
    const image = redoStack.current.pop();
    if (!image) return;
    undoStack.current.push(snapshot());
    restore(image);
    setHistory({ undo: undoStack.current.length, redo: redoStack.current.length });
  }

  // --- File ------------------------------------------------------------------

  /** Replaces the picture with a blank one (or an image) of the given size. */
  function replacePicture(width: number, height: number, image?: CanvasImageSource) {
    checkpoint();
    const canvas = canvasRef.current!;
    canvas.width = overlayRef.current!.width = width;
    canvas.height = overlayRef.current!.height = height;
    setSize({ width, height });
    const ctx = get2d(canvas);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    if (image) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, 0, 0, width, height);
      ctx.imageSmoothingEnabled = false;
    }
  }

  async function openPicture(picture: Blob) {
    const url = URL.createObjectURL(picture);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const shrink = Math.min(1, MAX_SIZE / Math.max(image.naturalWidth, image.naturalHeight));
      replacePicture(
        Math.max(1, Math.round(image.naturalWidth * shrink)),
        Math.max(1, Math.round(image.naturalHeight * shrink)),
        image,
      );
      setZoom("fit");
    } catch (error) {
      console.error("Couldn't open picture:", error);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // Pictures from other programs ("Edit in Paint"): sent before opening, or while open.
  const receivePicture = useEffectEvent((picture: Blob) => void openPicture(picture));
  useEffect(() => {
    const pending = takePendingPicture();
    // Async anyway (the image decodes first); deferred so the effect itself doesn't set state.
    if (pending) void Promise.resolve(pending).then(receivePicture);
    return onPictureSent(receivePicture);
  }, []);

  function save() {
    canvasRef.current!.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      downloadUrl(url, "untitled.png");
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }, "image/png");
  }

  function clearImage() {
    checkpoint();
    const canvas = canvasRef.current!;
    const ctx = get2d(canvas);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // --- Drawing ---------------------------------------------------------------

  function toCanvas(event: PointerEvent<HTMLCanvasElement>): Point {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.floor(((event.clientX - rect.left) * canvas.width) / rect.width),
      y: Math.floor(((event.clientY - rect.top) * canvas.height) / rect.height),
    };
  }

  /** Draws a freehand segment from a to b with the stroke's tool. */
  function drawSegment(ctx: CanvasRenderingContext2D, s: Stroke, a: Point, b: Point) {
    ctx.fillStyle = s.color;
    const round = s.tool === "brush";
    const width = s.tool === "pencil" ? s.pixel : s.size;
    line(a, b, (x, y) => stamp(ctx, x, y, width, round));
  }

  /** Draws a line/rectangle/ellipse preview (overlay) or the final shape. */
  function drawShape(ctx: CanvasRenderingContext2D, s: Stroke, end: Point, shift: boolean) {
    const target = shift ? constrain(s.start, end, s.tool === "line" ? "line" : "box") : end;
    ctx.fillStyle = s.color;
    const plot = (x: number, y: number) => stamp(ctx, x, y, s.size, false);
    if (s.tool === "line") line(s.start, target, plot);
    else if (s.tool === "rectangle") rectangle(s.start, target, plot);
    else ellipse(s.start, target, plot);
  }

  function sprayAt(point: Point, s: Stroke) {
    const ctx = get2d(canvasRef.current!);
    ctx.fillStyle = s.color;
    spray(point, s.size, (x, y) => ctx.fillRect(x, y, s.pixel, s.pixel));
  }

  function onPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0 && event.button !== 2) return;
    event.preventDefault();
    const point = toCanvas(event);
    const primary = event.button === 0;
    const ctx = get2d(canvasRef.current!);

    if (tool === "picker") {
      const [r, g, b] = ctx.getImageData(point.x, point.y, 1, 1).data;
      const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
      (primary ? setForeground : setBackground)(hex);
      setTool(previousTool); // like Paint: back to the tool you came from
      return;
    }

    checkpoint();
    const color = tool === "eraser" ? background : primary ? foreground : background;

    if (tool === "fill") {
      floodFill(ctx, point, color);
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    // Sizes are chosen in screen pixels, so tools look the same at any zoom.
    const s: Stroke = {
      tool,
      color,
      size: Math.max(1, Math.round(toolSize / scale)),
      pixel: Math.max(1, Math.round(1 / scale)),
      start: point,
      last: point,
    };
    stroke.current = s;

    if (tool === "airbrush") {
      sprayAt(point, s);
      s.sprayTimer = setInterval(() => sprayAt(s.last, s), SPRAY_INTERVAL_MS);
    } else if (tool === "pencil" || tool === "brush" || tool === "eraser") {
      drawSegment(ctx, s, point, point);
    }
  }

  function onPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const point = toCanvas(event);
    setCursor(point);
    const s = stroke.current;
    if (!s) return;

    if (s.tool === "line" || s.tool === "rectangle" || s.tool === "ellipse") {
      const overlay = overlayRef.current!;
      const ctx = get2d(overlay);
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      drawShape(ctx, s, point, event.shiftKey);
    } else if (s.tool === "airbrush") {
      sprayAt(point, s);
    } else {
      drawSegment(get2d(canvasRef.current!), s, s.last, point);
    }
    s.last = point;
  }

  function endStroke(event: PointerEvent<HTMLCanvasElement>, commit: boolean) {
    const s = stroke.current;
    if (!s) return;
    stroke.current = null;
    clearInterval(s.sprayTimer);
    const overlay = overlayRef.current!;
    get2d(overlay).clearRect(0, 0, overlay.width, overlay.height);
    if (commit && (s.tool === "line" || s.tool === "rectangle" || s.tool === "ellipse")) {
      drawShape(get2d(canvasRef.current!), s, toCanvas(event), event.shiftKey);
    }
  }

  function selectTool(id: ToolId) {
    if (id === "picker" && tool !== "picker") setPreviousTool(tool);
    setTool(id);
  }

  // --- UI --------------------------------------------------------------------

  const menus: Menu[] = [
    {
      label: "File",
      entries: [
        { label: "New", onSelect: () => replacePicture(DEFAULT_SIZE.width, DEFAULT_SIZE.height) },
        { label: "Open…", onSelect: () => fileRef.current?.click() },
        { label: "Save", onSelect: save },
        "divider",
        { label: "Exit", onSelect: () => closeWindow(PROGRAM_ID) },
      ],
    },
    {
      label: "Edit",
      entries: [
        { label: "Undo", shortcut: SHORTCUTS.undo, disabled: history.undo === 0, onSelect: undo },
        { label: "Redo", shortcut: SHORTCUTS.redo, disabled: history.redo === 0, onSelect: redo },
        "divider",
        { label: "Clear Image", onSelect: clearImage },
      ],
    },
    {
      label: "View",
      entries: ZOOMS.map(({ zoom: z, label }) => ({ label, checked: zoom === z, onSelect: () => setZoom(z) })),
    },
  ];

  return (
    <div
      className="flex size-full flex-col"
      onKeyDown={(event) => {
        if (!hasShortcutModifier(event, APPLE)) return;
        const key = event.key.toLowerCase();
        if (key === "z" && !event.shiftKey) undo();
        // Redo: ⇧⌘Z on Apple devices; Ctrl+Y (or Ctrl+Shift+Z) elsewhere.
        else if ((key === "z" && event.shiftKey) || (key === "y" && !APPLE)) redo();
        else if (key === "s") save();
        else if (key === "o") fileRef.current?.click();
        else return;
        event.preventDefault();
      }}
    >
      <MenuBar menus={menus} />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void openPicture(file);
          event.target.value = "";
        }}
      />

      <div className="mt-0.5 flex min-h-0 flex-1 gap-1">
        {/* Toolbox */}
        <div className="flex shrink-0 flex-col gap-1" role="toolbar" aria-label="Tools" aria-orientation="vertical">
          <div className="grid grid-cols-2 gap-px">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-label={t.name}
                aria-pressed={tool === t.id}
                title={t.name}
                onClick={() => selectTool(t.id)}
                className="flex size-[25px] items-center justify-center bg-[#c0c0c0] p-0 shadow-[inset_-1px_-1px_#000,inset_1px_1px_#fff,inset_-2px_-2px_#808080] outline-none focus-visible:outline-1 focus-visible:-outline-offset-4 focus-visible:outline-dotted focus-visible:outline-black aria-pressed:bg-[repeating-conic-gradient(#fff_0_25%,#c0c0c0_0_50%)] aria-pressed:bg-size-[2px_2px] aria-pressed:shadow-[inset_1px_1px_#000,inset_-1px_-1px_#fff,inset_2px_2px_#808080]"
              >
                {t.glyph}
              </button>
            ))}
          </div>
          {/* Size options for the current tool */}
          <div
            role="radiogroup"
            aria-label={`${currentTool.name} size`}
            className="flex min-h-14 flex-col items-stretch gap-0.5 border border-t-[#808080] border-r-white border-b-white border-l-[#808080] p-1"
          >
            {currentTool.sizes?.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={s === toolSize}
                aria-label={`${s} pixels`}
                onClick={() => setToolSizes((sizes) => ({ ...sizes, [tool]: s }))}
                className="group flex h-3 min-h-3 items-center justify-center border-0 bg-transparent p-0 outline-none aria-checked:bg-win-navy focus-visible:outline-1 focus-visible:outline-dotted focus-visible:outline-black"
                style={{ minHeight: Math.max(10, Math.min(s, 14) + 2) }}
              >
                <span
                  className="bg-black group-aria-checked:bg-white"
                  style={
                    tool === "line" || tool === "rectangle" || tool === "ellipse"
                      ? { width: 32, height: s }
                      : { width: Math.min(s, 14), height: Math.min(s, 14), borderRadius: tool === "eraser" ? 0 : "50%" }
                  }
                />
              </button>
            ))}
          </div>
        </div>

        {/* Canvas area: grey workspace, picture in the top-left corner (scrolls when zoomed in). */}
        <div
          ref={workspaceRef}
          className="min-h-0 min-w-0 flex-1 overflow-auto border-2 border-t-[#808080] border-r-white border-b-white border-l-[#808080] bg-[#808080] p-1"
        >
          <div className="relative w-fit shadow-[2px_2px_#000]">
            <canvas
              ref={canvasRef}
              width={DEFAULT_SIZE.width}
              height={DEFAULT_SIZE.height}
              aria-label={`Picture, ${size.width} by ${size.height} pixels`}
              role="img"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={(event) => endStroke(event, true)}
              onPointerCancel={(event) => endStroke(event, false)}
              onPointerLeave={() => setCursor(null)}
              onContextMenu={(event) => event.preventDefault()}
              className={`block touch-none ${rendering} ${tool === "picker" || tool === "fill" ? "cursor-pointer" : "cursor-crosshair"}`}
              style={display}
            />
            <canvas
              ref={overlayRef}
              width={DEFAULT_SIZE.width}
              height={DEFAULT_SIZE.height}
              aria-hidden
              className={`pointer-events-none absolute inset-0 ${rendering}`}
              style={display}
            />
          </div>
        </div>
      </div>

      {/* Colour box and palette */}
      <div className="mt-1 flex shrink-0 items-center gap-1">
        <div
          aria-label={`Drawing colour ${foreground}, background colour ${background}`}
          role="img"
          className="relative size-[34px] shrink-0 border border-t-[#808080] border-r-white border-b-white border-l-[#808080] bg-[repeating-conic-gradient(#fff_0_25%,#c0c0c0_0_50%)] bg-size-[2px_2px]"
        >
          <span className="absolute right-1 bottom-1 size-4 border border-[#808080] shadow-[1px_1px_#fff]" style={{ background }} />
          <span className="absolute top-1 left-1 size-4 border border-[#808080] shadow-[1px_1px_#fff]" style={{ background: foreground }} />
        </div>
        <div
          role="group"
          aria-label="Colours: click for drawing colour, right-click for background"
          className="grid grid-cols-[repeat(14,16px)] gap-px"
        >
          {PALETTE.map((c) => (
            <button
              key={c.hex}
              type="button"
              aria-label={c.name}
              title={c.name}
              onClick={() => setForeground(c.hex)}
              onContextMenu={(event) => {
                event.preventDefault();
                setBackground(c.hex);
              }}
              className="size-4 border border-t-[#808080] border-r-white border-b-white border-l-[#808080] p-0 outline-none focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-dotted focus-visible:outline-black"
              style={{ background: c.hex }}
            />
          ))}
        </div>
      </div>

      <StatusBar className="mt-1">
        <StatusBarField grow title={currentTool.hint}>
          {currentTool.hint}
        </StatusBarField>
        <StatusBarField width={80}>{cursor ? `${cursor.x},${cursor.y}` : ""}</StatusBarField>
        <StatusBarField width={90}>
          {size.width}×{size.height}
        </StatusBarField>
        <StatusBarField width={48}>{Math.round(scale * 100)}%</StatusBarField>
      </StatusBar>
    </div>
  );
}
