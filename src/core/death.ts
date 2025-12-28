export type DeathTransition = { dead: boolean; justDied: boolean };

/**
 * Computes a stable death state from HP, and whether the caller has already entered death state.
 * Ensures "justDied" fires exactly once per death.
 */
export function computeDeathTransition(params: { hp: number; wasDead: boolean }): DeathTransition {
  const dead = params.hp <= 0;
  return { dead, justDied: dead && !params.wasDead };
}


