"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Input } from "@react95/core";

import { cleanName, NAME_MAX } from "../lib/profile";

type NameDialogProps = {
  initial: string;
  onSave: (name: string) => void;
  onCancel: () => void;
};

/** Change the name the results (and other drivers) show for you. */
export function NameDialog({ initial, onSave, onCancel }: NameDialogProps) {
  const [name, setName] = useState(initial);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const cleaned = cleanName(name);
        if (cleaned) onSave(cleaned);
        else setError(true);
      }}
    >
      <label htmlFor="three-four-go-name">Your name:</label>
      <Input
        ref={inputRef}
        id="three-four-go-name"
        value={name}
        maxLength={NAME_MAX}
        autoComplete="nickname"
        spellCheck={false}
        aria-invalid={error}
        aria-describedby={error ? "three-four-go-name-error" : undefined}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          setName(event.target.value);
          setError(false);
        }}
        className="w-full"
      />
      {error ? (
        <p id="three-four-go-name-error" className="m-0 text-[#800000]">
          Your name can&apos;t be empty.
        </p>
      ) : (
        <p className="m-0 text-xs">Up to {NAME_MAX} characters. Shown in the results.</p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="submit" className="min-w-20 font-bold">
          OK
        </Button>
        <Button type="button" className="min-w-20" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
