import type { ItemId, Inventory } from "./inventory";

export type EquipmentState = {
  heldItemId: ItemId | null;
};

export function createEquipment(): EquipmentState {
  return { heldItemId: null };
}

export type ToggleEquipResult =
  | { ok: true; next: EquipmentState }
  | { ok: false; reason: "invalid_slot" | "empty_slot" };

/**
 * Toggle-equip the item in a given inventory slot.
 * - If the slot is empty -> error
 * - If the slot item is already held -> unequip (heldItemId=null)
 * - Otherwise -> hold that item id
 */
export function toggleEquipFromInventorySlot(
  equipment: EquipmentState,
  inv: Inventory,
  slotIndex: number,
): ToggleEquipResult {
  if (!Number.isFinite(slotIndex)) return { ok: false, reason: "invalid_slot" };
  const i = Math.floor(slotIndex);
  if (i < 0 || i >= inv.slots.length) return { ok: false, reason: "invalid_slot" };
  const s = inv.slots[i];
  if (!s) return { ok: false, reason: "empty_slot" };

  const heldItemId = equipment.heldItemId === s.id ? null : s.id;
  return { ok: true, next: { heldItemId } };
}


