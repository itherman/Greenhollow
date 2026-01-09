import { ITEMS, addItem, cloneInventory, removeItem, type Inventory, type ItemId } from "./inventory";

export type TradePurchaseResult =
  | { ok: true }
  | { ok: false; reason: "invalid_qty" | "insufficient_coins" | "inventory_full" };

export function attemptTradePurchase(
  inv: Inventory,
  itemId: ItemId,
  qty: number,
  priceCoins: number,
): TradePurchaseResult {
  if (!Number.isFinite(qty) || qty <= 0) return { ok: false, reason: "invalid_qty" };
  if (!Number.isFinite(priceCoins) || priceCoins < 0) return { ok: false, reason: "invalid_qty" };

  const next = cloneInventory(inv);
  const coinCost = Math.floor(priceCoins);

  if (coinCost > 0) {
    const removed = removeItem(next, "coins", coinCost);
    if (!removed) return { ok: false, reason: "insufficient_coins" };
  }

  const def = ITEMS[itemId];
  const added = addItem(next, def, Math.floor(qty));
  if (!added.ok) return { ok: false, reason: "inventory_full" };
  if (added.remaining > 0) return { ok: false, reason: "inventory_full" };

  inv.slots = next.slots;
  return { ok: true };
}
