import { describe, expect, it } from "vitest";
import { getFeetDepth } from "./depthSort";

describe("getFeetDepth", () => {
  it("prefers body.bottom when present", () => {
    expect(getFeetDepth({ y: 100, body: { bottom: 123 } })).toBe(123);
  });

  it("falls back to sprite.y when body is missing", () => {
    expect(getFeetDepth({ y: 100 })).toBe(100);
  });
});

