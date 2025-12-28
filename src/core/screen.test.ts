import { describe, expect, it } from "vitest";
import { normalizeScreenSize } from "./screen";

describe("screen", () => {
  it("clamps 0/undefined-ish sizes to minimums", () => {
    expect(normalizeScreenSize(0, 0)).toEqual({ w: 320, h: 240 });
    expect(normalizeScreenSize(NaN as unknown as number, NaN as unknown as number)).toEqual({ w: 320, h: 240 });
  });

  it("floors and respects custom minimums", () => {
    expect(normalizeScreenSize(499.9, 300.1)).toEqual({ w: 499, h: 300 });
    expect(normalizeScreenSize(100, 100, 480, 270)).toEqual({ w: 480, h: 270 });
  });
});


