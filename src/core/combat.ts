export type DamageResult = {
  hp: number;
  lastHitAtMs: number;
  tookHit: boolean;
};

export function applyContactDamage(params: {
  hp: number;
  nowMs: number;
  lastHitAtMs: number;
  cooldownMs: number;
  damage: number;
}): DamageResult {
  const { hp, nowMs, lastHitAtMs, cooldownMs, damage } = params;
  if (hp <= 0) return { hp: 0, lastHitAtMs, tookHit: false };
  if (damage <= 0) return { hp, lastHitAtMs, tookHit: false };
  if (nowMs - lastHitAtMs < cooldownMs) return { hp, lastHitAtMs, tookHit: false };
  const nextHp = Math.max(0, hp - damage);
  return { hp: nextHp, lastHitAtMs: nowMs, tookHit: true };
}


