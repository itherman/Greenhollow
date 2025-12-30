import { describe, expect, it } from "vitest";
import { saveInventory, loadInventory, clearInventory } from "./inventoryStore";
import { saveEquipment, loadEquipment, clearEquipment } from "./equipmentStore";
import { saveProgress, loadProgress, clearProgress } from "./progressStore";
import { setFlag, hasFlag, clearFlags } from "./flags";
import { createInventory, ITEMS } from "../../core/inventory";

function mkStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => data.set(k, v),
    removeItem: (k: string) => data.delete(k),
  };
}

describe("store clearing helpers", () => {
  it("clears inventory/equipment/progress/flags", () => {
    const st = mkStorage() as any;
    // Seed
    const inv = createInventory();
    inv.slots[0] = { ...ITEMS.sword, qty: 1 };
    saveInventory(inv, st);
    saveEquipment({ heldItemId: ITEMS.sword.id, armorItemId: null }, st);
    saveProgress({ areaId: "village" as any, entry: "start" as any, playerX: 1, playerY: 2, hp: 10, maxHp: 10 }, st);
    setFlag("x", st);

    clearInventory(st);
    clearEquipment(st);
    clearProgress(st);
    clearFlags(st);

    expect(loadInventory(st).slots.every((s) => !s)).toBe(true);
    expect(loadEquipment(st).heldItemId).toBeNull();
    expect(loadProgress(st)).toBeNull();
    expect(hasFlag("x", st)).toBe(false);
  });
});


