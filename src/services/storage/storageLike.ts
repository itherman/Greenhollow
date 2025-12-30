export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?: (key: string) => void;
}

/**
 * Returns `window.localStorage` in browser environments, otherwise `null`.
 * This keeps service modules Node-test friendly.
 */
export function defaultBrowserStorage(): StorageLike | null {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!window.localStorage) return null;
  return window.localStorage;
}


