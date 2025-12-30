import { describe, expect, it } from "vitest";
import { applyDamage, applyHeal } from "./hp";

describe("hp", () => {
  it("reduces hp and reports death at zero", () => {
    expect(applyDamage({ hp: 3, damage: 1 })).toEqual({ hp: 2, died: false, tookDamage: true });
    expect(applyDamage({ hp: 1, damage: 2 })).toEqual({ hp: 0, died: true, tookDamage: true });
  });

  it("ignores non-positive damage", () => {
    expect(applyDamage({ hp: 5, damage: 0 })).toEqual({ hp: 5, died: false, tookDamage: false });
  });

  it("heals up to maxHp", () => {
    expect(applyHeal({ hp: 10, maxHp: 20, heal: 6 })).toEqual({ hp: 16, healed: 6 });
    expect(applyHeal({ hp: 18, maxHp: 20, heal: 6 })).toEqual({ hp: 20, healed: 2 });
  });

  it("ignores non-positive heals and clamps hp to maxHp", () => {
    expect(applyHeal({ hp: 25, maxHp: 20, heal: 0 })).toEqual({ hp: 20, healed: 0 });
  });
});


