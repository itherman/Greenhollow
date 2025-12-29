import { describe, expect, it } from "vitest";
import { arrowVelocity, createRangedState, tryShoot, tryShootWithAmmo } from "./rangedAttack";

describe("rangedAttack", () => {
  it("enforces shot cooldown", () => {
    const s0 = createRangedState();
    const r1 = tryShoot({ nowMs: 1000, state: s0, cooldownMs: 500 });
    expect(r1.ok).toBe(true);
    if (!r1.ok) throw new Error("expected ok");
    const r2 = tryShoot({ nowMs: 1200, state: r1.next, cooldownMs: 500 });
    expect(r2).toEqual({ ok: false, reason: "cooldown" });
    const r3 = tryShoot({ nowMs: 1500, state: r1.next, cooldownMs: 500 });
    expect(r3.ok).toBe(true);
  });

  it("computes velocity toward target with requested speed", () => {
    const v = arrowVelocity({ from: { x: 0, y: 0 }, to: { x: 3, y: 4 }, speed: 50 });
    // 3-4-5 triangle => unit dir (0.6, 0.8) => scaled (30, 40)
    expect(Math.round(v.x)).toBe(30);
    expect(Math.round(v.y)).toBe(40);
  });

  it("requires arrows to shoot and still enforces cooldown", () => {
    const s0 = createRangedState();
    const r1 = tryShootWithAmmo({ nowMs: 1000, state: s0, cooldownMs: 400, arrows: 0 });
    expect(r1).toEqual({ ok: false, reason: "no_arrows" });

    const r2 = tryShootWithAmmo({ nowMs: 1000, state: s0, cooldownMs: 400, arrows: 3 });
    expect(r2.ok).toBe(true);
    if (!r2.ok) throw new Error("expected ok");

    const r3 = tryShootWithAmmo({ nowMs: 1200, state: r2.next, cooldownMs: 400, arrows: 2 });
    expect(r3).toEqual({ ok: false, reason: "cooldown" });
  });
});


