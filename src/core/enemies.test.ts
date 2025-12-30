import { describe, expect, it } from "vitest";
import { ENEMIES, clampEnemyDifficultyRank } from "./enemies";

describe("enemies", () => {
  it("clamps difficulty ranks to 1..1000", () => {
    expect(clampEnemyDifficultyRank(-10)).toBe(1);
    expect(clampEnemyDifficultyRank(1)).toBe(1);
    expect(clampEnemyDifficultyRank(1000)).toBe(1000);
    expect(clampEnemyDifficultyRank(1500)).toBe(1000);
  });

  it("defines all enemy difficulties inside the allowed range", () => {
    for (const def of Object.values(ENEMIES)) {
      expect(def.difficultyRank).toBeGreaterThanOrEqual(1);
      expect(def.difficultyRank).toBeLessThanOrEqual(1000);
    }
  });
});
