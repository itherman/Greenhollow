import { createEquipment, type EquipmentState } from "./equipment";
import type { Inventory } from "./inventory";
import type { AreaId, EntryId } from "./areas";

export type PlayerProgress = {
  areaId: AreaId;
  entry: EntryId;
  playerX: number;
  playerY: number;
  hp: number;
  maxHp: number;
};

export type PlayerStateV1 = {
  v: 1;
  username: string;
  inventory: Inventory;
  equipment: EquipmentState;
  flags: Record<string, true>;
  progress: PlayerProgress;
  updatedAtMs: number;
};

export type DecodeResult =
  | { ok: true; state: PlayerStateV1 }
  | { ok: false; reason: "invalid" };

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function isNullOrString(v: unknown): v is null | string {
  return v === null || typeof v === "string";
}

function clampInt(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.floor(n)));
}

export function encodePlayerStateV1(state: Omit<PlayerStateV1, "v">): PlayerStateV1 {
  return { ...state, v: 1 };
}

export function decodePlayerState(raw: unknown): DecodeResult {
  if (!raw || typeof raw !== "object") return { ok: false, reason: "invalid" };
  const r = raw as any;
  if (r.v !== 1) return { ok: false, reason: "invalid" };
  if (typeof r.username !== "string" || !r.username.length) return { ok: false, reason: "invalid" };
  if (!r.inventory || typeof r.inventory !== "object") return { ok: false, reason: "invalid" };
  if (!r.equipment || typeof r.equipment !== "object") return { ok: false, reason: "invalid" };
  if (!r.flags || typeof r.flags !== "object") return { ok: false, reason: "invalid" };
  if (!r.progress || typeof r.progress !== "object") return { ok: false, reason: "invalid" };
  if (!isFiniteNumber(r.updatedAtMs)) return { ok: false, reason: "invalid" };

  // Inventory validation (lightweight; keep it compatible with existing core format)
  const inv = r.inventory as Inventory;
  if (typeof inv.size !== "number" || !Array.isArray(inv.slots)) return { ok: false, reason: "invalid" };

  // Equipment validation
  const eqRaw = r.equipment as any;
  if (!eqRaw || typeof eqRaw !== "object") return { ok: false, reason: "invalid" };
  if (!isNullOrString(eqRaw.heldItemId ?? null)) return { ok: false, reason: "invalid" };
  if (!isNullOrString(eqRaw.headArmorItemId ?? null)) return { ok: false, reason: "invalid" };
  if (!isNullOrString(eqRaw.bodyArmorItemId ?? null)) return { ok: false, reason: "invalid" };
  if (!isNullOrString(eqRaw.legArmorItemId ?? null)) return { ok: false, reason: "invalid" };
  // Back-compat: v1 local saves used `armorItemId` for body armor.
  if (!isNullOrString(eqRaw.armorItemId ?? null)) return { ok: false, reason: "invalid" };

  const eqBase = createEquipment();
  const eq: EquipmentState = {
    ...eqBase,
    heldItemId: (eqRaw.heldItemId ?? null) as any,
    headArmorItemId: (eqRaw.headArmorItemId ?? null) as any,
    bodyArmorItemId: (eqRaw.bodyArmorItemId ?? eqRaw.armorItemId ?? null) as any,
    legArmorItemId: (eqRaw.legArmorItemId ?? null) as any,
  };

  // Flags validation
  const flags: Record<string, true> = {};
  for (const [k, v] of Object.entries(r.flags as Record<string, unknown>)) {
    if (v === true) flags[k] = true;
  }

  // Progress validation/clamp
  const p = r.progress as any;
  if (typeof p.areaId !== "string" || typeof p.entry !== "string") return { ok: false, reason: "invalid" };
  if (!isFiniteNumber(p.playerX) || !isFiniteNumber(p.playerY)) return { ok: false, reason: "invalid" };
  if (!isFiniteNumber(p.hp) || !isFiniteNumber(p.maxHp)) return { ok: false, reason: "invalid" };

  const progress: PlayerProgress = {
    areaId: p.areaId as AreaId,
    entry: p.entry as EntryId,
    playerX: p.playerX,
    playerY: p.playerY,
    hp: clampInt(p.hp, 0, 999),
    maxHp: clampInt(p.maxHp, 1, 999),
  };

  return {
    ok: true,
    state: {
      v: 1,
      username: r.username,
      inventory: inv,
      equipment: eq,
      flags,
      progress,
      updatedAtMs: r.updatedAtMs,
    },
  };
}


