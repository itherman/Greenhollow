export type SpriteWithOptionalBody = {
  y: number;
  body?: { bottom: number };
};

/**
 * Returns a depth value that approximates "feet" position for top-down sorting.
 * Using `y` (sprite center) can cause entities to render behind door/house edges
 * when they are visually in front, especially for taller sprites with a foot hitbox.
 */
export function getFeetDepth(s: SpriteWithOptionalBody): number {
  return s.body?.bottom ?? s.y;
}

