import { describe, expect, it } from "vitest";
import { ITEMS, addItem, createInventory, inventoryFromJSON, inventoryToJSON, removeItem } from "./inventory";

describe("inventory", () => {
  it("creates 20-slot inventory by default", () => {
    const inv = createInventory();
    expect(inv.size).toBe(20);
    expect(inv.slots).toHaveLength(20);
  });

  it("adds items into empty slots", () => {
    const inv = createInventory(2);
    const r = addItem(inv, ITEMS.coins, 10);
    expect(r).toEqual({ ok: true, remaining: 0 });
    expect(inv.slots[0]?.id).toBe("coins");
    expect(inv.slots[0]?.qty).toBe(10);
  });

  it("supports non-stackable items (maxStack=1)", () => {
    const inv = createInventory(2);
    const r = addItem(inv, ITEMS.rusty_key, 2);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.remaining).toBe(0);
    expect(inv.slots[0]?.id).toBe("rusty_key");
    expect(inv.slots[1]?.id).toBe("rusty_key");
  });

  it("stacks into existing stack up to maxStack", () => {
    const inv = createInventory(1);
    addItem(inv, { ...ITEMS.coins, maxStack: 10 }, 7);
    const r = addItem(inv, { ...ITEMS.coins, maxStack: 10 }, 10);
    expect(r).toEqual({ ok: true, remaining: 7 });
    expect(inv.slots[0]?.qty).toBe(10);
  });

  it("removeItem fails if insufficient qty", () => {
    const inv = createInventory(1);
    addItem(inv, ITEMS.coins, 5);
    expect(removeItem(inv, "coins", 10)).toBe(false);
    expect(inv.slots[0]?.qty).toBe(5);
  });

  it("removeItem removes and clears slot at zero", () => {
    const inv = createInventory(1);
    addItem(inv, ITEMS.coins, 5);
    expect(removeItem(inv, "coins", 5)).toBe(true);
    expect(inv.slots[0]).toBeNull();
  });

  it("roundtrips JSON", () => {
    const inv = createInventory(3);
    addItem(inv, ITEMS.coins, 12);
    const raw = inventoryToJSON(inv);
    const loaded = inventoryFromJSON(raw, 20);
    expect(loaded.size).toBe(3);
    expect(loaded.slots[0]?.id).toBe("coins");
    expect(loaded.slots[0]?.qty).toBe(12);
  });
});


