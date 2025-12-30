import { describe, expect, it } from "vitest";
import { computeMobileControlsLayout } from "./mobileControlsLayout";

describe("mobileControlsLayout", () => {
  it("keeps buttons on-screen and reasonably sized", () => {
    for (const [w, h] of [
      [640, 360], // small landscape phone
      [812, 375], // iPhone landscape-ish
      [1024, 768], // tablet
      [960, 540], // base
    ] as const) {
      const l = computeMobileControlsLayout({ screenW: w, screenH: h });
      for (const r of [l.attack, l.interact]) {
        expect(r.w).toBeGreaterThanOrEqual(64);
        expect(r.h).toBeGreaterThanOrEqual(64);
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.y).toBeGreaterThanOrEqual(0);
        expect(r.x + r.w).toBeLessThanOrEqual(w);
        expect(r.y + r.h).toBeLessThanOrEqual(h);
      }
    }
  });

  it("makes attack larger than interact for touch viewports", () => {
    const l = computeMobileControlsLayout({ screenW: 640, screenH: 360 });
    expect(l.attack.w).toBeGreaterThan(l.interact.w);
    expect(l.attack.h).toBeGreaterThan(l.interact.h);
    // Keep this intentionally "noticeably larger" (not just +1px from rounding).
    expect(l.attack.w).toBeGreaterThanOrEqual(Math.floor(l.interact.w * 1.35));
  });

  it("stacks attack above interact", () => {
    const l = computeMobileControlsLayout({ screenW: 800, screenH: 400 });
    expect(l.attack.y + l.attack.h).toBeLessThanOrEqual(l.interact.y);
  });
});


