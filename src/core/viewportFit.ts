export type ViewportFitOptions = {
  /**
   * Viewports at/above this size are considered "desktop" for the purposes of
   * applying the desktop cap.
   */
  desktopMinWidthPx: number;
  desktopMinHeightPx: number;
  /**
   * Multiply viewport dimensions by this factor on desktop to create the
   * surrounding "empty screen" border area.
   *
   * Example: 0.85 => game parent is 85% of the viewport.
   */
  desktopCapFactor: number;
};

export type ViewportFitResult = {
  parentWidthPx: number;
  parentHeightPx: number;
  capFactorApplied: number;
  isDesktopCapped: boolean;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function computeGameParentSize(
  viewportWidthPx: number,
  viewportHeightPx: number,
  opts: ViewportFitOptions,
): ViewportFitResult {
  const vw = Math.max(0, viewportWidthPx);
  const vh = Math.max(0, viewportHeightPx);

  const isDesktop =
    vw >= opts.desktopMinWidthPx && vh >= opts.desktopMinHeightPx;

  const cap = clamp(opts.desktopCapFactor, 0.1, 1.0);
  const factor = isDesktop ? cap : 1.0;

  // Use integers for stable layout and to avoid fractional canvas sizes.
  const w = Math.max(1, Math.floor(vw * factor));
  const h = Math.max(1, Math.floor(vh * factor));

  // Never exceed the viewport, even if opts are weird.
  const parentWidthPx = Math.min(w, vw || 1);
  const parentHeightPx = Math.min(h, vh || 1);

  return {
    parentWidthPx,
    parentHeightPx,
    capFactorApplied: factor,
    isDesktopCapped: isDesktop,
  };
}


