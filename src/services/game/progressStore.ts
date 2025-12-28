import type { AreaId, EntryId } from "../../core/areas";

export type PlayerProgress = {
  areaId: AreaId;
  entry: EntryId;
  playerX: number;
  playerY: number;
  hp: number;
  maxHp: number;
};

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const KEY = "game.progress.v1";

function defaultStorage(): StorageLike | null {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!window.localStorage) return null;
  return window.localStorage;
}

export function loadProgress(storage: StorageLike | null = defaultStorage()): PlayerProgress | null {
  if (!storage) return null;
  const raw = storage.getItem(KEY);
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as PlayerProgress;
    if (!p || typeof p !== "object") return null;
    if (typeof p.areaId !== "string" || typeof p.entry !== "string") return null;
    if (typeof p.playerX !== "number" || typeof p.playerY !== "number") return null;
    if (typeof p.hp !== "number" || typeof p.maxHp !== "number") return null;
    return p;
  } catch {
    return null;
  }
}

export function saveProgress(p: PlayerProgress, storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return;
  storage.setItem(KEY, JSON.stringify(p));
}


