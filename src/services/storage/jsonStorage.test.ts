import { describe, expect, it } from "vitest";
import { loadJsonOr, loadJsonOrNull } from "./jsonStorage";
import type { StorageLike } from "./storageLike";

class MemStorage implements StorageLike {
  private m = new Map<string, string>();
  getItem(key: string): string | null {
    return this.m.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.m.set(key, value);
  }
  removeItem(key: string): void {
    this.m.delete(key);
  }
}

describe("jsonStorage", () => {
  it("loadJsonOr returns fallback when storage is null", () => {
    const v = loadJsonOr(null, "k", 123, (x): x is number => typeof x === "number");
    expect(v).toBe(123);
  });

  it("loadJsonOr returns fallback when key is missing", () => {
    const st = new MemStorage();
    const v = loadJsonOr(st, "k", { ok: true }, (x): x is { ok: true } => !!x && typeof x === "object" && (x as any).ok === true);
    expect(v).toEqual({ ok: true });
  });

  it("loadJsonOr returns fallback when JSON is invalid", () => {
    const st = new MemStorage();
    st.setItem("k", "{bad");
    const v = loadJsonOr(st, "k", "fallback", (x): x is string => typeof x === "string");
    expect(v).toBe("fallback");
  });

  it("loadJsonOr returns fallback when validator fails", () => {
    const st = new MemStorage();
    st.setItem("k", JSON.stringify({ ok: false }));
    const v = loadJsonOr(st, "k", { ok: true as const }, (x): x is { ok: true } => !!x && typeof x === "object" && (x as any).ok === true);
    expect(v).toEqual({ ok: true });
  });

  it("loadJsonOr returns parsed value when validator passes", () => {
    const st = new MemStorage();
    st.setItem("k", JSON.stringify({ ok: true }));
    const v = loadJsonOr(st, "k", { ok: true as const }, (x): x is { ok: true } => !!x && typeof x === "object" && (x as any).ok === true);
    expect(v).toEqual({ ok: true });
  });

  it("loadJsonOrNull returns null on missing/invalid data", () => {
    const st = new MemStorage();
    expect(loadJsonOrNull(st, "k", (x): x is number => typeof x === "number")).toBeNull();
    st.setItem("k", "{bad");
    expect(loadJsonOrNull(st, "k", (x): x is number => typeof x === "number")).toBeNull();
  });

  it("loadJsonOrNull returns parsed value when validator passes", () => {
    const st = new MemStorage();
    st.setItem("k", JSON.stringify(42));
    expect(loadJsonOrNull(st, "k", (x): x is number => typeof x === "number")).toBe(42);
  });
});


