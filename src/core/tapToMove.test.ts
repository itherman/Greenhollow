import { describe, expect, it } from "vitest";
import { computeTapToMoveInput } from "./tapToMove";

describe("tapToMove", () => {
  it("stops when inside deadzone", () => {
    const r = computeTapToMoveInput({
      playerX: 10,
      playerY: 20,
      targetX: 13,
      targetY: 24,
      stopDistancePx: 6,
    });
    expect(r.arrived).toBe(true);
    expect(r.input).toEqual({ up: false, down: false, left: false, right: false });
  });

  it("prefers horizontal axis when |dx| >= |dy|", () => {
    expect(
      computeTapToMoveInput({
        playerX: 0,
        playerY: 0,
        targetX: 100,
        targetY: 90,
        stopDistancePx: 0,
      }).input,
    ).toEqual({ up: false, down: false, left: false, right: true });

    expect(
      computeTapToMoveInput({
        playerX: 0,
        playerY: 0,
        targetX: -50,
        targetY: 50,
        stopDistancePx: 0,
      }).input,
    ).toEqual({ up: false, down: false, left: true, right: false });
  });

  it("uses vertical axis when |dy| > |dx|", () => {
    expect(
      computeTapToMoveInput({
        playerX: 0,
        playerY: 0,
        targetX: 10,
        targetY: 40,
        stopDistancePx: 0,
      }).input,
    ).toEqual({ up: false, down: true, left: false, right: false });

    expect(
      computeTapToMoveInput({
        playerX: 0,
        playerY: 0,
        targetX: 10,
        targetY: -40,
        stopDistancePx: 0,
      }).input,
    ).toEqual({ up: true, down: false, left: false, right: false });
  });
});


