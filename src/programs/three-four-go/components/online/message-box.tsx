"use client";

import { useEffect, useRef } from "react";
import { Button } from "@react95/core";
import { Warning } from "@react95/icons";

/** A Win95 message box: warning icon, the message, OK. */
export function MessageBox({ text, onClose }: { text: string; onClose: () => void }) {
  const okRef = useRef<HTMLButtonElement>(null);
  useEffect(() => okRef.current?.focus(), []);
  return (
    <>
      <div className="flex items-start gap-3">
        <Warning variant="32x32_4" aria-hidden className="shrink-0" />
        <p className="m-0 self-center" role="alert">
          {text}
        </p>
      </div>
      <div className="flex justify-center">
        <Button ref={okRef} className="min-w-20" onClick={onClose}>
          OK
        </Button>
      </div>
    </>
  );
}
