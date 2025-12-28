import type { Direction } from "./movement";

export type SwordPose = {
  // Offset from player sprite center (world pixels)
  dx: number;
  dy: number;
  // Rotation in radians (Phaser uses radians)
  rotation: number;
  // Origin for handle pivot
  originX: number;
  originY: number;
  // Scale multiplier for the sword sprite
  scale: number;
};

export type SwordSwing = {
  startRotation: number;
  endRotation: number;
  durationMs: number;
};

const ORIGIN_HANDLE = { originX: 0.5, originY: 0.9 };

/**
 * Idle/held sword pose anchored to the player's hand.
 * The sword texture points "up" at rotation=0 (blade up).
 */
export function computeHeldSwordPose(facing: Exclude<Direction, "none">): SwordPose {
  const scale = 0.85;
  if (facing === "down") return { dx: 7, dy: 6, rotation: Math.PI * 0.8, ...ORIGIN_HANDLE, scale };
  if (facing === "up") return { dx: -7, dy: -6, rotation: Math.PI * 0.2, ...ORIGIN_HANDLE, scale };
  if (facing === "left") return { dx: -9, dy: 2, rotation: -Math.PI / 2, ...ORIGIN_HANDLE, scale };
  return { dx: 9, dy: 2, rotation: Math.PI / 2, ...ORIGIN_HANDLE, scale };
}

/**
 * Sword swing arc (rotation tween) around the handle pivot.
 * The slash sprite should be positioned at the same hand pivot as the held sword.
 */
export function computeSwordSwing(facing: Exclude<Direction, "none">): SwordSwing {
  const durationMs = 140;
  // These arcs are intentionally exaggerated for readability.
  if (facing === "right") return { startRotation: -Math.PI / 6, endRotation: Math.PI / 3, durationMs };
  if (facing === "left") return { startRotation: Math.PI + Math.PI / 6, endRotation: Math.PI - Math.PI / 3, durationMs };
  if (facing === "up") return { startRotation: Math.PI * 1.3, endRotation: Math.PI * 0.7, durationMs };
  return { startRotation: Math.PI * 0.7, endRotation: Math.PI * 1.3, durationMs };
}


