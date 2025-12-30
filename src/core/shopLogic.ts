import { ITEMS, addItem, getItemCount, removeItem, type Inventory, type ItemId } from "./inventory";
import { getShopEntry } from "./shopCatalog";

export type PurchaseResult =
  | { ok: true }
  | { ok: false; reason: "unknown_item" | "insufficient_coins" | "inventory_full" };

export function attemptPurchase(inv: Inventory, itemId: ItemId): PurchaseResult {
  const entry = getShopEntry(itemId);
  if (!entry) return { ok: false, reason: "unknown_item" };
  const coins = getItemCount(inv, "coins");
  if (coins < entry.priceCoins) return { ok: false, reason: "insufficient_coins" };
  if (entry.priceCoins > 0) {
    const removed = removeItem(inv, "coins", entry.priceCoins);
    if (!removed) return { ok: false, reason: "insufficient_coins" };
  }

  const def = ITEMS[itemId];
  const qty = entry.grantQty;
  const added = addItem(inv, def, qty);
  if (!added.ok) {
    // revert coins best-effort
    if (entry.priceCoins > 0) addItem(inv, ITEMS.coins, entry.priceCoins);
    return { ok: false, reason: "inventory_full" };
  }
  if (added.remaining > 0) {
    // Revert partial add: remove what was added and refund coins.
    removeItem(inv, itemId, qty - added.remaining);
    if (entry.priceCoins > 0) addItem(inv, ITEMS.coins, entry.priceCoins);
    return { ok: false, reason: "inventory_full" };
  }
  return { ok: true };
}


