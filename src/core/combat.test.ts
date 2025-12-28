import { describe, expect, it } from "vitest";
import { applyContactDamage } from "./combat";

describe("applyContactDamage", () => {
  it("applies damage if cooldown passed", () => {
    const r = applyContactDamage({
      hp: 10,
      nowMs: 2000,
      lastHitAtMs: 0,
      cooldownMs: 1000,
      damage: 3,
    });
    expect(r).toEqual({ hp: 7, lastHitAtMs: 2000, tookHit: true });
  });

  it("does not apply damage during cooldown", () => {
    const r = applyContactDamage({
      hp: 10,
      nowMs: 1500,
      lastHitAtMs: 1000,
      cooldownMs: 1000,
      damage: 3,
    });
    expect(r).toEqual({ hp: 10, lastHitAtMs: 1000, tookHit: false });
  });

  it("clamps at 0 hp", () => {
    const r = applyContactDamage({
      hp: 2,
      nowMs: 2000,
      lastHitAtMs: 0,
      cooldownMs: 0,
      damage: 5,
    });
    expect(r.hp).toBe(0);
    expect(r.tookHit).toBe(true);
  });

  it("allows immediate first hit when lastHitAtMs is -Infinity", () => {
    const r = applyContactDamage({
      hp: 10,
      nowMs: 10,
      lastHitAtMs: -Infinity,
      cooldownMs: 1000,
      damage: 1,
    });
    expect(r.tookHit).toBe(true);
    expect(r.hp).toBe(9);
  });
});


