import { loadJsonOrNull } from "../storage/jsonStorage";
import { defaultBrowserStorage, type StorageLike } from "../storage/storageLike";

export type SessionMode = "guest" | "firebase";

export type Session = {
  mode: SessionMode;
  uid: string;
  username: string;
};

const SESSION_KEY = "game.session.v1";

function randomId(): string {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `r${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

export function loadSession(storage: StorageLike | null = defaultStorage()): Session | null {
  return loadJsonOrNull(storage, SESSION_KEY, isSession);
}

export function saveSession(session: Session, storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return;
  storage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return;
  if (storage.removeItem) {
    storage.removeItem(SESSION_KEY);
    return;
  }
  // Fallback: overwrite with empty.
  storage.setItem(SESSION_KEY, "");
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

function defaultStorage(): StorageLike | null {
  return defaultBrowserStorage();
}

function isSession(v: unknown): v is Session {
  if (!v || typeof v !== "object") return false;
  const s = v as Session;
  if (s.mode !== "guest" && s.mode !== "firebase") return false;
  if (typeof s.uid !== "string" || typeof s.username !== "string") return false;
  return true;
}


