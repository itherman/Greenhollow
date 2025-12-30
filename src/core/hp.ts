export type HpResult = { hp: number; died: boolean; tookDamage: boolean };

export function applyDamage(params: { hp: number; damage: number }): HpResult {
  const { hp, damage } = params;
  if (hp <= 0) return { hp: 0, died: true, tookDamage: false };
  if (!Number.isFinite(damage) || damage <= 0) return { hp, died: false, tookDamage: false };
  const next = Math.max(0, hp - Math.floor(damage));
  return { hp: next, died: next <= 0, tookDamage: true };
}

export type HealResult = { hp: number; healed: number };

export function applyHeal(params: { hp: number; maxHp: number; heal: number }): HealResult {
  const { hp, maxHp, heal } = params;
  const cappedHp = Math.max(0, Math.floor(hp));
  const cappedMaxHp = Math.max(1, Math.floor(maxHp));
  if (!Number.isFinite(heal) || heal <= 0) return { hp: Math.min(cappedHp, cappedMaxHp), healed: 0 };
  const before = Math.min(cappedHp, cappedMaxHp);
  const after = Math.min(cappedMaxHp, before + Math.floor(heal));
  return { hp: after, healed: after - before };
}


