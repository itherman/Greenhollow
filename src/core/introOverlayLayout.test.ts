import { describe, expect, it } from "vitest";
import { computeIntroOverlayLayout } from "./introOverlayLayout";

describe("computeIntroOverlayLayout", () => {
  it("fits within the viewport width", () => {
    const r = computeIntroOverlayLayout(932, 430);
    expect(r.canvasCssWidthPx).toBeGreaterThan(0);
    expect(r.canvasCssWidthPx).toBeLessThanOrEqual(932);
  });

  it("reduces width on short viewports so Start can remain visible", () => {
    const short = computeIntroOverlayLayout(932, 430);
    const tall = computeIntroOverlayLayout(932, 900);
    expect(short.canvasCssWidthPx).toBeLessThan(tall.canvasCssWidthPx);
  });

  it("caps width on large desktop viewports", () => {
    const r = computeIntroOverlayLayout(2400, 1400);
    expect(r.canvasCssWidthPx).toBeLessThanOrEqual(1200);
  });
});


