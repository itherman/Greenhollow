export type IntroOverlayLayout = {
  canvasCssWidthPx: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Computes a safe display width for the intro artwork canvas so it fits the
 * viewport *and* leaves room for the Start button on short viewports (mobile
 * landscape, browser UI bars, etc).
 *
 * The intro artwork has a fixed aspect ratio of 16:9.
 */
export function computeIntroOverlayLayout(viewportWidthPx: number, viewportHeightPx: number): IntroOverlayLayout {
  const vw = Math.max(0, viewportWidthPx);
  const vh = Math.max(0, viewportHeightPx);

  // Reserve space for button + padding + gaps so the Start button doesn't get
  // pushed offscreen on short viewports.
  const reservedVerticalPx = 170;
  const maxCanvasHeightPx = Math.max(1, vh - reservedVerticalPx);

  const aspect = 16 / 9;
  const maxWidthFromHeight = maxCanvasHeightPx * aspect;
  const maxWidthFromViewport = vw * 0.94;

  // Cap to a sane desktop size but never force a minimum that could overflow.
  const maxWidth = Math.min(maxWidthFromHeight, maxWidthFromViewport, 1200);
  const width = Math.floor(clamp(maxWidth, 1, vw || 1));

  return { canvasCssWidthPx: width };
}


