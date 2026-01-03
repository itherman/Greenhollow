import type { ItemId } from "./inventory";
import { clampEnemyDifficultyRank } from "./enemies";

export type EnemyDrop =
  | { kind: "heart" }
  | { kind: "coins"; qty: number }
  | { kind: "food"; itemId: ItemId; qty: number }
  | { kind: "item"; itemId: ItemId; qty: number };

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function rollIntInclusive(rng: () => number, min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const span = hi - lo + 1;
  const idx = Math.min(span - 1, Math.floor(clamp01(rng()) * span));
  return lo + idx;
}

export function rollEnemyDrop(args: { rng: () => number; difficultyRank: number }): EnemyDrop {
  const { rng } = args;
  const difficultyRank = clampEnemyDifficultyRank(args.difficultyRank);
  const difficulty01 = (difficultyRank - 1) / 999; // normalize to [0,1]

  // Slightly lower heart chance as enemies get tougher (more gold/food instead).
  const heartChance = 0.6 - difficulty01 * 0.3; // 0.6 -> 0.3
  if (rng() < heartChance) return { kind: "heart" };

  // Better enemies feed you more often.
  const foodChance = 0.15 + difficulty01 * 0.35; // 0.15 -> 0.5
  if (rng() < foodChance) {
    const hearty = difficulty01 >= 0.55;
    const itemId: ItemId = hearty && rng() < 0.45 ? "stew" : "bread";
    const qty = hearty && rng() < 0.35 ? 2 : 1;
    return { kind: "food", itemId, qty };
  }

  // Coins scale up with difficulty.
  const minCoins = 2 + Math.floor(4 * difficulty01); // 2..6
  const maxCoins = 6 + Math.floor(18 * difficulty01); // 6..24
  const qty = rollIntInclusive(rng, minCoins, maxCoins);
  return { kind: "coins", qty };
}
