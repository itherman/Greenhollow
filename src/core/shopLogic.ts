import {
  ITEMS,
  addItem,
  cloneInventory,
  getItemCount,
  removeItem,
  type Inventory,
  type ItemId,
  type ItemStack,
} from "./inventory";
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

export type SellOfferResult = { ok: true; coins: number } | { ok: false; reason: "no_value" };

export function getSellOffer(stack: ItemStack): SellOfferResult {
  const entry = getShopEntry(stack.id);
  if (!entry) return { ok: false, reason: "no_value" };
  const coins = Math.floor((entry.priceCoins * stack.qty) / (entry.grantQty * 2));
  if (coins <= 0) return { ok: false, reason: "no_value" };
  return { ok: true, coins };
}

export type SellResult =
  | { ok: true; coins: number; soldItemId: ItemId; soldQty: number }
  | { ok: false; reason: "empty_slot" | "no_value" | "inventory_full" };

export function attemptSaleFromSlot(inv: Inventory, slotIndex: number): SellResult {
  const existing = inv.slots[slotIndex];
  if (!existing) return { ok: false, reason: "empty_slot" };

  const offer = getSellOffer(existing);
  if (!offer.ok) return { ok: false, reason: offer.reason };

  const next = cloneInventory(inv);
  next.slots[slotIndex] = null;
  const added = addItem(next, ITEMS.coins, offer.coins);
  if (!added.ok || added.remaining > 0) return { ok: false, reason: "inventory_full" };

  inv.slots = next.slots;
  return { ok: true, coins: offer.coins, soldItemId: existing.id, soldQty: existing.qty };
}

