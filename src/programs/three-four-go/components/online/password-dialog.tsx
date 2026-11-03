"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Input } from "@react95/core";
import { Keys } from "@react95/icons";

import { PASSWORD_MAX } from "../../net/protocol";

type PasswordDialogProps = {
  code: string;
  /** The last try was wrong. */
  wrong: boolean;
  onJoin: (password: string) => void;
  onCancel: () => void;
};

/** Asks for a lobby's password. */
export function PasswordDialog({ code, wrong, onJoin, onCancel }: PasswordDialogProps) {
  const [password, setPassword] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (password) onJoin(password);
      }}
    >
      <div className="flex items-start gap-3">
        <Keys variant="32x32_4" aria-hidden className="shrink-0" />
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="three-four-go-password">
            Lobby <span className="font-bold">{code}</span> has a password:
          </label>
          <Input
            ref={inputRef}
            id="three-four-go-password"
            type="password"
            value={password}
            maxLength={PASSWORD_MAX}
            autoComplete="off"
            aria-invalid={wrong}
            aria-describedby={wrong ? "three-four-go-password-error" : undefined}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
            className="w-full"
          />
          {wrong && (
            <p id="three-four-go-password-error" className="m-0 text-xs text-[#800000]">
              Wrong password. Try again.
            </p>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" className="min-w-20 font-bold" disabled={!password}>
          Join
        </Button>
        <Button type="button" className="min-w-20" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
