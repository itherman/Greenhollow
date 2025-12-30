import { getItemCount, type Inventory } from "../core/inventory";

/**
 * Pure helper for the shop UI: returns the label shown while shopping.
 * Kept separate so it can be unit-tested without Phaser.
 */
export function getShopCoinsLabel(inv: Inventory): string {
  const coinsRaw = getItemCount(inv, "coins");
  const coins = Number.isFinite(coinsRaw) ? Math.max(0, Math.floor(coinsRaw)) : 0;
  return `Coins: ${coins}`;
}

