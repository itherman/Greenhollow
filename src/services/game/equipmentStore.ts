import { createEquipment, type EquipmentState } from "../../core/equipment";

const KEY = "game.equipment.v1";

function storage(): Storage | null {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return window.localStorage ?? null;
}

export function loadEquipment(st: Storage | null = storage()): EquipmentState {
  if (!st) return createEquipment();
  const raw = st.getItem(KEY);
  if (!raw) return createEquipment();
  try {
    const parsed = JSON.parse(raw) as Partial<EquipmentState>;
    const heldItemId = (parsed?.heldItemId ?? null) as EquipmentState["heldItemId"];
    const armorItemId = (parsed?.armorItemId ?? null) as EquipmentState["armorItemId"];
    if (heldItemId !== null && typeof heldItemId !== "string") return createEquipment();
    if (armorItemId !== null && typeof armorItemId !== "string") return createEquipment();
    return { heldItemId, armorItemId };
  } catch {
    return createEquipment();
  }
}

export function saveEquipment(state: EquipmentState, st: Storage | null = storage()): void {
  if (!st) return;
  st.setItem(KEY, JSON.stringify(state));
}

export function clearEquipment(st: Storage | null = storage()): void {
  if (!st) return;
  st.removeItem(KEY);
}


