import { describe, expect, it } from "vitest";
import { layoutPixelText, PIXEL_FONT_5X7 } from "./pixelFont";

describe("pixelFont", () => {
  it("has glyphs for GREENHOLLOW", () => {
    for (const ch of "GREENHOLLOW") {
      expect(PIXEL_FONT_5X7[ch]).toBeTruthy();
    }
  });

  it("lays out pixels within bounds", () => {
    const r = layoutPixelText("GREENHOLLOW");
    expect(r.h).toBe(7);
    expect(r.w).toBeGreaterThan(0);
    for (const p of r.pixels) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThan(r.w);
      expect(p.y).toBeLessThan(r.h);
    }
  });
});


