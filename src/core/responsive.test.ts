import { describe, expect, it } from "vitest";
import { computeScaleToFit, computeUiScale, getViewportInfo } from "./responsive";

describe("responsive", () => {
  it("getViewportInfo flags portrait/landscape and shortest/longest", () => {
    const a = getViewportInfo(400, 700);
    expect(a.isPortrait).toBe(true);
    expect(a.isLandscape).toBe(false);
    expect(a.shortest).toBe(400);
    expect(a.longest).toBe(700);

    const b = getViewportInfo(900, 600);
    expect(b.isPortrait).toBe(false);
    expect(b.isLandscape).toBe(true);
    expect(b.shortest).toBe(600);
    expect(b.longest).toBe(900);
  });

  it("computeScaleToFit returns 1 when content fits", () => {
    const s = computeScaleToFit({ viewportWpx: 800, viewportHpx: 600, contentWpx: 400, contentHpx: 300 });
    expect(s).toBe(1);
  });

  it("computeScaleToFit scales down to fit with padding", () => {
    const s = computeScaleToFit({
      viewportWpx: 400,
      viewportHpx: 400,
      contentWpx: 500,
      contentHpx: 500,
      paddingXpx: 20,
      paddingYpx: 20,
      minScale: 0.1,
      maxScale: 1,
    });
    // usable is 360x360; scale is 0.72
    expect(s).toBeCloseTo(0.72, 3);
  });

  it("computeUiScale matches reference at exact size", () => {
    const s = computeUiScale({ viewportWpx: 960, viewportHpx: 540, refWpx: 960, refHpx: 540, minScale: 0, maxScale: 10 });
    expect(s).toBe(1);
  });

  it("computeUiScale clamps", () => {
    const s = computeUiScale({ viewportWpx: 200, viewportHpx: 200, refWpx: 960, refHpx: 540, minScale: 0.8, maxScale: 1.4 });
    expect(s).toBe(0.8);
  });
});


