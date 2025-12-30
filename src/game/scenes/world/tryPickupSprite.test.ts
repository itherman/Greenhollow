import { describe, expect, it, vi } from "vitest";
import { tryPickupSprite } from "./tryPickupSprite";

describe("tryPickupSprite", () => {
  it("returns false when sprite is missing or inactive", () => {
    const onPickup = vi.fn();
    expect(tryPickupSprite({ player: { x: 0, y: 0 }, sprite: undefined, rangePx: 10, onPickup })).toBe(false);
    expect(
      tryPickupSprite({
        player: { x: 0, y: 0 },
        sprite: { active: false, x: 0, y: 0, destroy: () => {} },
        rangePx: 10,
        onPickup,
      }),
    ).toBe(false);
    expect(onPickup).not.toHaveBeenCalled();
  });

  it("returns false when sprite is out of range", () => {
    const onPickup = vi.fn();
    const ok = tryPickupSprite({
      player: { x: 0, y: 0 },
      sprite: { active: true, x: 100, y: 0, destroy: () => {} },
      rangePx: 10,
      onPickup,
    });
    expect(ok).toBe(false);
    expect(onPickup).not.toHaveBeenCalled();
  });

  it("calls onPickup and returns true when sprite is in range", () => {
    const onPickup = vi.fn();
    const ok = tryPickupSprite({
      player: { x: 0, y: 0 },
      sprite: { active: true, x: 6, y: 8, destroy: () => {} }, // dist=10 => dist2=100
      rangePx: 10,
      onPickup,
    });
    expect(ok).toBe(true);
    expect(onPickup).toHaveBeenCalledTimes(1);
  });
});

