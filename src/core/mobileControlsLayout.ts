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

  // Base size scales a bit with height while staying tappable.
  const base = Math.max(minButtonPx, Math.min(110, Math.floor(H * 0.18)));

  // Make ATTACK larger on mobile for better tap-ability, without forcing other buttons larger.
  const attackScale = 1.4;
  const attackMaxPx = 160;
  const interactSize = base;
  const attackSize = Math.max(interactSize, Math.min(attackMaxPx, Math.floor(base * attackScale)));

  const centerY = Math.floor(H * 0.62);
  const stackH = attackSize + gapPx + interactSize;
  const startY = Math.max(marginPx, Math.min(H - marginPx - stackH, Math.round(centerY - stackH / 2)));

  const attack: Rect = { x: W - marginPx - attackSize, y: startY, w: attackSize, h: attackSize };
  const interact: Rect = {
    x: W - marginPx - interactSize,
    y: startY + attackSize + gapPx,
    w: interactSize,
    h: interactSize,
  };

  return { attack, interact };
}


