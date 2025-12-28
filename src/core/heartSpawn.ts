import type { AreaDef, Point } from "./areas";
import { isWalkable } from "./areas";

export type Rng = () => number;

function key(p: Point): string {
  return `${p.x},${p.y}`;
}

export function chooseHeartSpawnTile(area: AreaDef, rng: Rng = Math.random): Point | null {
  const blocked = new Set<string>();

  // Avoid exits so hearts don't spawn on transitions.
  for (const ex of area.exits) {
    for (let yy = ex.rect.y; yy < ex.rect.y + ex.rect.h; yy++) {
      for (let xx = ex.rect.x; xx < ex.rect.x + ex.rect.w; xx++) blocked.add(`${xx},${yy}`);
    }
  }
  // Avoid NPC tiles.
  for (const npc of area.npcs) blocked.add(key(npc.pos));
  // Avoid spawn tiles.
  for (const p of Object.values(area.spawns)) blocked.add(key(p));

  const candidates: Point[] = [];
  for (let y = 0; y < area.height; y++) {
    for (let x = 0; x < area.width; x++) {
      if (blocked.has(`${x},${y}`)) continue;
      const t = area.tiles[y]?.[x];
      if (t == null) continue;
      if (!isWalkable(t)) continue;
      candidates.push({ x, y });
    }
  }
  if (candidates.length === 0) return null;
  const r = rng();
  const idx = Math.max(0, Math.min(candidates.length - 1, Math.floor(r * candidates.length)));
  return candidates[idx] ?? null;
}


