"use client";

import { Button } from "@react95/core";
import { User } from "@react95/icons";

/** "Playing as: Player 4821 [Change…]": your name, always in sight online. */
export function PlayingAs({ name, onChange, disabled = false }: { name: string; onChange: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <User variant="32x32_4" aria-hidden className="shrink-0" />
      <p className="m-0 min-w-0 flex-1 truncate">
        Playing as: <span className="font-bold">{name}</span>
      </p>
      <Button type="button" className="min-w-20" disabled={disabled} onClick={onChange}>
        Change…
      </Button>
    </div>
  );
}
