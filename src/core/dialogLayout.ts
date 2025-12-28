export type DialogLayout = {
  x: number;
  y: number;
  w: number;
  h: number;
  padding: number;
};

/**
 * Compute a bottom-screen dialog panel layout in screen pixels.
 * Pure function so we can unit test and avoid layout regressions.
 */
export function computeDialogLayout(screenW: number, screenH: number): DialogLayout {
  // Defensive defaults: Phaser can briefly report 0 in some resize/focus scenarios.
  const W = Math.max(320, Math.floor(screenW || 0));
  const H = Math.max(240, Math.floor(screenH || 0));
  const padding = 14;
  const w = Math.max(260, Math.min(720, W - 40));
  const h = Math.max(120, Math.min(180, Math.floor(H * 0.28)));
  const x = W / 2;
  const y = H - h / 2 - 10;
  return { x, y, w, h, padding };
}


