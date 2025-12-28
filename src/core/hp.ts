export type HpResult = { hp: number; died: boolean; tookDamage: boolean };

export function applyDamage(params: { hp: number; damage: number }): HpResult {
  const { hp, damage } = params;
  if (hp <= 0) return { hp: 0, died: true, tookDamage: false };
  if (!Number.isFinite(damage) || damage <= 0) return { hp, died: false, tookDamage: false };
  const next = Math.max(0, hp - Math.floor(damage));
  return { hp: next, died: next <= 0, tookDamage: true };
}


