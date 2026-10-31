import type { CSSProperties, ReactNode } from "react";
import { Frame } from "@react95/core";

type StatusBarProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Win95-style status bar: a row of sunken fields along the bottom of a
 * window. Place it last in a program's content.
 *
 * It's a polite live region, so screen readers announce text changes.
 *
 * @example
 * <StatusBar>
 *   <StatusBarField grow>Ready</StatusBarField>
 *   <StatusBarField width={60}>640×480</StatusBarField>
 * </StatusBar>
 */
export function StatusBar({ children, className = "" }: StatusBarProps) {
  return (
    <div role="status" className={`flex shrink-0 gap-0.5 pt-0.5 ${className}`}>
      {children}
    </div>
  );
}

type StatusBarFieldProps = {
  children?: ReactNode;
  /** Take up the remaining space. Typically the first (message) field. */
  grow?: boolean;
  /** Fixed width in pixels, for short fields. */
  width?: number;
  /** Shown as a tooltip, e.g. the full text of a truncated message. */
  title?: string;
};

export function StatusBarField({ children, grow, width, title }: StatusBarFieldProps) {
  const style: CSSProperties | undefined = width ? { width } : undefined;
  return (
    <Frame
      boxShadow="$in"
      title={title}
      style={style}
      className={`h-5 min-w-0 truncate px-1 leading-5 ${grow ? "flex-1" : "shrink-0"}`}
    >
      {children}
    </Frame>
  );
}
