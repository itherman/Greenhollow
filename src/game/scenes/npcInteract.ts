import { dist2 } from "../../core/math2d";

export type NpcDialogSpriteLike = {
  x: number;
  y: number;
  npcDef?: { dialogScriptId?: string };
};

/**
 * Picks which NPC should receive an interaction.
 *
 * - If `scriptId` is provided (tap intent), we pick the NPC with that script that is closest
 *   to the tap target (so tapping a far NPC won't accidentally interact with a nearby one).
 * - Otherwise (keyboard/auto), we pick the nearest NPC to the player.
 *
 * Returns `null` when the chosen NPC is not within `rangePx` of the player.
 */
export function pickNpcForDialog(args: {
  player: { x: number; y: number };
  npcs: NpcDialogSpriteLike[];
  rangePx: number;
  scriptId?: string;
  tapTarget?: { x: number; y: number };
}): NpcDialogSpriteLike | null {
  const { player, npcs, rangePx, scriptId, tapTarget } = args;
  const range2 = rangePx * rangePx;

  const eligible = scriptId
    ? npcs.filter((n) => n.npcDef?.dialogScriptId === scriptId)
    : npcs.filter((n) => !!n.npcDef?.dialogScriptId);

  if (eligible.length === 0) return null;

  const anchor = scriptId ? (tapTarget ?? player) : player;

  let best: NpcDialogSpriteLike | null = null;
  let bestD2 = Number.POSITIVE_INFINITY;
  for (const n of eligible) {
    const d2 = dist2(anchor, n);
    if (d2 < bestD2) {
      bestD2 = d2;
      best = n;
    }
  }

  if (!best) return null;
  if (dist2(player, best) > range2) return null;
  return best;
}

