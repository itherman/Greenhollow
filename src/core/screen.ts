export type ScreenSize = { w: number; h: number };

/**
 * Normalize screen sizes that may temporarily report 0 during resize/focus.
 * Keep this pure + unit tested because a lot of UI layout depends on it.
 */
export function normalizeScreenSize(screenW: number, screenH: number, minW = 320, minH = 240): ScreenSize {
  const w = Math.max(minW, Math.floor(screenW || 0));
  const h = Math.max(minH, Math.floor(screenH || 0));
  return { w, h };
}


