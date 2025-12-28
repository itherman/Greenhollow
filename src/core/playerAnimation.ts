import type { Direction } from "./movement";

export type PlayerAnim =
  | { type: "walk"; key: "walk-up" | "walk-down" | "walk-left" | "walk-right" }
  | { type: "idle"; frame: number };

/**
 * Our generated sprite sheet layout:
 * rows (0..3): down, left, right, up
 * cols (0..3): walk frames
 *
 * Idle frame is col=0 of the facing row.
 */
export function getPlayerAnim(facing: Exclude<Direction, "none">, moving: boolean): PlayerAnim {
  if (moving) {
    return {
      type: "walk",
      key:
        facing === "up"
          ? "walk-up"
          : facing === "down"
            ? "walk-down"
            : facing === "left"
              ? "walk-left"
              : "walk-right",
    };
  }

  const row = facing === "down" ? 0 : facing === "left" ? 1 : facing === "right" ? 2 : 3;
  return { type: "idle", frame: row * 4 + 0 };
}


