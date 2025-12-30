/**
 * Small helper for the repeated “pickup/drop bobbing” tween effect.
 *
 * This wrapper exists to:
 * - Keep `WorldScene` smaller
 * - Standardize the tween parameters so different pickups feel consistent
 * - Make it easy to unit test the config we pass into `tweens.add`
 *
 * Note: This module does not import Phaser; it uses structural typing.
 */

export type TweenManagerLike = {
  add: (config: Record<string, unknown> | any) => unknown;
};

export type BobbingTweenTarget = {
  y: number;
};

/**
 * Adds a vertical bobbing tween: target oscillates from `baseY` down to `baseY - amplitudePx`.
 *
 * Defaults match the current in-game “subtle bob” look.
 */
export function addBobbingTween(
  tweens: TweenManagerLike,
  target: BobbingTweenTarget,
  args: { baseY: number; amplitudePx?: number; durationMs?: number },
): void {
  const amplitudePx = args.amplitudePx ?? 3;
  const durationMs = args.durationMs ?? 650;
  tweens.add({
    targets: target,
    y: args.baseY - amplitudePx,
    duration: durationMs,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });
}

