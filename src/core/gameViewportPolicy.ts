export type GameBaseSize = { width: number; height: number };

/**
 * World policy: no crop (letterboxing OK).
 *
 * To avoid the world feeling tiny on tall portrait viewports while still using
 * Phaser Scale.FIT, we switch the *base resolution* to match orientation:
 * - landscape: 960×540 (16:9)
 * - portrait: 540×960 (9:16)
 */
export function computeGameBaseSize(viewportWpx: number, viewportHpx: number): GameBaseSize {
  const vw = Math.max(0, viewportWpx || 0);
  const vh = Math.max(0, viewportHpx || 0);
  const isPortrait = vh > vw;
  return isPortrait ? { width: 540, height: 960 } : { width: 960, height: 540 };
}


