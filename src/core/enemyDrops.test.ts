import { describe, expect, it } from "vitest";
import { rollEnemyDrop } from "./enemyDrops";

describe("rollEnemyDrop", () => {
  it("always returns either heart or coins", () => {
    const rng = () => 0.1;
    const d = rollEnemyDrop(rng);
    expect(d.kind).toBe("heart");
  });

  it("coins drop has a positive quantity", () => {
    const seq = [0.9, 0.0];
    let i = 0;
    const rng = () => seq[i++] ?? 0;
    const d = rollEnemyDrop(rng);
    expect(d.kind).toBe("coins");
    if (d.kind === "coins") expect(d.qty).toBeGreaterThan(0);
  });
});


