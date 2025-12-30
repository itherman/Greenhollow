import { describe, expect, it } from "vitest";
import { rollStandardEnemyDrop, rollStandardEnemyHp } from "./enemyRolls";

function rngSeq(vals: number[]) {
  let i = 0;
  return () => {
    const v = vals[i] ?? vals[vals.length - 1] ?? 0;
    i++;
    return v;
  };
}

describe("enemyRolls", () => {
  it("rollStandardEnemyHp stays within 3..5 inclusive", () => {
    // Probe edges and midpoints.
    for (const r of [0, 0.0001, 0.33, 0.66, 0.9999, 1]) {
      const hp = rollStandardEnemyHp(() => r);
      expect(hp).toBeGreaterThanOrEqual(3);
      expect(hp).toBeLessThanOrEqual(5);
    }
  });

  it("rollStandardEnemyDrop yields heart or coins, coins qty within 2..10", () => {
    const heart = rollStandardEnemyDrop(rngSeq([0.1]));
    expect(heart).toEqual({ kind: "heart" });

    const coins = rollStandardEnemyDrop(rngSeq([0.9, 0.0]));
    expect(coins.kind).toBe("coins");
    if (coins.kind === "coins") {
      expect(coins.coinsQty).toBeGreaterThanOrEqual(2);
      expect(coins.coinsQty).toBeLessThanOrEqual(10);
    }
  });

  it("uses a deterministic branch based on RNG (50/50 split point)", () => {
    expect(rollStandardEnemyDrop(rngSeq([0.49]))).toEqual({ kind: "heart" });
    const d = rollStandardEnemyDrop(rngSeq([0.5, 0.999]));
    expect(d.kind).toBe("coins");
  });
});


