export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const FLAGS_KEY = "game.flags.v1";

type FlagsState = Record<string, true>;

function defaultStorage(): StorageLike | null {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!window.localStorage) return null;
  return window.localStorage;
}

function loadState(storage: StorageLike | null): FlagsState {
  if (!storage) return {};
  const raw = storage.getItem(FLAGS_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as FlagsState;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
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


