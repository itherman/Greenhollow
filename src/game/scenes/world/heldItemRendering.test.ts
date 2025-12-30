import { describe, expect, it } from "vitest";
import { computeHeldBowPose } from "./heldItemRendering";

describe("computeHeldBowPose", () => {
  it("matches the prior WorldScene inline offsets map", () => {
    expect(computeHeldBowPose("up")).toEqual({ dx: 0, dy: -4, rotation: -Math.PI / 2 });
    expect(computeHeldBowPose("down")).toEqual({ dx: 0, dy: 6, rotation: Math.PI / 2 });
    expect(computeHeldBowPose("left")).toEqual({ dx: -6, dy: 0, rotation: Math.PI });
    expect(computeHeldBowPose("right")).toEqual({ dx: 6, dy: 0, rotation: 0 });
  });
});

