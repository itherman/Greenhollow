import { getTile, isWalkable, type AreaDef, type Point } from "./areas";

export function isSpawnSafeTile(area: AreaDef, p: Point): boolean {
  const t = getTile(area, p);
  if (t == null) return false;
  if (!isWalkable(t)) return false;
  // Require a 3x3 walkable neighborhood so enemies don't visually overlap walls/trees at spawn.
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const tt = getTile(area, { x: p.x + dx, y: p.y + dy });
      if (tt == null) return false;
      if (!isWalkable(tt)) return false;
    }
  }
  return true;
}

export function listSpawnSafeTiles(area: AreaDef): Point[] {
  const out: Point[] = [];
  for (let y = 0; y < area.height; y++) {
    for (let x = 0; x < area.width; x++) {
      const p = { x, y };
      if (isSpawnSafeTile(area, p)) out.push(p);
    }
  }
  return out;
}

export function chooseEnemySpawnTiles(params: {
  area: AreaDef;
  count: number;
  rng: () => number;
  avoid?: Point[];
  minDistTiles?: number;
}): Point[] {
  const count = Math.max(0, Math.floor(params.count || 0));
  const candidates = listSpawnSafeTiles(params.area);
  if (!candidates.length || count === 0) return [];

  const avoid = params.avoid ?? [];
  const minD = Math.max(0, Math.floor(params.minDistTiles ?? 0));
  const minD2 = minD * minD;
  const okDist = (p: Point) => {
    if (!avoid.length || minD === 0) return true;
    for (const a of avoid) {
      const dx = p.x - a.x;
      const dy = p.y - a.y;
      if (dx * dx + dy * dy < minD2) return false;
    }
    return true;
  };

  const filtered = candidates.filter(okDist);
  const pool = filtered.length ? filtered : candidates;

  // Sample without replacement.
  const picks: Point[] = [];
  const used = new Set<string>();
  const key = (p: Point) => `${p.x},${p.y}`;
  const max = Math.min(count, pool.length);

  while (picks.length < max) {
    const idx = Math.floor(params.rng() * pool.length);
    const p = pool[Math.max(0, Math.min(pool.length - 1, idx))]!;
    const k = key(p);
    if (used.has(k)) continue;
    used.add(k);
    picks.push(p);
  }

  return picks;
}


