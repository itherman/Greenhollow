import { describe, expect, it } from "vitest";
import { ITEMS, addItem, createInventory } from "./inventory";
import { createEquipment, toggleEquipFromInventorySlot } from "./equipment";

describe("equipment", () => {
  it("equips the item in a slot; selecting it again unequips", () => {
    const inv = createInventory(5);
    addItem(inv, ITEMS.sword, 1);
    const eq0 = createEquipment();

    const r1 = toggleEquipFromInventorySlot(eq0, inv, 0);
    expect(r1.ok).toBe(true);
    if (r1.ok) expect(r1.next.heldItemId).toBe("sword");

    const r2 = toggleEquipFromInventorySlot(r1.ok ? r1.next : eq0, inv, 0);
    expect(r2.ok).toBe(true);
    if (r2.ok) expect(r2.next.heldItemId).toBe(null);
  });

  it("rejects empty slots", () => {
    const inv = createInventory(3);
    const r = toggleEquipFromInventorySlot(createEquipment(), inv, 1);
    expect(r).toEqual({ ok: false, reason: "empty_slot" });
  });

  it("rejects out of bounds slots", () => {
    const inv = createInventory(2);
    const r = toggleEquipFromInventorySlot(createEquipment(), inv, 99);
    expect(r).toEqual({ ok: false, reason: "invalid_slot" });
  });
});


