"use client";

import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { Frame } from "@react95/core";

export type MenuEntry =
  | {
    label: string;
    onSelect: () => void;
    /** Keyboard shortcut shown on the right, e.g. "F2". Display only. */
    shortcut?: string;
    /** Shown with a check mark (e.g. the current difficulty). */
    checked?: boolean;
    disabled?: boolean;
  }
  | "divider";

export type Menu = { label: string; entries: MenuEntry[] };

type MenuBarProps = { menus: Menu[] };

/**
 * Win95-style menu bar (Game, Help, ...). Click a title to open its menu; click
 * an entry, press Escape, or click elsewhere to close it.
 *
 * Keyboard: Enter/Space/↓ on a title opens it, ↑/↓ move between entries,
 * <-/-> switch menus, Escape closes.
 */
export function MenuBar({ menus }: MenuBarProps) {
  const [open, setOpen] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const titleRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();

  // Close when clicking anywhere outside the menu bar.
  useEffect(() => {
    if (open === null) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!barRef.current?.contains(event.target as Node)) setOpen(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Focus the first enabled entry when a menu opens via keyboard or click.
  useEffect(() => {
    if (open === null) return;
    barRef.current
      ?.querySelector<HTMLButtonElement>(`#${CSS.escape(`${baseId}-menu-${open}`)} button:not(:disabled)`)
      ?.focus();
  }, [open, baseId]);

  function close(focusTitle: boolean) {
    const index = open;
    setOpen(null);
    if (focusTitle && index !== null) titleRefs.current[index]?.focus();
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLUListElement>, index: number) {
    const items = [
      ...event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
    ];
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        items[(current + 1) % items.length]?.focus();
        break;
      case "ArrowUp":
        event.preventDefault();
        items[(current - 1 + items.length) % items.length]?.focus();
        break;
      case "ArrowLeft":
      case "ArrowRight": {
        event.preventDefault();
        const step = event.key === "ArrowRight" ? 1 : -1;
        setOpen((index + step + menus.length) % menus.length);
        break;
      }
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        close(true);
        break;
      case "Tab":
        setOpen(null);
        break;
    }
  }

  return (
    // z-50: dropdowns must stay above the program's content (e.g. stacked cells).
    <div ref={barRef} role="menubar" className="relative z-50 flex shrink-0 select-none">
      {menus.map((menu, index) => {
        const isOpen = open === index;
        const menuId = `${baseId}-menu-${index}`;
        return (
          <div key={menu.label} className="relative">
            <button
              ref={(el) => {
                titleRefs.current[index] = el;
              }}
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={isOpen}
              aria-controls={isOpen ? menuId : undefined}
              onClick={() => setOpen(isOpen ? null : index)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setOpen(index);
                }
              }}
              className={`cursor-default border-0 px-2 py-0.5 outline-none focus-visible:outline-1 focus-visible:outline-dotted focus-visible:outline-current ${isOpen ? "bg-win-navy text-white" : "bg-transparent"
                }`}
            >
              {menu.label}
            </button>
            {isOpen && (
              <Frame
                as="ul"
                id={menuId}
                role="menu"
                aria-label={menu.label}
                boxShadow="$out"
                bgColor="$material"
                className="absolute top-full left-0 z-10 m-0 flex min-w-40 list-none flex-col p-0.5"
                onKeyDown={(event: KeyboardEvent<HTMLUListElement>) => onMenuKeyDown(event, index)}
              >
                {menu.entries.map((entry, i) =>
                  entry === "divider" ? (
                    <li
                      key={`divider-${i}`}
                      role="separator"
                      className="mx-0.5 my-1 h-0.5 border-t border-b border-t-[#808080] border-b-white"
                    />
                  ) : (
                    <li key={entry.label} role="none">
                      <button
                        type="button"
                        role={entry.checked === undefined ? "menuitem" : "menuitemradio"}
                        aria-checked={entry.checked}
                        disabled={entry.disabled}
                        onClick={() => {
                          close(true);
                          entry.onSelect();
                        }}
                        className="relative flex w-full cursor-default items-center gap-6 border-0 bg-transparent py-0.5 pr-3 pl-6 text-left outline-none hover:bg-win-navy hover:text-white focus:bg-win-navy focus:text-white disabled:text-[#808080] disabled:hover:bg-transparent"
                      >
                        {entry.checked && (
                          <span aria-hidden className="absolute left-2">
                            ✓
                          </span>
                        )}
                        <span className="flex-1">{entry.label}</span>
                        {entry.shortcut && <span aria-hidden>{entry.shortcut}</span>}
                      </button>
                    </li>
                  ),
                )}
              </Frame>
            )}
          </div>
        );
      })}
    </div>
  );
}
