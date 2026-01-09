import { describe, expect, it } from "vitest";
import { attemptTradePurchase } from "./trade";
import { ITEMS, addItem, createInventory } from "./inventory";

describe("trade helpers", () => {
  it("buys a listed item with coins", () => {
    const inv = createInventory(4);
    addItem(inv, ITEMS.coins, 50);

    const res = attemptTradePurchase(inv, "sword", 1, 40);
    expect(res).toEqual({ ok: true });
    expect(inv.slots.some((s) => s?.id === "sword")).toBe(true);
  });

  it("rejects purchases without enough coins", () => {
    const inv = createInventory(4);
    addItem(inv, ITEMS.coins, 10);

    const res = attemptTradePurchase(inv, "sword", 1, 40);
    expect(res).toEqual({ ok: false, reason: "insufficient_coins" });
  });

  it("rejects purchases when inventory is full", () => {
    const inv = createInventory(1);
    addItem(inv, ITEMS.coins, 999);
    addItem(inv, ITEMS.bread, 1);

    const res = attemptTradePurchase(inv, "sword", 1, 40);
    expect(res).toEqual({ ok: false, reason: "inventory_full" });
  });
});
