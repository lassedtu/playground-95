/** Keys the game uses, others are left alone (so browser shortcuts still work). */
const GAME_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "Space",
  "ShiftLeft",
  "ShiftRight",
  "KeyP",
]);

export type Keyboard = { isDown(code: string): boolean; dispose(): void };

/**
 * Which keys are held, by physical key (`event.code`, so WASD works on any
 * layout). Only while `target` has focus; everything is released when it
 * loses focus so no key gets stuck.
 */
export function createKeyboard(target: HTMLElement): Keyboard {
  const down = new Set<string>();
  const onKeyDown = (event: KeyboardEvent) => {
    if (!GAME_KEYS.has(event.code) || event.metaKey || event.ctrlKey || event.altKey) return;
    event.preventDefault();
    down.add(event.code);
  };
  const onKeyUp = (event: KeyboardEvent) => down.delete(event.code);
  const onBlur = () => down.clear();
  target.addEventListener("keydown", onKeyDown);
  target.addEventListener("keyup", onKeyUp);
  target.addEventListener("blur", onBlur);
  return {
    isDown: (code) => down.has(code),
    dispose() {
      target.removeEventListener("keydown", onKeyDown);
      target.removeEventListener("keyup", onKeyUp);
      target.removeEventListener("blur", onBlur);
    },
  };
}
