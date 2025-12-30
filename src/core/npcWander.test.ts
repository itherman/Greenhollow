import { describe, expect, it } from "vitest";
import { pickWanderTargetTile } from "./npcWander";
import type { TileId } from "./areas";

function rngSeq(vals: number[]) {
  let i = 0;
  return () => {
    const v = vals[i] ?? vals[vals.length - 1] ?? 0;
    i++;
    return v;
  };
}

describe("npcWander", () => {
  it("avoids forbidden rectangles even if RNG tries to place inside", () => {
    const tiles: TileId[][] = Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => 0 as TileId));
    // Mark a house footprint as walls (tile 1) but also treat the full rect as forbidden.
    const forbidden = [{ x: 2, y: 2, w: 3, h: 3 }];
    for (let y = 2; y < 5; y++) for (let x = 2; x < 5; x++) tiles[y]![x] = 1;
    const home = { x: 3, y: 5 };
    // RNG first would try offsets toward the forbidden area, then elsewhere.
    const t = pickWanderTargetTile({ tiles, home, radiusTiles: 3, forbidden, rng: rngSeq([0.0, 0.0, 1.0, 1.0]) });
    // Must not land inside forbidden rect and must be within bounds.
    expect(t.x).toBeGreaterThanOrEqual(0);
    expect(t.y).toBeGreaterThanOrEqual(0);
    expect(t.x).toBeLessThan(10);
    expect(t.y).toBeLessThan(10);
    expect(t.x >= 2 && t.x < 5 && t.y >= 2 && t.y < 5).toBe(false);
  });
});


