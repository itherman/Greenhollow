export type Rect = { x: number; y: number; w: number; h: number };

export type MobileControlsLayout = {
  attack: Rect;
  interact: Rect;
};

/**
 * Compute on-screen button rectangles in screen pixels.
 * Landscape-first: buttons live on the right side, stacked vertically.
 */
export function computeMobileControlsLayout(params: {
  screenW: number;
  screenH: number;
  marginPx?: number;
  gapPx?: number;
  minButtonPx?: number;
}): MobileControlsLayout {
  const {
    screenW,
    screenH,
    marginPx = 18,
    gapPx = 14,
    minButtonPx = 64,
  } = params;

  const W = Math.max(320, Math.floor(screenW || 0));
  const H = Math.max(240, Math.floor(screenH || 0));

  // Make buttons scale a bit with height while staying tappable.
  const size = Math.max(minButtonPx, Math.min(110, Math.floor(H * 0.18)));
  const x = W - marginPx - size;
  const centerY = Math.floor(H * 0.62);

  const attack: Rect = { x, y: centerY - size - Math.floor(gapPx / 2), w: size, h: size };
  const interact: Rect = { x, y: centerY + Math.ceil(gapPx / 2), w: size, h: size };

  // Clamp to keep fully on-screen.
  const clampRect = (r: Rect): Rect => ({
    x: Math.max(marginPx, Math.min(W - marginPx - r.w, r.x)),
    y: Math.max(marginPx, Math.min(H - marginPx - r.h, r.y)),
    w: r.w,
    h: r.h,
  });

  return { attack: clampRect(attack), interact: clampRect(interact) };
}


