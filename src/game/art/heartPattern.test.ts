import { describe, expect, it } from "vitest";
import { getHeartPattern } from "./heartPattern";

describe("heartPattern", () => {
  it("stays in-bounds and has a bottom point", () => {
    const p = getHeartPattern();
    expect(p.w).toBeGreaterThan(0);
    expect(p.h).toBeGreaterThan(0);

    for (const px of p.pixels) {
      expect(px.x).toBeGreaterThanOrEqual(0);
      expect(px.y).toBeGreaterThanOrEqual(0);
      expect(px.x).toBeLessThan(p.w);
      expect(px.y).toBeLessThan(p.h);
    }

    // Bottom point (outline) at the center-ish.
    const hasPoint = p.pixels.some((px) => px.c === "outline" && px.y === 9 && px.x === 5);
    expect(hasPoint).toBe(true);
  });

  it("is horizontally symmetric for non-highlight pixels", () => {
    const p = getHeartPattern();
    const nonHighlight = new Set<string>();
    for (const px of p.pixels) {
      if (px.c === "highlight") continue;
      nonHighlight.add(`${px.x},${px.y},${px.c}`);
    }

    for (const px of p.pixels) {
      if (px.c === "highlight") continue;
      const mx = p.w - 1 - px.x;
      expect(nonHighlight.has(`${mx},${px.y},${px.c}`)).toBe(true);
    }
  });
});


