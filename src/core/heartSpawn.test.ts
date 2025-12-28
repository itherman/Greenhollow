import { describe, expect, it } from "vitest";
import { getArea, isWalkable } from "./areas";
import { chooseHeartSpawnTile } from "./heartSpawn";

describe("heartSpawn", () => {
  it("chooses a walkable, non-exit tile in each area", () => {
    const rng = () => 0.42; // deterministic
    for (const id of ["village", "woods", "cave", "house", "hallway"] as const) {
      const a = getArea(id);
      const p = chooseHeartSpawnTile(a, rng);
      expect(p).not.toBeNull();
      if (!p) continue;
      const t = a.tiles[p.y]?.[p.x];
      expect(t).not.toBeNull();
      if (t == null) continue;
      expect(isWalkable(t)).toBe(true);
      // Not inside an exit rect
      for (const ex of a.exits) {
        const inside =
          p.x >= ex.rect.x &&
          p.x < ex.rect.x + ex.rect.w &&
          p.y >= ex.rect.y &&
          p.y < ex.rect.y + ex.rect.h;
        expect(inside).toBe(false);
      }
    }
  });
});


