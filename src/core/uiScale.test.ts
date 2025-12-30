import { describe, expect, it } from "vitest";
import { computeInGameUiScale } from "./uiScale";

describe("uiScale", () => {
  it("returns ~1 at the reference size", () => {
    const r = computeInGameUiScale(960, 540);
    expect(r.uiScale).toBeCloseTo(1, 5);
  });

  it("clamps on tiny viewports", () => {
    const r = computeInGameUiScale(400, 400);
    expect(r.uiScale).toBeGreaterThanOrEqual(0.85);
  });

  it("clamps on huge viewports", () => {
    const r = computeInGameUiScale(4000, 3000);
    expect(r.uiScale).toBeLessThanOrEqual(1.25);
  });
});


