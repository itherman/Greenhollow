import { describe, expect, it } from "vitest";
import { computeDialogLayout } from "./dialogLayout";

describe("computeDialogLayout", () => {
  it("stays within screen bounds for typical sizes", () => {
    const L = computeDialogLayout(960, 540);
    expect(L.w).toBeLessThanOrEqual(960);
    expect(L.h).toBeLessThanOrEqual(540);
    expect(L.x - L.w / 2).toBeGreaterThanOrEqual(0);
    expect(L.x + L.w / 2).toBeLessThanOrEqual(960);
    expect(L.y - L.h / 2).toBeGreaterThanOrEqual(0);
    expect(L.y + L.h / 2).toBeLessThanOrEqual(540);
  });

  it("clamps sensibly on small screens", () => {
    const L = computeDialogLayout(320, 480);
    expect(L.w).toBeGreaterThanOrEqual(260);
    expect(L.x - L.w / 2).toBeGreaterThanOrEqual(0);
    expect(L.x + L.w / 2).toBeLessThanOrEqual(320);
  });

  it("is defensive when given 0 sizes", () => {
    const L = computeDialogLayout(0, 0);
    // Should still produce a usable, non-negative layout.
    expect(L.w).toBeGreaterThanOrEqual(260);
    expect(L.h).toBeGreaterThanOrEqual(120);
    expect(L.x - L.w / 2).toBeGreaterThanOrEqual(0);
    expect(L.y - L.h / 2).toBeGreaterThanOrEqual(0);
  });
});


