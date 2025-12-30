import { computeScaleToFit } from "../core/responsive";

export type OverlayFrame = {
  root: HTMLDivElement;
  frame: HTMLDivElement;
  /**
   * Call to recompute scale (e.g., after content changes or resize).
   */
  update: () => void;
  destroy: () => void;
};

type CreateOverlayFrameOptions = {
  id: string;
  zIndex: number;
  background: string;
  paddingPx?: number;
  minScale?: number;
  maxScale?: number;
  /**
   * Extra hook for overlays that need to recompute internal layout on resize
   * before the fit scaling is applied.
   */
  onBeforeFit?: () => void;
};

/**
 * Creates a full-screen overlay root and a centered frame whose contents are
 * automatically scaled (via transform) to fit the current viewport.
 *
 * This is the shared mechanism that guarantees “no scroll” overlays for any
 * viewport ≥ 400×400 (and degrades gracefully below).
 */
export function createOverlayFrame(opts: CreateOverlayFrameOptions): OverlayFrame {
  const root = document.createElement("div");
  root.id = opts.id;
  Object.assign(root.style, {
    position: "fixed",
    inset: "0",
    background: opts.background,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: String(opts.zIndex),
    boxSizing: "border-box",
    // Avoid browser gestures fighting the overlay; we still allow interactions with inputs.
    touchAction: "manipulation",
  } satisfies Partial<CSSStyleDeclaration>);

  const frame = document.createElement("div");
  Object.assign(frame.style, {
    transformOrigin: "50% 50%",
    willChange: "transform",
  } satisfies Partial<CSSStyleDeclaration>);

  root.appendChild(frame);
  document.body.appendChild(root);

  const paddingPx = opts.paddingPx ?? 16;

  const update = () => {
    opts.onBeforeFit?.();

    // Reset scale to measure natural size.
    frame.style.transform = "scale(1)";

    // Force reflow so the measurement is for scale=1.
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    frame.getBoundingClientRect().width;

    const rect = frame.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const safePadX = paddingPx;
    const safePadY = paddingPx;

    const s = computeScaleToFit({
      viewportWpx: vw,
      viewportHpx: vh,
      contentWpx: rect.width,
      contentHpx: rect.height,
      paddingXpx: safePadX,
      paddingYpx: safePadY,
      minScale: opts.minScale ?? 0.6,
      maxScale: opts.maxScale ?? 1.0,
    });

    frame.style.transform = `scale(${s})`;
    root.style.padding = `calc(${paddingPx}px + env(safe-area-inset-top)) calc(${paddingPx}px + env(safe-area-inset-right)) calc(${paddingPx}px + env(safe-area-inset-bottom)) calc(${paddingPx}px + env(safe-area-inset-left))`;
  };

  const onResize = () => update();
  window.addEventListener("resize", onResize, { passive: true });

  const destroy = () => {
    window.removeEventListener("resize", onResize);
    root.remove();
  };

  // Initial fit.
  update();

  return { root, frame, update, destroy };
}


