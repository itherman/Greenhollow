export type TapCandidateKind = "heart" | "key" | "sword" | "chest" | "npc";

export type TapCandidate = {
  kind: TapCandidateKind;
  x: number;
  y: number;
  // optional payload for the caller (e.g. npc script id)
  id?: string;
};

export type TapPickResult =
  | { ok: true; picked: TapCandidate; dist2: number }
  | { ok: false };

/**
 * Pick the best candidate near a tap point, using nearest-distance with a kind priority tie-break.
 * Pure so it can be unit tested without Phaser.
 */
export function pickTapCandidate(params: {
  tapX: number;
  tapY: number;
  candidates: TapCandidate[];
  maxDistancePx: number;
}): TapPickResult {
  const { tapX, tapY, candidates, maxDistancePx } = params;
  const max2 = maxDistancePx * maxDistancePx;

  // Higher number = higher priority (wins on ties).
  const prio: Record<TapCandidateKind, number> = {
    heart: 5,
    key: 4,
    sword: 3,
    chest: 2,
    npc: 1,
  };

  let best: TapCandidate | null = null;
  let bestD2 = Number.POSITIVE_INFINITY;
  let bestP = -Infinity;

  for (const c of candidates) {
    const dx = c.x - tapX;
    const dy = c.y - tapY;
    const d2 = dx * dx + dy * dy;
    if (d2 > max2) continue;
    const p = prio[c.kind] ?? 0;
    if (!best || d2 < bestD2 - 1e-9 || (Math.abs(d2 - bestD2) < 1e-9 && p > bestP)) {
      best = c;
      bestD2 = d2;
      bestP = p;
    }
  }

  if (!best) return { ok: false };
  return { ok: true, picked: best, dist2: bestD2 };
}


