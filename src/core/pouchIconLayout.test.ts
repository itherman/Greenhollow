import { describe, expect, it } from "vitest";
import { computePouchIconLayout } from "./pouchIconLayout";

describe("computePouchIconLayout", () => {
  it("returns an icon fully on-screen", () => {
    const r = computePouchIconLayout({ screenW: 320, screenH: 180 });
    expect(r.icon.x).toBeGreaterThanOrEqual(0);
    expect(r.icon.y).toBeGreaterThanOrEqual(0);
    expect(r.icon.x + r.icon.w).toBeLessThanOrEqual(320);
    expect(r.icon.y + r.icon.h).toBeLessThanOrEqual(180);
    expect(r.icon.w).toBe(53); // wider than tall
    expect(r.icon.h).toBe(44);
    expect(r.hit.w).toBe(77); // 53 + 12px padding on both sides
    expect(r.hit.h).toBe(68); // 44 + 12px padding on both sides
  });

  it("clamps on very small screens", () => {
    const r = computePouchIconLayout({ screenW: 20, screenH: 20, iconSize: 22 });
    expect(r.icon.x).toBe(0);
    expect(r.icon.y).toBe(0);
  });
});


