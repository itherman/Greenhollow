import { createInventory, inventoryFromJSON, inventoryToJSON, type Inventory } from "../../core/inventory";

const KEY = "game.inventory.v1";

function storage(): Storage | null {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return window.localStorage ?? null;
}

export function loadInventory(st: Storage | null = storage()): Inventory {
  if (!st) return createInventory();
  const raw = st.getItem(KEY);
  if (!raw) return createInventory();
  return inventoryFromJSON(raw, 20);
}

export function saveInventory(inv: Inventory, st: Storage | null = storage()): void {
  if (!st) return;
  st.setItem(KEY, inventoryToJSON(inv));
}

export function clearInventory(st: Storage | null = storage()): void {
  if (!st) return;
  st.removeItem(KEY);
}


