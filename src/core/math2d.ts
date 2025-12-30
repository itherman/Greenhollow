/**
 * 2D math helpers used across the game logic.
 *
 * These helpers are intentionally **framework-agnostic** (no Phaser types) so they can be reused
 * in pure logic modules and unit-tested in a Node environment.
 */

/**
 * Returns squared Euclidean distance between two points.
 *
 * Why squared?
 * - Comparing distances often only needs ordering or range checks.
 * - Squared distance avoids the expensive `Math.sqrt`.
 *
 * Example:
 * - Instead of `distance(a, b) <= r`, do `dist2(a, b) <= r*r`.
 */
export function dist2(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

