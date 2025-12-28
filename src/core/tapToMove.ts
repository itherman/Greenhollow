import type { MovementInput } from "./movement";

export type TapToMoveResult = {
  input: MovementInput;
  arrived: boolean;
};

const none: MovementInput = { up: false, down: false, left: false, right: false };

/**
 * Convert a tap target into movement inputs compatible with `computeMovement()`.
 * Design goals:
 * - no diagonal movement (matches current movement rules)
 * - prefer dominant axis (|dx| >= |dy| => horizontal, else vertical)
 * - stop inside a deadzone to prevent jitter
 */
export function computeTapToMoveInput(params: {
  playerX: number;
  playerY: number;
  targetX: number;
  targetY: number;
  stopDistancePx: number;
}): TapToMoveResult {
  const { playerX, playerY, targetX, targetY, stopDistancePx } = params;
  const dx = targetX - playerX;
  const dy = targetY - playerY;
  const d = Math.hypot(dx, dy);
  if (d <= stopDistancePx) return { input: none, arrived: true };

  if (Math.abs(dx) >= Math.abs(dy)) {
    return { input: { ...none, left: dx < 0, right: dx > 0 }, arrived: false };
  }
  return { input: { ...none, up: dy < 0, down: dy > 0 }, arrived: false };
}


