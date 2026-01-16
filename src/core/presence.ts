import type { ItemId } from "./inventory";
import type { Direction } from "./movement";
import type { EquipmentState } from "./equipment";
import { ITEMS } from "./inventory";

export type TownPresencePayload = {
  x: number;
  y: number;
  facing: Exclude<Direction, "none">;
  updatedAtMs: number;
  heldItemId?: ItemId | null;
  headArmorItemId?: ItemId | null;
  bodyArmorItemId?: ItemId | null;
  legArmorItemId?: ItemId | null;
};

export type TownPresenceSnapshotInput = {
  playerX: number;
  playerY: number;
  facing: Exclude<Direction, "none">;
  tileSize: number;
  equipment: EquipmentState;
  nowMs?: number;
};

const VALID_FACING: ReadonlySet<string> = new Set(["up", "down", "left", "right"]);

export function buildTownPresencePath(townId: string, uid: string): string {
  return `towns/${townId}/presence/${uid}`;
}

export function buildTownPresencePayload(input: TownPresenceSnapshotInput): TownPresencePayload {
  const tileX = Math.floor(input.playerX / input.tileSize);
  const tileY = Math.floor(input.playerY / input.tileSize);
  return {
    x: tileX,
    y: tileY,
    facing: input.facing,
    updatedAtMs: input.nowMs ?? Date.now(),
    heldItemId: input.equipment.heldItemId ?? null,
    headArmorItemId: input.equipment.headArmorItemId ?? null,
    bodyArmorItemId: input.equipment.bodyArmorItemId ?? null,
    legArmorItemId: input.equipment.legArmorItemId ?? null,
  };
}

export function isSameTownPresence(a: TownPresencePayload, b: TownPresencePayload): boolean {
  return (
    a.x === b.x &&
    a.y === b.y &&
    a.facing === b.facing &&
    a.heldItemId === b.heldItemId &&
    a.headArmorItemId === b.headArmorItemId &&
    a.bodyArmorItemId === b.bodyArmorItemId &&
    a.legArmorItemId === b.legArmorItemId
  );
}

function parseItemId(raw: unknown): ItemId | null {
  if (raw == null) return null;
  if (typeof raw !== "string") return null;
  return raw in ITEMS ? (raw as ItemId) : null;
}

export function parseTownPresencePayload(raw: unknown): TownPresencePayload | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (typeof data.x !== "number" || !Number.isFinite(data.x)) return null;
  if (typeof data.y !== "number" || !Number.isFinite(data.y)) return null;
  const updatedAtMs =
    typeof data.updatedAtMs === "number" && Number.isFinite(data.updatedAtMs)
      ? data.updatedAtMs
      : typeof data.updatedAt === "number" && Number.isFinite(data.updatedAt)
        ? data.updatedAt
        : null;
  if (updatedAtMs == null) return null;
  if (typeof data.facing !== "string" || !VALID_FACING.has(data.facing)) return null;
  const heldItemId = parseItemId(data.heldItemId);
  const headArmorItemId = parseItemId(data.headArmorItemId);
  const bodyArmorItemId = parseItemId(data.bodyArmorItemId);
  const legArmorItemId = parseItemId(data.legArmorItemId);
  if (data.heldItemId != null && heldItemId == null) return null;
  if (data.headArmorItemId != null && headArmorItemId == null) return null;
  if (data.bodyArmorItemId != null && bodyArmorItemId == null) return null;
  if (data.legArmorItemId != null && legArmorItemId == null) return null;
  return {
    x: data.x,
    y: data.y,
    facing: data.facing as Exclude<Direction, "none">,
    updatedAtMs,
    heldItemId,
    headArmorItemId,
    bodyArmorItemId,
    legArmorItemId,
  };
}
