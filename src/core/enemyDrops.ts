export type EnemyDrop =
  | { kind: "heart" }
  | { kind: "coins"; qty: number };

export function rollEnemyDrop(rng: () => number): EnemyDrop {
  const r = rng();
  // Always at least one drop: either a heart or some coins.
  if (r < 0.5) return { kind: "heart" };
  // 2..6 coins
  const qty = 2 + Math.floor(Math.max(0, Math.min(0.999999, rng())) * 5);
  return { kind: "coins", qty };
}


