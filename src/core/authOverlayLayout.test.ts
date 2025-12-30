import { describe, expect, it } from "vitest";
import { computeAuthOverlayLayout } from "./authOverlayLayout";

describe("authOverlayLayout", () => {
  it("uses compact layout on phone-sized viewports", () => {
    const l = computeAuthOverlayLayout(390, 844); // iPhone-ish
    expect(l.variant).toBe("compact");
    expect(l.cardMaxWidthPx).toBeLessThanOrEqual(390);
    expect(l.fieldWidthPct).toBe(100);
    expect(l.rowDirection).toBe("column");
  });

  it("uses regular layout on desktop-sized viewports", () => {
    const l = computeAuthOverlayLayout(1280, 800);
    expect(l.variant).toBe("regular");
    expect(l.cardMaxWidthPx).toBeGreaterThanOrEqual(640);
    expect(l.fieldWidthPct).toBe(60);
    expect(l.rowDirection).toBe("row");
  });

  it("never returns a card width that exceeds usable viewport width", () => {
    const l = computeAuthOverlayLayout(360, 640);
    expect(l.cardMaxWidthPx).toBeLessThanOrEqual(360);
  });

  it("uses a two-plus-one button layout for very short landscape viewports", () => {
    const l = computeAuthOverlayLayout(844, 390);
    expect(l.variant).toBe("compact");
    expect(l.buttonLayout).toBe("twoPlusOne");
    expect(l.rowDirection).toBe("row");
  });
});


