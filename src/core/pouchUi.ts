/**
 * Helpers for pouch UI lifecycle.
 *
 * Kept framework-agnostic so we can unit test without Phaser.
 */
export type MinimalUiObj = {
  active?: boolean;
  destroy?: () => void;
};

/**
 * Returns true when pouch UI should be rebuilt (missing or destroyed).
 */
export function needsPouchUiRebuild(icon?: MinimalUiObj, hit?: MinimalUiObj): boolean {
  return !icon || !hit || icon.active === false || hit.active === false;
}

/**
 * Player self-tap should not open the inventory (mobile mis-taps during combat).
 */
export function shouldAllowPlayerTapInventory(): boolean {
  return false;
}


