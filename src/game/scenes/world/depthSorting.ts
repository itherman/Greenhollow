import type { SpriteWithOptionalBody } from "../depthSort";

/**
 * Small depth-sorting helpers used by `WorldScene`.
 *
 * These helpers are intentionally structural / framework-agnostic:
 * - They do not import Phaser types
 * - They can operate on any object with `y` and `setDepth(...)`
 * - They are unit-testable in Node
 */

export type DepthSettable = {
  y: number;
  setDepth: (depth: number) => unknown;
};

/**
 * Depth-sets a single object to match its `y` coordinate.
 *
 * This is the standard approach for top-down sorting of small sprites like drops/projectiles.
 */
export function depthSortByY(obj: DepthSettable | undefined | null): void {
  if (!obj) return;
  obj.setDepth(obj.y);
}

/**
 * Depth-sorts a list of objects by setting each depth to its `y` coordinate.
 */
export function depthSortManyByY(objs: Array<DepthSettable | undefined | null>): void {
  for (const obj of objs) depthSortByY(obj);
}

/**
 * Depth-sorts a list of sprites using a caller-provided “feet depth” function.
 *
 * This is used for tall sprites (player/NPCs) where center `y` can cause visual overlap issues.
 */
export function depthSortManyByFeet<T extends DepthSettable & SpriteWithOptionalBody>(
  objs: Array<T | undefined | null>,
  getFeetDepth: (s: SpriteWithOptionalBody) => number,
): void {
  for (const obj of objs) {
    if (!obj) continue;
    obj.setDepth(getFeetDepth(obj));
  }
}

