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

export function attemptPurchase(inv: Inventory, itemId: ItemId, quantity = 1): PurchaseResult {
  const entry = getShopEntry(itemId);
  if (!entry) return { ok: false, reason: "unknown_item" };
  const purchaseQty = Math.max(1, Math.floor(quantity));
  const totalPrice = entry.priceCoins * purchaseQty;
  const totalQty = entry.grantQty * purchaseQty;
  const coins = getItemCount(inv, "coins");
  if (coins < totalPrice) return { ok: false, reason: "insufficient_coins" };
  if (totalPrice > 0) {
    const removed = removeItem(inv, "coins", totalPrice);
    if (!removed) return { ok: false, reason: "insufficient_coins" };
  }

  const def = ITEMS[itemId];
  const added = addItem(inv, def, totalQty);
  if (!added.ok) {
    // revert coins best-effort
    if (totalPrice > 0) addItem(inv, ITEMS.coins, totalPrice);
    return { ok: false, reason: "inventory_full" };
  }
  if (added.remaining > 0) {
    // Revert partial add: remove what was added and refund coins.
    removeItem(inv, itemId, totalQty - added.remaining);
    if (totalPrice > 0) addItem(inv, ITEMS.coins, totalPrice);
    return { ok: false, reason: "inventory_full" };
  }
  return { ok: true };
}

export type SellOfferResult = { ok: true; coins: number } | { ok: false; reason: "no_value" };

export function getSellOffer(stack: ItemStack): SellOfferResult {
  return getSellOfferForQty(stack, stack.qty);
}

export function getSellOfferForQty(stack: ItemStack, qty: number): SellOfferResult {
  const entry = getShopEntry(stack.id);
  if (!entry) return { ok: false, reason: "no_value" };
  if (!Number.isFinite(qty) || qty <= 0 || qty > stack.qty) return { ok: false, reason: "no_value" };
  const coins = Math.floor((entry.priceCoins * qty) / (entry.grantQty * 2));
  if (coins <= 0) return { ok: false, reason: "no_value" };
  return { ok: true, coins };
}

export type SellResult =
  | { ok: true; coins: number; soldItemId: ItemId; soldQty: number }
  | { ok: false; reason: "empty_slot" | "no_value" | "inventory_full" };

export function attemptSaleFromSlot(inv: Inventory, slotIndex: number, quantity?: number): SellResult {
  const existing = inv.slots[slotIndex];
  if (!existing) return { ok: false, reason: "empty_slot" };

  const sellQty = Math.max(1, Math.floor(quantity ?? existing.qty));
  if (sellQty > existing.qty) return { ok: false, reason: "no_value" };

  const offer = getSellOfferForQty(existing, sellQty);
  if (!offer.ok) return { ok: false, reason: offer.reason };

  const next = cloneInventory(inv);
  const nextSlot = next.slots[slotIndex];
  if (!nextSlot) return { ok: false, reason: "empty_slot" };
  nextSlot.qty -= sellQty;
  if (nextSlot.qty <= 0) next.slots[slotIndex] = null;
  const added = addItem(next, ITEMS.coins, offer.coins);
  if (!added.ok || added.remaining > 0) return { ok: false, reason: "inventory_full" };

  inv.slots = next.slots;
  return { ok: true, coins: offer.coins, soldItemId: existing.id, soldQty: sellQty };
}
