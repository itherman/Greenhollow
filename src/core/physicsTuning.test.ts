import { describe, expect, it } from "vitest";
import { ARCADE_TILE_BIAS, ARROW_HITBOX } from "./physicsTuning";

describe("physicsTuning", () => {
  it("uses a conservative tileBias to prevent projectile tunneling during frame spikes", () => {
    // Default is 16; we want higher because arrows are small and can be fast.
    expect(ARCADE_TILE_BIAS).toBeGreaterThanOrEqual(32);
  });

  it("defines an arrow hitbox that is non-zero and reasonable", () => {
    expect(ARROW_HITBOX.w).toBeGreaterThan(0);
    expect(ARROW_HITBOX.h).toBeGreaterThan(0);
    expect(ARROW_HITBOX.w).toBeLessThanOrEqual(16);
    expect(ARROW_HITBOX.h).toBeLessThanOrEqual(12);
  });
});


