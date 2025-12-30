export type ViewportInfo = {
  vw: number;
  vh: number;
  isPortrait: boolean;
  isLandscape: boolean;
  shortest: number;
  longest: number;
  /**
   * A “short” viewport is usually landscape mobile with browser UI bars.
   * This is a heuristic flag (not a hard guarantee).
   */
  isShort: boolean;
};

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function getViewportInfo(viewportWpx: number, viewportHpx: number): ViewportInfo {
  const vw = Math.max(0, viewportWpx || 0);
  const vh = Math.max(0, viewportHpx || 0);
  const isPortrait = vh >= vw;
  const isLandscape = vw > vh;
  const shortest = Math.min(vw, vh);
  const longest = Math.max(vw, vh);
  const isShort = shortest > 0 && shortest < 520;
  return { vw, vh, isPortrait, isLandscape, shortest, longest, isShort };
}

export type ScaleToFitParams = {
  viewportWpx: number;
  viewportHpx: number;
  contentWpx: number;
  contentHpx: number;
  paddingXpx?: number;
  paddingYpx?: number;
  minScale?: number;
  maxScale?: number;
};

/**
 * Computes a scale factor so `contentWpx`×`contentHpx` fits in the viewport
 * (minus padding), without scrolling. Pure + unit-tested for predictable behavior.
 */
export function computeScaleToFit(params: ScaleToFitParams): number {
  const {
    viewportWpx,
    viewportHpx,
    contentWpx,
    contentHpx,
    paddingXpx = 0,
    paddingYpx = 0,
    minScale = 0.5,
    maxScale = 1.0,
  } = params;

  const vw = Math.max(0, viewportWpx || 0);
  const vh = Math.max(0, viewportHpx || 0);
  const cw = Math.max(1, contentWpx || 1);
  const ch = Math.max(1, contentHpx || 1);

  const usableW = Math.max(1, vw - paddingXpx * 2);
  const usableH = Math.max(1, vh - paddingYpx * 2);

  const sx = usableW / cw;
  const sy = usableH / ch;
  const s = Math.min(sx, sy, 1);
  return clamp(s, minScale, maxScale);
}

export type UiScaleParams = {
  viewportWpx: number;
  viewportHpx: number;
  refWpx: number;
  refHpx: number;
  minScale?: number;
  maxScale?: number;
};

/**
 * Computes a “UI scale” relative to a reference design size.
 * Useful for scaling font sizes and control sizes in-game.
 */
export function computeUiScale(params: UiScaleParams): number {
  const { viewportWpx, viewportHpx, refWpx, refHpx, minScale = 0.8, maxScale = 1.4 } = params;
  const vw = Math.max(0, viewportWpx || 0);
  const vh = Math.max(0, viewportHpx || 0);
  const rw = Math.max(1, refWpx || 1);
  const rh = Math.max(1, refHpx || 1);
  const s = Math.min(vw / rw, vh / rh);
  return clamp(s, minScale, maxScale);
}


