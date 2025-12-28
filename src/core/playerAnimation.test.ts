import { describe, expect, it } from "vitest";
import { getPlayerAnim } from "./playerAnimation";

describe("getPlayerAnim", () => {
  it("returns walk animation keys when moving", () => {
    expect(getPlayerAnim("down", true)).toEqual({ type: "walk", key: "walk-down" });
    expect(getPlayerAnim("up", true)).toEqual({ type: "walk", key: "walk-up" });
    expect(getPlayerAnim("left", true)).toEqual({ type: "walk", key: "walk-left" });
    expect(getPlayerAnim("right", true)).toEqual({ type: "walk", key: "walk-right" });
  });

  it("returns idle frames when not moving", () => {
    expect(getPlayerAnim("down", false)).toEqual({ type: "idle", frame: 0 });
    expect(getPlayerAnim("left", false)).toEqual({ type: "idle", frame: 4 });
    expect(getPlayerAnim("right", false)).toEqual({ type: "idle", frame: 8 });
    expect(getPlayerAnim("up", false)).toEqual({ type: "idle", frame: 12 });
  });
});


