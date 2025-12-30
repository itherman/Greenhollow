import { describe, expect, it } from "vitest";
import { getArea } from "./areas";
import { chooseEnemySpawnTiles, isSpawnSafeTile, listSpawnSafeTiles } from "./enemySpawn";

describe("enemySpawn", () => {
  it("spawn-safe tiles are always walkable and in-bounds", () => {
    const woods = getArea("woods");
    const cave = getArea("cave");
    for (const a of [woods, cave]) {
      const tiles = listSpawnSafeTiles(a);
      expect(tiles.length).toBeGreaterThan(0);
      for (const p of tiles) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThan(a.width);
        expect(p.y).toBeLessThan(a.height);
        expect(isSpawnSafeTile(a, p)).toBe(true);
      }
    }
  });

  it("chooses unique spawn tiles and respects avoidance when possible", () => {
    const a = getArea("woods");
    const avoid = a.spawns.fromVillage;
    // Deterministic RNG.
    let r = 0;
    const rng = () => ((r = (r * 1664525 + 1013904223) >>> 0), (r % 1000) / 1000);
    const picks = chooseEnemySpawnTiles({ area: a, count: 5, rng, avoid: [avoid], minDistTiles: 3 });
    expect(picks.length).toBe(5);
    const keys = new Set(picks.map((p) => `${p.x},${p.y}`));
    expect(keys.size).toBe(5);
    // If we had enough candidates, they should not be too close.
    for (const p of picks) {
      const dx = p.x - avoid.x;
      const dy = p.y - avoid.y;
      expect(dx * dx + dy * dy).toBeGreaterThanOrEqual(9);
    }
  });
});


