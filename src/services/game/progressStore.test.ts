import { describe, expect, it } from "vitest";
import { loadProgress, saveProgress, type PlayerProgress } from "./progressStore";
import type { StorageLike } from "../storage/storageLike";

function memStore(): StorageLike & { _m: Map<string, string> } {
  const _m = new Map<string, string>();
  return {
    _m,
    getItem: (k) => _m.get(k) ?? null,
    setItem: (k, v) => void _m.set(k, v),
  };
}

describe("progressStore", () => {
  it("round-trips progress", () => {
    const st = memStore();
    const p: PlayerProgress = { areaId: "village", entry: "start", playerX: 1, playerY: 2, hp: 3, maxHp: 20 };
    saveProgress(p, st);
    expect(loadProgress(st)).toEqual(p);
  });

  it("returns null for missing/invalid data", () => {
    const st = memStore();
    expect(loadProgress(st)).toBeNull();
    st.setItem("game.progress.v1", "not json");
    expect(loadProgress(st)).toBeNull();
  });
});


