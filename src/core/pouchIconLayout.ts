export type Rect = { x: number; y: number; w: number; h: number };

export type PouchIconLayout = {
  icon: Rect;
  hit: Rect;
};

export type ChatButtonLayout = {
  button: Rect;
  hit: Rect;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * UI layout for the inventory "pouch" icon in the top-left HUD area.
 *
 * Kept as a pure function so it can be unit-tested and reused on resize.
 */
export function computePouchIconLayout(opts: {
  screenW: number;
  screenH: number;
  margin?: number;
  iconSize?: number;
  iconWidth?: number;
  iconHeight?: number;
  belowTopTextPx?: number;
  hitPadding?: number;
}): PouchIconLayout {
  const margin = opts.margin ?? 10;
  // Default height roughly the previous size; width is a bit wider for a satchel feel.
  const iconH = opts.iconHeight ?? opts.iconSize ?? 44;
  const iconW = opts.iconWidth ?? Math.round((opts.iconSize ?? iconH) * 1.2);
  const belowTopTextPx = opts.belowTopTextPx ?? 24; // leaves space for HP text
  const hitPadding = opts.hitPadding ?? 12;

  // Place near the HP HUD (which is at ~10,10).
  let x = margin;
  let y = margin + belowTopTextPx;

  // Keep icon fully on-screen even on tiny viewports.
  x = clamp(x, 0, Math.max(0, opts.screenW - iconW));
  y = clamp(y, 0, Math.max(0, opts.screenH - iconH));

  const icon: Rect = { x, y, w: iconW, h: iconH };
  const hit: Rect = {
    x: clamp(icon.x - hitPadding, 0, opts.screenW),
    y: clamp(icon.y - hitPadding, 0, opts.screenH),
    w: clamp(icon.w + hitPadding * 2, 0, opts.screenW),
    h: clamp(icon.h + hitPadding * 2, 0, opts.screenH),
  };

  return { icon, hit };
}

/**
 * UI layout for the town chat button, positioned next to the pouch icon.
 */
export function computeTownChatButtonLayout(opts: {
  screenW: number;
  screenH: number;
  pouchLayout: PouchIconLayout;
  gap?: number;
  buttonWidth?: number;
  buttonHeight?: number;
  hitPadding?: number;
}): ChatButtonLayout {
  const gap = opts.gap ?? 8;
  const buttonH = opts.buttonHeight ?? Math.round(opts.pouchLayout.icon.h * 0.8);
  const buttonW = opts.buttonWidth ?? Math.round(buttonH * 1.6);
  const hitPadding = opts.hitPadding ?? 10;

  let x = opts.pouchLayout.icon.x + opts.pouchLayout.icon.w + gap;
  let y = opts.pouchLayout.icon.y + Math.round((opts.pouchLayout.icon.h - buttonH) / 2);

  x = clamp(x, 0, Math.max(0, opts.screenW - buttonW));
  y = clamp(y, 0, Math.max(0, opts.screenH - buttonH));

  const button: Rect = { x, y, w: buttonW, h: buttonH };
  const hit: Rect = {
    x: clamp(button.x - hitPadding, 0, opts.screenW),
    y: clamp(button.y - hitPadding, 0, opts.screenH),
    w: clamp(button.w + hitPadding * 2, 0, opts.screenW),
    h: clamp(button.h + hitPadding * 2, 0, opts.screenH),
  };

  return { button, hit };
}

