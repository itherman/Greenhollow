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
    const parsed = JSON.parse(raw) as any;

    const heldItemId = (parsed?.heldItemId ?? null) as EquipmentState["heldItemId"];
    const headArmorItemId = (parsed?.headArmorItemId ?? null) as EquipmentState["headArmorItemId"];
    const bodyArmorItemId = (parsed?.bodyArmorItemId ?? null) as EquipmentState["bodyArmorItemId"];
    const legArmorItemId = (parsed?.legArmorItemId ?? null) as EquipmentState["legArmorItemId"];

    // Back-compat: older saves stored chest armor as `armorItemId`.
    const legacyArmorItemId = parsed?.armorItemId ?? null;
    const bodyFromLegacy = bodyArmorItemId ?? legacyArmorItemId ?? null;

    if (heldItemId !== null && typeof heldItemId !== "string") return createEquipment();
    if (headArmorItemId !== null && typeof headArmorItemId !== "string") return createEquipment();
    if (bodyFromLegacy !== null && typeof bodyFromLegacy !== "string") return createEquipment();
    if (legArmorItemId !== null && typeof legArmorItemId !== "string") return createEquipment();

    return {
      heldItemId,
      headArmorItemId,
      bodyArmorItemId: bodyFromLegacy,
      legArmorItemId,
    };
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


