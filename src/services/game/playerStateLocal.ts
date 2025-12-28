import { inventoryFromJSON, inventoryToJSON } from "../../core/inventory";
import type { Inventory } from "../../core/inventory";
import type { EquipmentState } from "../../core/equipment";
import { loadInventory, saveInventory } from "./inventoryStore";
import { loadEquipment, saveEquipment } from "./equipmentStore";
import { dumpFlags, replaceFlags } from "./flags";
import { loadProgress, saveProgress, type PlayerProgress } from "./progressStore";

export type LocalPlayerState = {
  inventory: Inventory;
  equipment: EquipmentState;
  flags: Record<string, true>;
  progress: PlayerProgress | null;
};

export function collectLocalPlayerState(): LocalPlayerState {
  return {
    inventory: loadInventory(),
    equipment: loadEquipment(),
    flags: dumpFlags(),
    progress: loadProgress(),
  };
}

export function applyLocalPlayerState(state: LocalPlayerState): void {
  // Inventory: normalize by round-tripping through core JSON codec (guards against partial/bad data).
  const invRaw = inventoryToJSON(state.inventory);
  saveInventory(inventoryFromJSON(invRaw, 20));

  saveEquipment(state.equipment);
  replaceFlags(state.flags ?? {});

  if (state.progress) saveProgress(state.progress);
}


