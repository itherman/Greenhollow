import type { Direction } from "./movement";

export type AttackState = {
  lastAttackAtMs: number;
};

export function createAttackState(): AttackState {
  return { lastAttackAtMs: -Infinity };
}

export type AttackAttempt =
  | { ok: true; next: AttackState }
  | { ok: false; reason: "cooldown" };

export function tryStartAttack(params: {
  nowMs: number;
  state: AttackState;
  cooldownMs: number;
}): AttackAttempt {
  const { nowMs, state, cooldownMs } = params;
  if (nowMs - state.lastAttackAtMs < cooldownMs) return { ok: false, reason: "cooldown" };
  return { ok: true, next: { lastAttackAtMs: nowMs } };
}

export type HitboxRect = { x: number; y: number; w: number; h: number };

/**
 * Compute an axis-aligned rectangular hitbox in world coordinates.
 * `playerX/playerY` should be the player's world position (sprite center).
 */
export function computeSwordHitbox(params: {
  playerX: number;
  playerY: number;
  facing: Exclude<Direction, "none">;
  reachPx: number;
  widthPx: number;
  heightPx: number;
}): HitboxRect {
  const { playerX, playerY, facing, reachPx, widthPx, heightPx } = params;
  const cx =
    facing === "left" ? playerX - reachPx : facing === "right" ? playerX + reachPx : playerX;
  const cy =
    facing === "up" ? playerY - reachPx : facing === "down" ? playerY + reachPx : playerY;
  return { x: cx - widthPx / 2, y: cy - heightPx / 2, w: widthPx, h: heightPx };
}


