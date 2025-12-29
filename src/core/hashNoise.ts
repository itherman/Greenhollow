/**
 * Tiny deterministic hash-based noise. No RNG state, stable across runs.
 * Returns a float in [0, 1).
 */
export function hash2d01(x: number, y: number, seed = 0): number {
  // Force int32
  let h = (x | 0) * 374761393 + (y | 0) * 668265263 + (seed | 0) * 1442695041;
  h = (h ^ (h >>> 13)) | 0;
  h = (h * 1274126177) | 0;
  h = (h ^ (h >>> 16)) | 0;
  // Convert to unsigned and scale
  return ((h >>> 0) % 1_000_000) / 1_000_000;
}


