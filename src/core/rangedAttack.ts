export type RangedState = {
  lastShotAtMs: number;
};

export function createRangedState(): RangedState {
  return { lastShotAtMs: -Infinity };
}

export type ShotAttempt =
  | { ok: true; next: RangedState }
  | { ok: false; reason: "cooldown" };

export function tryShoot(params: { nowMs: number; state: RangedState; cooldownMs: number }): ShotAttempt {
  const { nowMs, state, cooldownMs } = params;
  if (nowMs - state.lastShotAtMs < cooldownMs) return { ok: false, reason: "cooldown" };
  return { ok: true, next: { lastShotAtMs: nowMs } };
}

export type Vec2 = { x: number; y: number };

export function normalize(v: Vec2): Vec2 {
  const d = Math.hypot(v.x, v.y);
  if (!Number.isFinite(d) || d <= 0) return { x: 0, y: 0 };
  return { x: v.x / d, y: v.y / d };
}

export function mul(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function arrowVelocity(params: { from: Vec2; to: Vec2; speed: number }): Vec2 {
  const dir = normalize({ x: params.to.x - params.from.x, y: params.to.y - params.from.y });
  return mul(dir, params.speed);
}


