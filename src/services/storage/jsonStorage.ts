import type { StorageLike } from "./storageLike";

export function loadJsonOr<T>(
  storage: StorageLike | null,
  key: string,
  fallback: T,
  isT: (value: unknown) => value is T,
): T {
  if (!storage) return fallback;
  const raw = storage.getItem(key);
  if (!raw) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isT(parsed)) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

export function loadJsonOrNull<T>(
  storage: StorageLike | null,
  key: string,
  isT: (value: unknown) => value is T,
): T | null {
  return loadJsonOr(storage, key, null, (v): v is T | null => v === null || isT(v));
}


