export type ItemId =
  | "coins"
  | "rusty_key"
  | "troll_key"
  | "sword"
  | "bow"
  | "arrows"
  | "dagger"
  | "longsword"
  | "spear"
  | "bread"
  | "stew"
  | "leather_armor"
  | "iron_armor"
  | "mythril_helm"
  | "mythril_leggings"
  | "mythril_armor";

export type ItemStack = {
  id: ItemId;
  name: string;
  qty: number;
  maxStack: number;
};

export type Inventory = {
  size: number;
  slots: Array<ItemStack | null>;
};

export type AddItemResult =
  | { ok: true; remaining: 0 }
  | { ok: true; remaining: number }
  | { ok: false; reason: "invalid_qty" };

export function createInventory(size = 20): Inventory {
  return { size, slots: Array.from({ length: size }, () => null) };
}

export function cloneInventory(inv: Inventory): Inventory {
  return { size: inv.size, slots: inv.slots.map((s) => (s ? { ...s } : null)) };
}

export function addItem(inv: Inventory, item: Omit<ItemStack, "qty">, qty: number): AddItemResult {
  if (!Number.isFinite(qty) || qty <= 0) return { ok: false, reason: "invalid_qty" };
  let remaining = Math.floor(qty);
  const next = cloneInventory(inv);

  // Fill existing stacks first
  for (let i = 0; i < next.slots.length && remaining > 0; i++) {
    const s = next.slots[i];
    if (!s || s.id !== item.id) continue;
    const space = s.maxStack - s.qty;
    if (space <= 0) continue;
    const take = Math.min(space, remaining);
    s.qty += take;
    remaining -= take;
  }

  // Create new stacks
  for (let i = 0; i < next.slots.length && remaining > 0; i++) {
    if (next.slots[i]) continue;
    const take = Math.min(item.maxStack, remaining);
    next.slots[i] = { ...item, qty: take };
    remaining -= take;
  }

  inv.slots = next.slots;
  return { ok: true, remaining };
}

export function removeItem(inv: Inventory, itemId: ItemId, qty: number): boolean {
  if (!Number.isFinite(qty) || qty <= 0) return false;
  let remaining = Math.floor(qty);
  const next = cloneInventory(inv);

  for (let i = 0; i < next.slots.length && remaining > 0; i++) {
    const s = next.slots[i];
    if (!s || s.id !== itemId) continue;
    const take = Math.min(s.qty, remaining);
    s.qty -= take;
    remaining -= take;
    if (s.qty <= 0) next.slots[i] = null;
  }

  if (remaining > 0) return false;
  inv.slots = next.slots;
  return true;
}

export function inventoryToJSON(inv: Inventory): string {
  return JSON.stringify({ size: inv.size, slots: inv.slots });
}

export function inventoryFromJSON(raw: string, fallbackSize = 20): Inventory {
  try {
    const parsed = JSON.parse(raw) as Inventory;
    if (!parsed || typeof parsed !== "object") return createInventory(fallbackSize);
    if (typeof parsed.size !== "number" || !Array.isArray(parsed.slots)) return createInventory(fallbackSize);
    const size = Math.max(1, Math.min(200, Math.floor(parsed.size)));
    const inv = createInventory(size);
    for (let i = 0; i < size; i++) {
      const s = parsed.slots[i] as ItemStack | null | undefined;
      if (!s) continue;
      if (typeof s.id !== "string" || typeof s.name !== "string") continue;
      if (typeof s.qty !== "number" || typeof s.maxStack !== "number") continue;
      if (s.qty <= 0 || s.maxStack <= 0) continue;
      inv.slots[i] = { ...s, qty: Math.min(Math.floor(s.qty), Math.floor(s.maxStack)) };
    }
    return inv;
  } catch {
    return createInventory(fallbackSize);
  }
}

export const ITEMS: Record<ItemId, Omit<ItemStack, "qty">> = {
  coins: { id: "coins", name: "Coins", maxStack: 999 },
  rusty_key: { id: "rusty_key", name: "Rusty Key", maxStack: 1 },
  troll_key: { id: "troll_key", name: "Troll's Key", maxStack: 1 },
  sword: { id: "sword", name: "Sword", maxStack: 1 },
  bow: { id: "bow", name: "Bow", maxStack: 1 },
  arrows: { id: "arrows", name: "Arrows", maxStack: 999 },
  dagger: { id: "dagger", name: "Dagger", maxStack: 1 },
  longsword: { id: "longsword", name: "Longsword", maxStack: 1 },
  spear: { id: "spear", name: "Spear", maxStack: 1 },
  bread: { id: "bread", name: "Bread", maxStack: 20 },
  stew: { id: "stew", name: "Stew", maxStack: 10 },
  leather_armor: { id: "leather_armor", name: "Leather Armor", maxStack: 1 },
  iron_armor: { id: "iron_armor", name: "Iron Armor", maxStack: 1 },
  mythril_helm: { id: "mythril_helm", name: "Mythril Helm", maxStack: 1 },
  mythril_leggings: { id: "mythril_leggings", name: "Mythril Leggings", maxStack: 1 },
  mythril_armor: { id: "mythril_armor", name: "Mythril Armor", maxStack: 1 },
};

export function getItemCount(inv: Inventory, itemId: ItemId): number {
  return inv.slots.reduce((sum, s) => (s?.id === itemId ? sum + s.qty : sum), 0);
}
