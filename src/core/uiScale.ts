import { computeUiScale } from "./responsive";

export type UiScaleResult = {
  uiScale: number;
};

/**
 * Shared “UI scale” for in-game overlays/text. Reference is the landscape design size.
 * We clamp aggressively so UI doesn’t become comically huge or tiny.
 */
export function computeInGameUiScale(screenW: number, screenH: number): UiScaleResult {
  const uiScale = computeUiScale({
    viewportWpx: screenW,
    viewportHpx: screenH,
    refWpx: 960,
    refHpx: 540,
    minScale: 0.85,
    maxScale: 1.25,
  });
  return { uiScale };
}


