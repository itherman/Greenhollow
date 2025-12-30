import type { ItemId, Inventory } from "./inventory";
import { isArmorItem, isMeleeWeapon } from "./shopCatalog";

export type EquipmentState = {
  heldItemId: ItemId | null;
  headArmorItemId: ItemId | null;
  bodyArmorItemId: ItemId | null;
  legArmorItemId: ItemId | null;
};

export function createEquipment(): EquipmentState {
  return { heldItemId: null, headArmorItemId: null, bodyArmorItemId: null, legArmorItemId: null };
}

export type ToggleEquipResult =
  | { ok: true; next: EquipmentState }
  | { ok: false; reason: "invalid_slot" | "empty_slot" | "not_equippable" };

export type EquipmentSlot = "held" | "head" | "body" | "legs";

function isHeldToolOrWeapon(id: ItemId): boolean {
  // "Held" is for weapons/tools only; food/ammo/currency should not be equip-able.
  return isMeleeWeapon(id) || id === "bow" || id === "rusty_key";
}

function getArmorSlotForItemId(id: ItemId): Exclude<EquipmentSlot, "held"> | null {
  // Currently the game only has chest/body armor items.
  // Keep this mapping explicit so new armor types can be added without relying on naming conventions.
  if (id === "leather_armor" || id === "iron_armor") return "body";
  return null;
}

/**
 * Toggle-equip the item in a given inventory slot.
 * - If the slot is empty -> error
 * - If the slot item is armor -> toggles the appropriate armor slot
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

  if (isArmorItem(s.id)) {
    const armorSlot = getArmorSlotForItemId(s.id);
    // If catalog says "armor" but we don't know where it goes yet, treat it like a held item.
    if (!armorSlot) {
      if (!isHeldToolOrWeapon(s.id)) return { ok: false, reason: "not_equippable" };
      const heldItemId = equipment.heldItemId === s.id ? null : s.id;
      return { ok: true, next: { ...equipment, heldItemId } };
    }

    if (armorSlot === "head") {
      const headArmorItemId = equipment.headArmorItemId === s.id ? null : s.id;
      return { ok: true, next: { ...equipment, headArmorItemId } };
    }
    if (armorSlot === "body") {
      const bodyArmorItemId = equipment.bodyArmorItemId === s.id ? null : s.id;
      return { ok: true, next: { ...equipment, bodyArmorItemId } };
    }
    const legArmorItemId = equipment.legArmorItemId === s.id ? null : s.id;
    return { ok: true, next: { ...equipment, legArmorItemId } };
  }

  if (!isHeldToolOrWeapon(s.id)) return { ok: false, reason: "not_equippable" };
  const heldItemId = equipment.heldItemId === s.id ? null : s.id;
  return { ok: true, next: { ...equipment, heldItemId } };
}


