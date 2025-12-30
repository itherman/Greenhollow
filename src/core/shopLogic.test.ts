import { describe, expect, it } from "vitest";
import { ITEMS, addItem, createInventory, getItemCount } from "./inventory";
import { attemptPurchase } from "./shopLogic";

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
});


