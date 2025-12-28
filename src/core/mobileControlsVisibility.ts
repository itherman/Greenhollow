/**
 * Best-effort heuristic for when to show on-screen controls.
 * - Require touch capability (avoid showing on desktop by default)
 * - Show on phone/tablet-ish viewports (min dimension <= ~900)
 */
export function shouldShowMobileControls(params: {
  screenW: number;
  screenH: number;
  hasTouch: boolean;
}): boolean {
  const { screenW, screenH, hasTouch } = params;
  if (!hasTouch) return false;
  const W = Math.max(0, Math.floor(screenW || 0));
  const H = Math.max(0, Math.floor(screenH || 0));
  const minDim = Math.min(W, H);
  // Landscape phones/tablets: heights are typically <= 900.
  return minDim > 0 && minDim <= 900;
}


