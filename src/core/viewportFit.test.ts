import { describe, expect, it } from "vitest";
import { computeGameParentSize } from "./viewportFit";

describe("computeGameParentSize", () => {
  it("uses full viewport for mobile-sized screens", () => {
    const r = computeGameParentSize(390, 844, {
      desktopMinWidthPx: 900,
      desktopMinHeightPx: 600,
      desktopCapFactor: 0.85,
    });
    expect(r.isDesktopCapped).toBe(false);
    expect(r.parentWidthPx).toBe(390);
    expect(r.parentHeightPx).toBe(844);
    expect(r.capFactorApplied).toBe(1.0);
  });

  it("caps desktop viewports by the configured factor (floored)", () => {
    const r = computeGameParentSize(1920, 1080, {
      desktopMinWidthPx: 900,
      desktopMinHeightPx: 600,
      desktopCapFactor: 0.85,
    });
    expect(r.isDesktopCapped).toBe(true);
    expect(r.parentWidthPx).toBe(Math.floor(1920 * 0.85));
    expect(r.parentHeightPx).toBe(Math.floor(1080 * 0.85));
    expect(r.capFactorApplied).toBe(0.85);
  });

  it("never returns sizes larger than the viewport", () => {
    const r = computeGameParentSize(1000, 800, {
      desktopMinWidthPx: 900,
      desktopMinHeightPx: 600,
      desktopCapFactor: 2, // nonsense; should clamp to 1
    });
    expect(r.parentWidthPx).toBeLessThanOrEqual(1000);
    expect(r.parentHeightPx).toBeLessThanOrEqual(800);
  });
});


