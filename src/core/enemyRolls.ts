import {
  STANDARD_ENEMY_DROP_COIN_MAX,
  STANDARD_ENEMY_DROP_COIN_MIN,
  STANDARD_ENEMY_HP_MAX,
  STANDARD_ENEMY_HP_MIN,
} from "./enemyTuning";

export type Rng = () => number;

export type EnemyDrop =
  | { kind: "heart" }
  | { kind: "coins"; coinsQty: number };

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function rollIntInclusive(rng: Rng, min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const r = clamp01(rng());
  // r in [0,1] should map to [lo,hi] inclusive; clamp r==1 to hi.
  const span = hi - lo + 1;
  const idx = Math.min(span - 1, Math.floor(r * span));
  return lo + idx;
}

export function rollStandardEnemyHp(rng: Rng = Math.random): number {
  return rollIntInclusive(rng, STANDARD_ENEMY_HP_MIN, STANDARD_ENEMY_HP_MAX);
}

export function rollStandardEnemyDrop(rng: Rng = Math.random): EnemyDrop {
  const r = clamp01(rng());
  if (r < 0.5) return { kind: "heart" };
  const coinsQty = rollIntInclusive(rng, STANDARD_ENEMY_DROP_COIN_MIN, STANDARD_ENEMY_DROP_COIN_MAX);
  return { kind: "coins", coinsQty };
}


