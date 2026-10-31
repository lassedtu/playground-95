/** Whether the user is on a Mac/iPhone/iPad, where shortcuts use ⌘ instead of Ctrl. */
export function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    navigator.platform ??
    navigator.userAgent;
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/** The platform's shortcut modifier: ⌘ on Apple devices, Ctrl elsewhere. */
export function hasShortcutModifier(event: { metaKey: boolean; ctrlKey: boolean }, apple = isApplePlatform()): boolean {
  return apple ? event.metaKey : event.ctrlKey;
}
