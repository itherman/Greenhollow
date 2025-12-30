import { describe, expect, it } from "vitest";
import { ITEMS, createInventory } from "./inventory";
import { digestFoodFromInventorySlot } from "./digestFood";

describe("digestFoodFromInventorySlot", () => {
  it("consumes 1 food and heals (capped to maxHp)", () => {
    const inv = createInventory(3);
    inv.slots[0] = { ...ITEMS.bread, qty: 2 };

    const r1 = digestFoodFromInventorySlot({ inv, slotIndex: 0, hp: 10, maxHp: 20 });
    expect(r1).toEqual({ ok: true, healed: 6, nextHp: 16, consumed: { itemId: "bread", healHp: 6 } });
    expect(inv.slots[0]?.qty).toBe(1);

    const r2 = digestFoodFromInventorySlot({ inv, slotIndex: 0, hp: 18, maxHp: 20 });
    expect(r2.ok).toBe(true);
    if (r2.ok) expect(r2.nextHp).toBe(20);
  });

  it("does not consume food if already full", () => {
    const inv = createInventory(1);
    inv.slots[0] = { ...ITEMS.stew, qty: 1 };
    const r = digestFoodFromInventorySlot({ inv, slotIndex: 0, hp: 20, maxHp: 20 });
    expect(r).toEqual({ ok: false, reason: "already_full" });
    expect(inv.slots[0]?.qty).toBe(1);
  });

  it("rejects non-food items", () => {
    const inv = createInventory(1);
    inv.slots[0] = { ...ITEMS.sword, qty: 1 };
    expect(digestFoodFromInventorySlot({ inv, slotIndex: 0, hp: 1, maxHp: 20 })).toEqual({ ok: false, reason: "not_food" });
  });

  it("rejects invalid or empty slots", () => {
    const inv = createInventory(2);
    expect(digestFoodFromInventorySlot({ inv, slotIndex: 0, hp: 1, maxHp: 20 })).toEqual({ ok: false, reason: "empty_slot" });
    expect(digestFoodFromInventorySlot({ inv, slotIndex: 99, hp: 1, maxHp: 20 })).toEqual({ ok: false, reason: "invalid_slot" });
  });
});

