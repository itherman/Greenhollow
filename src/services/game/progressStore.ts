import type { AreaId, EntryId } from "../../core/areas";
import { loadJsonOrNull } from "../storage/jsonStorage";
import { defaultBrowserStorage, type StorageLike } from "../storage/storageLike";

export type PlayerProgress = {
  areaId: AreaId;
  entry: EntryId;
  playerX: number;
  playerY: number;
  hp: number;
  maxHp: number;
};

const KEY = "game.progress.v1";

function defaultStorage(): StorageLike | null {
  return defaultBrowserStorage();
}

export function loadProgress(storage: StorageLike | null = defaultStorage()): PlayerProgress | null {
  return loadJsonOrNull(storage, KEY, isPlayerProgress);
}

export function saveProgress(p: PlayerProgress, storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return;
  storage.setItem(KEY, JSON.stringify(p));
}

export function clearProgress(storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return;
  if (storage.removeItem) {
    storage.removeItem(KEY);
    return;
  }
  // Fallback: overwrite with empty.
  storage.setItem(KEY, "");
}

function isPlayerProgress(v: unknown): v is PlayerProgress {
  if (!v || typeof v !== "object") return false;
  const p = v as PlayerProgress;
  if (typeof p.areaId !== "string" || typeof p.entry !== "string") return false;
  if (typeof p.playerX !== "number" || typeof p.playerY !== "number") return false;
  if (typeof p.hp !== "number" || typeof p.maxHp !== "number") return false;
  return true;
}


