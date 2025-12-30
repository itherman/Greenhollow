import { describe, expect, it } from "vitest";
import { hasFlag, setFlag } from "./flags";
import type { StorageLike } from "../storage/storageLike";

class MemoryStorage implements StorageLike {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

describe("flags", () => {
  it("defaults to false when unset", () => {
    const st = new MemoryStorage();
    expect(hasFlag("chest.house.1", st)).toBe(false);
  });

  it("setFlag persists and hasFlag returns true", () => {
    const st = new MemoryStorage();
    setFlag("chest.house.1", st);
    expect(hasFlag("chest.house.1", st)).toBe(true);
  });

  it("handles invalid JSON gracefully", () => {
    const st = new MemoryStorage();
    st.setItem("game.flags.v1", "{bad");
    expect(hasFlag("x", st)).toBe(false);
    setFlag("x", st);
    expect(hasFlag("x", st)).toBe(true);
  });
});


