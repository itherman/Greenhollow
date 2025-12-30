import type { ItemId, Inventory } from "./inventory";

export type EquipmentState = {
  heldItemId: ItemId | null;
  armorItemId: ItemId | null;
};

export function createEquipment(): EquipmentState {
  return { heldItemId: null, armorItemId: null };
}

export type ToggleEquipResult =
  | { ok: true; next: EquipmentState }
  | { ok: false; reason: "invalid_slot" | "empty_slot" };

function isArmorItemId(id: ItemId): boolean {
  return id === "leather_armor" || id === "iron_armor";
}

/**
 * Toggle-equip the item in a given inventory slot.
 * - If the slot is empty -> error
 * - If the slot item is armor -> toggles armor slot
 * - Otherwise -> toggles held item slot
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

  if (isArmorItemId(s.id)) {
    const armorItemId = equipment.armorItemId === s.id ? null : s.id;
    return { ok: true, next: { ...equipment, armorItemId } };
  }

  const heldItemId = equipment.heldItemId === s.id ? null : s.id;
  return { ok: true, next: { ...equipment, heldItemId } };
}


