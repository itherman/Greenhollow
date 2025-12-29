import { describe, expect, it } from "vitest";
import { getGreenhollowTheme } from "./greenhollowTheme";

describe("getGreenhollowTheme", () => {
  it("provides required color tokens", () => {
    const t = getGreenhollowTheme();
    expect(t.colors.night).toMatch(/^#/);
    expect(t.colors.parchment).toMatch(/^#/);
    expect(t.colors.wood0).toMatch(/^#/);
    expect(t.colors.gold).toMatch(/^#/);
  });
});


