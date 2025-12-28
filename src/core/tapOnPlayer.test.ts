import { describe, expect, it } from "vitest";
import { isTapOnPlayer } from "./tapOnPlayer";

describe("tapOnPlayer", () => {
  it("detects taps within radius", () => {
    expect(isTapOnPlayer({ tapX: 10, tapY: 10, playerX: 20, playerY: 10, radiusPx: 10 })).toBe(true);
    expect(isTapOnPlayer({ tapX: 10, tapY: 10, playerX: 21, playerY: 10, radiusPx: 10 })).toBe(false);
  });
});


