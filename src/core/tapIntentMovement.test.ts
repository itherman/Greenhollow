import { describe, expect, it } from "vitest";
import { getTapInteractRangePx, getTapStopDistancePx } from "./tapIntentMovement";

describe("tapIntentMovement", () => {
  it("walks fully onto items", () => {
    expect(getTapStopDistancePx("heart")).toBe(0);
    expect(getTapStopDistancePx("key")).toBe(0);
    expect(getTapStopDistancePx("sword")).toBe(0);
  });

  it("uses a larger interact range for NPC/chest than for item pickup", () => {
    expect(getTapInteractRangePx("npc")).toBeGreaterThan(getTapInteractRangePx("key"));
    expect(getTapInteractRangePx("chest")).toBeGreaterThan(getTapInteractRangePx("sword"));
  });

  it("requires getting closer to NPCs than a full tile-and-a-half", () => {
    expect(getTapInteractRangePx("npc")).toBeLessThanOrEqual(32);
  });
});


