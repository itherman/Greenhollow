import type { Inventory } from "./inventory";
import type { ItemId } from "./inventory";
import { cloneInventory } from "./inventory";
import { getFoodHeal, isFoodItem } from "./shopCatalog";
import { applyHeal } from "./hp";

export type DigestFoodResult =
  | { ok: true; healed: number; nextHp: number; consumed: { itemId: ItemId; healHp: number } }
  | { ok: false; reason: "invalid_slot" | "empty_slot" | "not_food" | "already_full" };

/**
 * Consumes exactly 1 food item from a specific inventory slot and heals the player.
 *
 * Notes:
 * - This mutates `inv` (consistent with `addItem/removeItem` in `inventory.ts`).
 * - If the player is already at full HP, the food is NOT consumed.
 */
export function digestFoodFromInventorySlot(args: {
  inv: Inventory;
  slotIndex: number;
  hp: number;
  maxHp: number;
}): DigestFoodResult {
  const { inv, slotIndex, hp, maxHp } = args;
  if (!Number.isFinite(slotIndex)) return { ok: false, reason: "invalid_slot" };
  const i = Math.floor(slotIndex);
  if (i < 0 || i >= inv.slots.length) return { ok: false, reason: "invalid_slot" };
  const s = inv.slots[i];
  if (!s) return { ok: false, reason: "empty_slot" };
  if (!isFoodItem(s.id)) return { ok: false, reason: "not_food" };
  if (hp >= maxHp) return { ok: false, reason: "already_full" };

  const healHp = getFoodHeal(s.id);
  if (healHp <= 0) return { ok: false, reason: "not_food" };

  const next = cloneInventory(inv);
  const cur = next.slots[i];
  if (!cur) return { ok: false, reason: "empty_slot" };
  // Guard against corrupted data.
  if (cur.qty <= 0) return { ok: false, reason: "empty_slot" };

  cur.qty -= 1;
  if (cur.qty <= 0) next.slots[i] = null;
  inv.slots = next.slots;

  const r = applyHeal({ hp, maxHp, heal: healHp });
  return { ok: true, healed: r.healed, nextHp: r.hp, consumed: { itemId: s.id, healHp } };
}

