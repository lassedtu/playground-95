import type { ReactElement } from "react";

export type ToolId =
  | "pencil"
  | "brush"
  | "eraser"
  | "fill"
  | "airbrush"
  | "picker"
  | "line"
  | "rectangle"
  | "ellipse";

export type Tool = {
  id: ToolId;
  name: string;
  /** Status bar hint, in the style of the original. */
  hint: string;
  /** Selectable sizes in px (brush width, eraser size, spray radius, line width). */
  sizes?: readonly number[];
  glyph: ReactElement;
};

const svg = (children: ReactElement) => (
  <svg viewBox="0 0 16 16" width={16} height={16} shapeRendering="crispEdges" aria-hidden>
    {children}
  </svg>
);

/** In the order of the toolbox (two columns). */
export const TOOLS: readonly Tool[] = [
  {
    id: "pencil",
    name: "Pencil",
    hint: "Draws a free-form line one pixel wide.",
    glyph: svg(
      <>
        <path fill="#ffff00" d="M9 3h2v1h1v1h1v2h-1v1h-1v1h-1v1H9v1H8v1H7v1H6v-1H5v-1H4v-1H3v-1h1V9h1V8h1V7h1V6h1V5h1z" />
        <path fill="#000" d="M10 2h1v1h1v1h1v1h1v2h-1V6h-1V5h-1V4h-1V3h-1zM3 12h1v1h1v1H2v-1h1zM2 11h1v1H2z" />
      </>,
    ),
  },
  {
    id: "brush",
    name: "Brush",
    hint: "Draws using a brush with the selected size.",
    sizes: [2, 4, 7],
    glyph: svg(
      <>
        <path fill="#808080" d="M10 1h2v1h1v1h1v2h-1v1h-1v1h-1v1h-1V7H9V6H8V5h1V4h1z" />
        <path fill="#000" d="M7 6h1v1h1v1h1v1H9v1H8v1H7v1H5v1H2v-1h1v-2h1V9h1V8h1V7h1z" />
      </>,
    ),
  },
  {
    id: "eraser",
    name: "Eraser",
    hint: "Erases a portion of the picture, using the background colour.",
    sizes: [4, 8, 12],
    glyph: svg(
      <>
        <path fill="#ffff80" d="M3 7h8v6H3z" />
        <path fill="#000" d="M3 6h9v1H3zM2 7h1v7H2zM3 13h9v1H3zM11 7h1v6h-1zM12 5h1v1h-1zM13 4h1v8h-1zM12 12h1v1h-1z" />
      </>,
    ),
  },
  {
    id: "fill",
    name: "Fill With Color",
    hint: "Fills an area with the current drawing colour.",
    glyph: svg(
      <>
        <path fill="#c0c0c0" d="M5 5h1v1h1v1h1v1h1v1h1v1h-1v1H8v1H7v1H6v-1H5v-1H4v-1H3V9H2V8h1V7h1V6h1z" />
        <path fill="#000" d="M5 2h1v3H5zM5 4h1v1h1v1h1v1h1v1h1v1h1v1h-1v1H9v1H8v1H7v1H6v-1H5v-1H4v-1H3v-1H2V9H1V8h1V7h1V6h1V5h1zm0 2H4v1H3v1h1v1h1v1h1v1h1v1h1v-1h1v-1h1V9H9V8H8V7H7V6H6z" />
        <path fill="#0000ff" d="M11 9h1v1h1v3h-1v1h-1v-1h-1v-3h1z" />
      </>,
    ),
  },
  {
    id: "airbrush",
    name: "Airbrush",
    hint: "Draws using an airbrush of the selected size.",
    sizes: [5, 9, 14],
    glyph: svg(
      <>
        <path fill="#000" d="M7 7h4v1h1v6H6V8h1zM8 5h2v2H8zM2 2h1v1H2zM4 1h1v1H4zM1 4h1v1H1zM4 3h1v1H4zM6 2h1v1H6zM3 5h1v1H3z" />
        <path fill="#808080" d="M7 8h4v5H7z" />
      </>,
    ),
  },
  {
    id: "picker",
    name: "Pick Color",
    hint: "Picks up a colour from the picture for drawing.",
    glyph: svg(
      <>
        <path fill="#000" d="M11 1h3v1h1v3h-1v1h-1v1h-1v1h-1V7H9V6H8V5h1V4h1V3h1z" />
        <path fill="#fff" d="M8 6h1v1h1v1H9v1H8v1H7v1H6v1H5v1H4v1H3v-1H2v-1h1v-1h1v-1h1V9h1V8h1V7h1z" />
        <path fill="#000" d="M2 13h1v1h1v1H1v-1h1z" />
      </>,
    ),
  },
  {
    id: "line",
    name: "Line",
    hint: "Draws a straight line with the selected width. Hold Shift for 45° steps.",
    sizes: [1, 2, 3, 4, 5],
    glyph: svg(<path fill="#000" d="M13 2h1v1h-1v1h-1v1h-1v1h-1v1H9v1H8v1H7v1H6v1H5v1H4v1H3v1H2v-1h1v-1h1v-1h1v-1h1V9h1V8h1V7h1V6h1V5h1V4h1V3h1z" />),
  },
  {
    id: "rectangle",
    name: "Rectangle",
    hint: "Draws a rectangle. Hold Shift for a square.",
    sizes: [1, 2, 3, 4, 5],
    glyph: svg(<path fill="#000" d="M2 3h12v10H2zm1 1v8h10V4z" />),
  },
  {
    id: "ellipse",
    name: "Ellipse",
    hint: "Draws an ellipse. Hold Shift for a circle.",
    sizes: [1, 2, 3, 4, 5],
    glyph: svg(<path fill="#000" d="M5 3h6v1h2v1h1v2h1v2h-1v2h-1v1h-2v1H5v-1H3v-1H2V9H1V7h1V5h1V4h2zm0 1v1H4v1H3v4h1v1h1v1h6v-1h1v-1h1V6h-1V5h-1V4z" />),
  },
];
