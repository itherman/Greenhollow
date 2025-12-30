export type EnemyDifficultyRank = number;

export type EnemyId = "woods_slime" | "cave_goblin_archer";

export type EnemyDefinition = {
  id: EnemyId;
  name: string;
  difficultyRank: EnemyDifficultyRank; // 1-1000 inclusive
};

export function clampEnemyDifficultyRank(rank: number): EnemyDifficultyRank {
  if (!Number.isFinite(rank)) return 1;
  if (rank < 1) return 1;
  if (rank > 1000) return 1000;
  return Math.floor(rank);
}

export const ENEMIES: Record<EnemyId, EnemyDefinition> = {
  woods_slime: {
    id: "woods_slime",
    name: "Forest Slime",
    difficultyRank: 180,
  },
  cave_goblin_archer: {
    id: "cave_goblin_archer",
    name: "Cave Goblin Archer",
    difficultyRank: 560,
  },
};

export function getEnemyDefinition(enemyId: EnemyId): EnemyDefinition {
  return ENEMIES[enemyId];
}
