import { describe, expect, it } from "vitest";
import { ITEMS, addItem, createInventory, getItemCount } from "./inventory";
import { attemptPurchase, attemptSaleFromSlot, getSellOffer } from "./shopLogic";

describe("shopLogic", () => {
  it("fails when insufficient coins", () => {
    const inv = createInventory(5);
    const r = attemptPurchase(inv, "sword");
    expect(r).toEqual({ ok: false, reason: "insufficient_coins" });
  });

  it("removes coins and adds item on success", () => {
    const inv = createInventory(5);
    addItem(inv, ITEMS.coins, 999);
    const beforeCoins = getItemCount(inv, "coins");
    const r = attemptPurchase(inv, "bread");
    expect(r).toEqual({ ok: true });
    expect(getItemCount(inv, "coins")).toBeLessThan(beforeCoins);
    expect(getItemCount(inv, "bread")).toBeGreaterThan(0);
  });

  it("offers half the catalog value rounded down", () => {
    const offer = getSellOffer({ id: "bread", name: "Bread", qty: 2, maxStack: 20 });
    expect(offer).toEqual({ ok: true, coins: 12 });
  });

  it("sells an item from a slot and grants coins", () => {
    const inv = createInventory(5);
    addItem(inv, ITEMS.bread, 1);
    const coinsBefore = getItemCount(inv, "coins");
    const res = attemptSaleFromSlot(inv, 0);
    expect(res.ok).toBe(true);
    expect(getItemCount(inv, "coins")).toBeGreaterThan(coinsBefore);
    expect(inv.slots.some((s) => s?.id === "bread")).toBe(false);
  });
});
