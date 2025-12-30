export type ArcadePhysicsLike = {
  add: {
    collider: (a: unknown, b: unknown, ...rest: unknown[]) => unknown;
  };
};

/**
 * Wire up colliders required for dynamic NPC bodies.
 *
 * NPCs were moved from a staticGroup (auto-blocking) to a dynamic group to enable wandering.
 * Dynamic bodies require explicit colliders, otherwise the player can pass through them and
 * NPCs can drift through collision tiles.
 */
export function addNpcColliders(args: {
  physics: ArcadePhysicsLike;
  player: unknown;
  npcs: unknown;
  worldLayer: unknown;
}) {
  const { physics, player, npcs, worldLayer } = args;
  physics.add.collider(player, npcs);
  physics.add.collider(npcs, worldLayer);
}

