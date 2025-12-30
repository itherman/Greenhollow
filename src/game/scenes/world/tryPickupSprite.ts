import { dist2 } from "../../../core/math2d";

/**
 * Minimal sprite shape needed for world pickup logic.
 *
 * This is intentionally NOT a Phaser type so this helper can be unit-tested without Phaser.
 * `WorldScene` can pass Phaser sprites because they are structurally compatible.
 */
export type PickupSpriteLike = {
  active: boolean;
  x: number;
  y: number;
  destroy: () => void;
};

/**
 * Attempts to "pick up" a sprite if it is active and within range of the player.
 *
 * This helper standardizes the repeated pattern in `WorldScene`:
 * - Validate sprite is present and active
 * - Validate player is within interaction range
 * - Execute a caller-provided side effect (`onPickup`) exactly once
 *
 * Important:
 * - This function does **not** destroy the sprite automatically; that stays inside `onPickup`
 *   so callers can decide ordering (e.g. set flags first, play SFX, update UI, etc.).
 */
export function tryPickupSprite(args: {
  player: { x: number; y: number };
  sprite?: PickupSpriteLike;
  rangePx: number;
  onPickup: () => void;
}): boolean {
  const { player, sprite, rangePx, onPickup } = args;
  if (!sprite?.active) return false;
  const range2 = rangePx * rangePx;
  if (dist2(player, sprite) > range2) return false;
  onPickup();
  return true;
}

