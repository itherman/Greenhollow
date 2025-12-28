import { describe, expect, it } from "vitest";
import { shouldShowMobileControls } from "./mobileControlsVisibility";

describe("mobileControlsVisibility", () => {
  it("requires touch", () => {
    expect(shouldShowMobileControls({ screenW: 800, screenH: 400, hasTouch: false })).toBe(false);
  });

  it("shows on typical mobile/tablet landscape sizes", () => {
    expect(shouldShowMobileControls({ screenW: 812, screenH: 375, hasTouch: true })).toBe(true);
    expect(shouldShowMobileControls({ screenW: 1024, screenH: 768, hasTouch: true })).toBe(true);
    expect(shouldShowMobileControls({ screenW: 1366, screenH: 768, hasTouch: true })).toBe(true);
  });

  it("hides on very large viewports even if touch exists", () => {
    expect(shouldShowMobileControls({ screenW: 1920, screenH: 1080, hasTouch: true })).toBe(false);
  });
});


