import { describe, expect, it } from "vitest";
import {
  clearSession,
  createGuestSession,
  getOrCreateGuestSession,
  loadSession,
  saveSession,
  type StorageLike,
} from "./session";

class MemoryStorage implements StorageLike {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

describe("session", () => {
  it("creates a guest session with defaults", () => {
    const s = createGuestSession();
    expect(s.mode).toBe("guest");
    expect(s.uid.startsWith("guest:")).toBe(true);
    expect(s.username.length).toBeGreaterThan(0);
  });

  it("persists and loads a session", () => {
    const st = new MemoryStorage();
    const s = createGuestSession("Knight");
    saveSession(s, st);
    expect(loadSession(st)).toEqual(s);
  });

  it("clears a session", () => {
    const st = new MemoryStorage();
    saveSession(createGuestSession("Knight"), st);
    clearSession(st);
    expect(loadSession(st)).toBeNull();
  });

  it("getOrCreateGuestSession returns existing session if present", () => {
    const st = new MemoryStorage();
    const s1 = getOrCreateGuestSession(st);
    const s2 = getOrCreateGuestSession(st);
    expect(s2).toEqual(s1);
  });

  it("loadSession returns null for invalid JSON", () => {
    const st = new MemoryStorage();
    st.setItem("game.session.v1", "{not-json");
    expect(loadSession(st)).toBeNull();
  });
});


