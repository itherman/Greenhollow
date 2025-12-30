import type { Direction } from "../../../core/movement";
import { computeHeldSwordPose } from "../../../core/swordVisual";
import { getMeleeWeaponStats } from "../../../core/shopCatalog";

/**
 * “Held item” rendering for `WorldScene`.
 *
 * `WorldScene` has a lot of gameplay state, but the held-item visuals are fairly mechanical:
 * - If holding a melee weapon, render that weapon using the same pose system as the slash visuals.
 * - If holding a bow, render the bow with fixed offsets/rotations per facing.
 * - If holding nothing, hide the held item sprite (but keep it allocated for reuse).
 *
 * This module exists to keep `WorldScene.ts` smaller and to standardize the visuals so other
 * scenes (or future player sprites) can reuse the same logic.
 */

export type HeldItemPose = { dx: number; dy: number; rotation: number };

/**
 * Structural types so this module can run in Node tests without importing Phaser.
 *
 * Phaser objects are structurally compatible with these shapes.
 */
export type SceneLike = {
  add: { sprite: (x: number, y: number, textureKey: string) => SpriteLike };
};

export type CameraLike = { ignore: (obj: unknown) => void };

export type SpriteLike = {
  x: number;
  y: number;
  setOrigin: (x: number, y: number) => SpriteLike;
  setTexture: (key: string) => SpriteLike;
  setPosition: (x: number, y: number) => SpriteLike;
  setScale: (scale: number) => SpriteLike;
  setRotation: (rotation: number) => SpriteLike;
  setDepth: (depth: number) => SpriteLike;
  setVisible: (visible: boolean) => SpriteLike;
};

/**
 * Pure pose for bow rendering (no Phaser dependency).
 *
 * Kept separate so it can be unit-tested and reused by other UI/preview contexts.
 */
export function computeHeldBowPose(facing: Exclude<Direction, "none">): HeldItemPose {
  // These values match the prior inline `offsets` map in `WorldScene.update()`.
  switch (facing) {
    case "up":
      return { dx: 0, dy: -4, rotation: -Math.PI / 2 };
    case "down":
      return { dx: 0, dy: 6, rotation: Math.PI / 2 };
    case "left":
      return { dx: -6, dy: 0, rotation: Math.PI };
    case "right":
      return { dx: 6, dy: 0, rotation: 0 };
  }
}

/**
 * Updates (or lazily creates) the held-item sprite and applies transforms.
 *
 * Returns the (possibly newly created) held item sprite reference.
 *
 * Notes:
 * - `uiCam.ignore(sprite)` is applied when the sprite is created so it stays in world space.
 * - The held item depth is kept slightly in front of the player (`playerY + 1`) to avoid
 *   the weapon disappearing “into” the body.
 */
export function renderHeldItem(args: {
  scene: SceneLike;
  uiCam: CameraLike;
  player: { x: number; y: number };
  facing: Exclude<Direction, "none">;
  heldItemId?: string;
  heldItemSprite?: SpriteLike;
  slashSwordSprite?: SpriteLike;
}): SpriteLike | undefined {
  const { scene, uiCam, player, facing, heldItemId, slashSwordSprite } = args;
  let { heldItemSprite } = args;

  const meleeStats = heldItemId ? getMeleeWeaponStats(heldItemId) : null;
  if (meleeStats) {
    if (!heldItemSprite) {
      heldItemSprite = scene.add.sprite(player.x, player.y, meleeStats.textureKey);
      heldItemSprite.setOrigin(0.5, 0.9);
      uiCam.ignore(heldItemSprite);
    } else {
      heldItemSprite.setTexture(meleeStats.textureKey);
    }

    const pose = computeHeldSwordPose(facing);
    heldItemSprite
      .setPosition(player.x + pose.dx, player.y + pose.dy)
      .setOrigin(pose.originX, pose.originY)
      .setScale(pose.scale)
      .setRotation(pose.rotation);
    heldItemSprite.setDepth(player.y + 1);
    // If we're mid-slash, the held sprite stays hidden (slash sprite is shown instead).
    if (!slashSwordSprite) heldItemSprite.setVisible(true);
    return heldItemSprite;
  }

  if (heldItemId === "bow") {
    if (!heldItemSprite) {
      heldItemSprite = scene.add.sprite(player.x, player.y, "item_bow");
      heldItemSprite.setOrigin(0.5, 0.9);
      uiCam.ignore(heldItemSprite);
    } else {
      heldItemSprite.setTexture("item_bow");
    }

    const pose = computeHeldBowPose(facing);
    heldItemSprite
      .setPosition(player.x + pose.dx, player.y + pose.dy)
      .setOrigin(0.5, 0.9)
      .setScale(1)
      .setRotation(pose.rotation);
    heldItemSprite.setDepth(player.y + 1);
    heldItemSprite.setVisible(true);
    return heldItemSprite;
  }

  if (heldItemSprite) heldItemSprite.setVisible(false);
  return heldItemSprite;
}

/**
 * Keeps the slash sprite anchored to the player hand while its rotation tween runs.
 *
 * This preserves the prior behavior from `WorldScene.update()` and makes it reusable.
 */
export function anchorSlashSprite(args: {
  slashSwordSprite?: SpriteLike;
  player: { x: number; y: number };
  facing: Exclude<Direction, "none">;
}): void {
  const { slashSwordSprite, player, facing } = args;
  if (!slashSwordSprite) return;
  const pose = computeHeldSwordPose(facing);
  slashSwordSprite.setPosition(player.x + pose.dx, player.y + pose.dy);
  slashSwordSprite.setDepth(player.y + 5);
}

