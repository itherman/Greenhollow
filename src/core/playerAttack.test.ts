import { describe, expect, it } from "vitest";
import { computeSwordHitbox, createAttackState, tryStartAttack } from "./playerAttack";

describe("playerAttack", () => {
  it("enforces cooldown", () => {
    const s0 = createAttackState();
    const r1 = tryStartAttack({ nowMs: 1000, state: s0, cooldownMs: 300 });
    expect(r1.ok).toBe(true);
    if (!r1.ok) throw new Error("expected ok");
    const r2 = tryStartAttack({ nowMs: 1200, state: r1.next, cooldownMs: 300 });
    expect(r2).toEqual({ ok: false, reason: "cooldown" });
    const r3 = tryStartAttack({ nowMs: 1300, state: r1.next, cooldownMs: 300 });
    expect(r3.ok).toBe(true);
  });

  it("places hitbox in front of player based on facing", () => {
    const base = { playerX: 100, playerY: 200, reachPx: 18, widthPx: 20, heightPx: 14 } as const;
    expect(computeSwordHitbox({ ...base, facing: "right" })).toMatchObject({ x: 108, y: 193, w: 20, h: 14 });
    expect(computeSwordHitbox({ ...base, facing: "left" })).toMatchObject({ x: 72, y: 193, w: 20, h: 14 });
    expect(computeSwordHitbox({ ...base, facing: "up" })).toMatchObject({ x: 90, y: 175, w: 20, h: 14 });
    expect(computeSwordHitbox({ ...base, facing: "down" })).toMatchObject({ x: 90, y: 211, w: 20, h: 14 });
  });
});


