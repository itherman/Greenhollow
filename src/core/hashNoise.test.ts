import { describe, expect, it } from "vitest";
import { hash2d01 } from "./hashNoise";

describe("hash2d01", () => {
  it("is deterministic for same inputs", () => {
    expect(hash2d01(1, 2, 3)).toBe(hash2d01(1, 2, 3));
    expect(hash2d01(123, 456, 0)).toBe(hash2d01(123, 456, 0));
  });

  it("stays within [0, 1)", () => {
    for (const [x, y, s] of [
      [0, 0, 0],
      [1, 2, 3],
      [999, 1001, 42],
      [-12, 77, 9],
    ]) {
      const r = hash2d01(x, y, s);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(1);
    }
  });

  it("changes when inputs change", () => {
    const a = hash2d01(10, 10, 1);
    const b = hash2d01(11, 10, 1);
    const c = hash2d01(10, 11, 1);
    const d = hash2d01(10, 10, 2);
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
    expect(a).not.toBe(d);
  });
});


