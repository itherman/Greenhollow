import type { Point, TileId } from "./areas";

export type Rect = { x: number; y: number; w: number; h: number };
export type Rng = () => number;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function inRect(p: Point, r: Rect): boolean {
  return p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;
}

export function isWalkableTileId(t: TileId): boolean {
  return t !== 1 && t !== 5;
}

export function pickWanderTargetTile(params: {
  tiles: TileId[][];
  home: Point; // tile coords
  radiusTiles: number;
  forbidden: Rect[];
  tries?: number;
  rng?: Rng;
}): Point {
  const { tiles, home, radiusTiles, forbidden, tries = 12, rng = Math.random } = params;
  const H = tiles.length;
  const W = tiles[0]?.length ?? 0;
  const rad = Math.max(0, Math.floor(radiusTiles));

  const ok = (p: Point) => {
    if (p.x < 0 || p.y < 0 || p.x >= W || p.y >= H) return false;
    const t = tiles[p.y]?.[p.x];
    if (t == null) return false;
    if (!isWalkableTileId(t)) return false;
    for (const r of forbidden) if (inRect(p, r)) return false;
    return true;
  };

  if (ok(home)) return home;

  for (let i = 0; i < tries; i++) {
    const rx = Math.round((clamp01(rng()) * 2 - 1) * rad);
    const ry = Math.round((clamp01(rng()) * 2 - 1) * rad);
    const p = { x: home.x + rx, y: home.y + ry };
    if (ok(p)) return p;
  }

  // Fallback: search local neighborhood.
  for (let dy = -rad; dy <= rad; dy++) {
    for (let dx = -rad; dx <= rad; dx++) {
      const p = { x: home.x + dx, y: home.y + dy };
      if (ok(p)) return p;
    }
  }

  return home;
}


