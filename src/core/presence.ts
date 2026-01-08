import type { Direction } from "./movement";

export type TownPresencePayload = {
  x: number;
  y: number;
  facing: Exclude<Direction, "none">;
  updatedAtMs: number;
};

export type TownPresenceSnapshotInput = {
  playerX: number;
  playerY: number;
  facing: Exclude<Direction, "none">;
  tileSize: number;
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
  };
}

export function isSameTownPresence(a: TownPresencePayload, b: TownPresencePayload): boolean {
  return a.x === b.x && a.y === b.y && a.facing === b.facing;
}

export function parseTownPresencePayload(raw: unknown): TownPresencePayload | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (typeof data.x !== "number" || !Number.isFinite(data.x)) return null;
  if (typeof data.y !== "number" || !Number.isFinite(data.y)) return null;
  if (typeof data.updatedAtMs !== "number" || !Number.isFinite(data.updatedAtMs)) return null;
  if (typeof data.facing !== "string" || !VALID_FACING.has(data.facing)) return null;
  return {
    x: data.x,
    y: data.y,
    facing: data.facing as Exclude<Direction, "none">,
    updatedAtMs: data.updatedAtMs,
  };
}
