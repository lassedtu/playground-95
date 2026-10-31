/**
 * Hands pictures to Paint from other programs ("Edit in Paint"). If Paint is
 * open it receives the picture right away; otherwise it picks it up when it
 * opens. Kept tiny so importing it doesn't pull in Paint itself.
 */
type Listener = (picture: Blob) => void;

let pending: Blob | null = null;
const listeners = new Set<Listener>();

export function sendToPaint(picture: Blob) {
  if (listeners.size) listeners.forEach((listener) => listener(picture));
  else pending = picture;
}

/** For Paint: the picture sent before it opened, if any. */
export function takePendingPicture(): Blob | null {
  const picture = pending;
  pending = null;
  return picture;
}

/** For Paint: pictures sent while it's open. */
export function onPictureSent(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
