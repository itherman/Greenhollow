import { describe, expect, it } from "vitest";
import { ITEMS, addItem, createInventory } from "../core/inventory";
import { getShopCoinsLabel } from "./shopCoinsLabel";

describe("getShopCoinsLabel", () => {
  it("renders 0 when inventory has no coins", () => {
    const inv = createInventory();
    expect(getShopCoinsLabel(inv)).toBe("Coins: 0");
  });

  it("renders the current coin count from inventory", () => {
    const inv = createInventory();
    addItem(inv, ITEMS.coins, 25);
    expect(getShopCoinsLabel(inv)).toBe("Coins: 25");
  });
});

