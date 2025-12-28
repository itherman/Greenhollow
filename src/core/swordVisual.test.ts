import { describe, expect, it } from "vitest";
import { computeHeldSwordPose, computeSwordSwing } from "./swordVisual";

describe("swordVisual", () => {
  it("computes a handle-pivoted held pose for each facing", () => {
    const down = computeHeldSwordPose("down");
    expect(down.originX).toBe(0.5);
    expect(down.originY).toBe(0.9);
    expect(down.scale).toBeGreaterThan(0.5);
    expect(down.dx).not.toBe(0);

    const up = computeHeldSwordPose("up");
    expect(up.originY).toBe(0.9);
    expect(up.dy).toBeLessThan(0);

    const left = computeHeldSwordPose("left");
    expect(left.dx).toBeLessThan(0);

    const right = computeHeldSwordPose("right");
    expect(right.dx).toBeGreaterThan(0);
  });

  it("computes a swing arc with a short duration", () => {
    const s = computeSwordSwing("right");
    expect(s.durationMs).toBeGreaterThan(50);
    expect(s.durationMs).toBeLessThan(400);
    expect(s.startRotation).not.toBe(s.endRotation);
  });
});


