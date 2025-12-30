/**
 * Arcade physics tuning for reliable collisions with tilemaps.
 *
 * `tileBias` helps prevent fast / small bodies (like arrows) from tunneling through tiles
 * during frame spikes by expanding the tile separation check distance.
 */
export const ARCADE_TILE_BIAS = 64;

/**
 * Arrow hitbox sizing. Keep it slightly thicker than the visual so it reliably hits walls.
 * Sprite frame is 16x6.
 */
export const ARROW_HITBOX = {
  w: 14,
  h: 6,
  offsetX: 1,
  offsetY: 0,
} as const;


