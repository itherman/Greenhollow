export type SessionMode = "guest" | "firebase";

export type Session = {
  mode: SessionMode;
  uid: string;
  username: string;
};

const SESSION_KEY = "game.session.v1";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStorage(): StorageLike | null {
  // In tests (node), window/localStorage may not exist.
  // In browser, localStorage should exist.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!window.localStorage) return null;
  return window.localStorage;
}

function randomId(): string {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `r${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

export function loadSession(storage: StorageLike | null = defaultStorage()): Session | null {
  if (!storage) return null;
  const raw = storage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Session;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.mode !== "guest" && parsed.mode !== "firebase") return null;
    if (typeof parsed.uid !== "string" || typeof parsed.username !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: Session, storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return;
  storage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return;
  storage.removeItem(SESSION_KEY);
}

export function createGuestSession(username?: string): Session {
  const suffix = randomId().slice(0, 6);
  const u = (username ?? `guest_${suffix}`).trim();
  return {
    mode: "guest",
    uid: `guest:${randomId()}`,
    username: u.length ? u : `guest_${suffix}`,
  };
}

export function getOrCreateGuestSession(storage: StorageLike | null = defaultStorage()): Session {
  const existing = loadSession(storage);
  if (existing) return existing;
  const created = createGuestSession();
  saveSession(created, storage);
  return created;
}


