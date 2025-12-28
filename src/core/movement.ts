export type Direction = "up" | "down" | "left" | "right" | "none";

export type MovementInput = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
};

export type MovementResult = {
  vx: number;
  vy: number;
  facing: Exclude<Direction, "none">;
  moving: boolean;
};

/**
 * Zelda/Pokémon-ish MVP movement:
 * - no diagonal movement
 * - horizontal wins over vertical if both are pressed
 */
export function computeMovement(
  input: MovementInput,
  speed: number,
  lastFacing: Exclude<Direction, "none"> = "down",
): MovementResult {
  const horizontal = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  const vertical = (input.up ? -1 : 0) + (input.down ? 1 : 0);

  if (horizontal !== 0) {
    const facing: Exclude<Direction, "none"> = horizontal < 0 ? "left" : "right";
    return { vx: horizontal * speed, vy: 0, facing, moving: true };
  }

  if (vertical !== 0) {
    const facing: Exclude<Direction, "none"> = vertical < 0 ? "up" : "down";
    return { vx: 0, vy: vertical * speed, facing, moving: true };
  }

  return { vx: 0, vy: 0, facing: lastFacing, moving: false };
}


