import { loadJsonOr } from "../storage/jsonStorage";
import { defaultBrowserStorage, type StorageLike } from "../storage/storageLike";

const FLAGS_KEY = "game.flags.v1";

type FlagsState = Record<string, true>;

function defaultStorage(): StorageLike | null {
  return defaultBrowserStorage();
}

function loadState(storage: StorageLike | null): FlagsState {
  return loadJsonOr(storage, FLAGS_KEY, {}, isFlagsState);
}

function saveState(storage: StorageLike | null, state: FlagsState) {
  if (!storage) return;
  storage.setItem(FLAGS_KEY, JSON.stringify(state));
}

export function hasFlag(flag: string, storage: StorageLike | null = defaultStorage()): boolean {
  const state = loadState(storage);
  return state[flag] === true;
}

export function setFlag(flag: string, storage: StorageLike | null = defaultStorage()): void {
  const state = loadState(storage);
  state[flag] = true;
  saveState(storage, state);
}

export function dumpFlags(storage: StorageLike | null = defaultStorage()): FlagsState {
  return loadState(storage);
}

export function replaceFlags(next: FlagsState, storage: StorageLike | null = defaultStorage()): void {
  saveState(storage, next ?? {});
}

export function clearFlags(storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return;
  if (storage.removeItem) {
    storage.removeItem(FLAGS_KEY);
    return;
  }
  saveState(storage, {});
}

function isFlagsState(v: unknown): v is FlagsState {
  if (!v || typeof v !== "object") return false;
  // Ensure values are `true` only (defensive against corruption).
  for (const value of Object.values(v as Record<string, unknown>)) {
    if (value !== true) return false;
  }
  return true;
}


