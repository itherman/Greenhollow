/**
 * Helpers for configuring Arcade Physics bodies in a consistent way.
 *
 * These are written with structural typing (not Phaser imports) so they can be unit-tested in Node.
 */

/**
 * Minimal subset of the Arcade Body API used by our config helpers.
 *
 * Phaser's real `Phaser.Physics.Arcade.Body` is structurally compatible with this interface.
 */
export type ArcadeBodyLike = {
  setAllowGravity: (allow: boolean) => unknown;
  setImmovable: (immovable: boolean) => unknown;
  setSize: (width: number, height: number) => unknown;
  setOffset: (x: number, y: number) => unknown;
};

export type Hitbox = {
  w: number;
  h: number;
  offsetX: number;
  offsetY: number;
};

/**
 * Configures a body to behave like a static pickup/drop:
 * - No gravity (it shouldn't fall)
 * - Immovable (player bumping into it shouldn't push it around)
 * - Consistent hitbox sizing + offset
 *
 * This standardizes repeated configuration in `WorldScene` for hearts, coin drops, etc.
 */
export function configureStaticPickupBody(body: ArcadeBodyLike, hitbox: Hitbox): void {
  body.setAllowGravity(false);
  body.setImmovable(true);
  body.setSize(hitbox.w, hitbox.h);
  body.setOffset(hitbox.offsetX, hitbox.offsetY);
}

