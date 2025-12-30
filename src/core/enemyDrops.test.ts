import { describe, expect, it } from "vitest";
import { rollEnemyDrop } from "./enemyDrops";

function rngSeq(seq: number[]) {
  let i = 0;
  return () => seq[i++] ?? seq[seq.length - 1] ?? 0;
}

describe("rollEnemyDrop", () => {
  it("returns a guaranteed drop even with extreme RNG", () => {
    const d = rollEnemyDrop({ rng: () => 0, difficultyRank: 1 });
    expect(["heart", "coins", "food"]).toContain(d.kind);
  });

  it("scales coin payouts with difficulty", () => {
    const lowCoins = rollEnemyDrop({ rng: rngSeq([0.9, 0.9, 0.0]), difficultyRank: 50 });
    const highCoins = rollEnemyDrop({ rng: rngSeq([0.9, 0.9, 0.0]), difficultyRank: 950 });
    if (lowCoins.kind !== "coins" || highCoins.kind !== "coins") {
      throw new Error("Expected both drops to be coins for comparison");
    }
    expect(highCoins.qty).toBeGreaterThan(lowCoins.qty);
  });

  it("upgrades to food drops for tougher enemies", () => {
    const drop = rollEnemyDrop({
      rng: rngSeq([0.5, 0.2, 0.1, 0.1]),
      difficultyRank: 900,
    });
    expect(drop.kind).toBe("food");
    if (drop.kind === "food") {
      expect(drop.itemId === "stew" || drop.itemId === "bread").toBe(true);
      expect(drop.qty).toBeGreaterThanOrEqual(1);
    }
  });
});
