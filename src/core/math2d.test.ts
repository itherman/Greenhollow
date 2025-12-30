import { describe, expect, it } from "vitest";
import { dist2 } from "./math2d";

describe("dist2", () => {
  it("returns 0 for identical points", () => {
    expect(dist2({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(0);
  });

  it("returns squared distance", () => {
    // 3-4-5 triangle: squared distance is 25
    expect(dist2({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(25);
  });
});

