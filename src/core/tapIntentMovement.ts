import type { TapCandidateKind } from "./tapTargeting";

export function getTapStopDistancePx(kind: TapCandidateKind | undefined): number {
  // Items should be walked "into" (overlap/pickup feels better when you get right up to it).
  if (kind === "heart" || kind === "key" || kind === "sword" || kind === "bow") return 0;
  // Interactables can stop a bit short to avoid jitter.
  if (kind === "chest" || kind === "npc") return 6;
  return 6;
}

export function getTapInteractRangePx(kind: TapCandidateKind): number {
  // Items should require being very close (essentially on top).
  if (kind === "key" || kind === "sword" || kind === "bow") return 14;
  // Chests/NPCs (auto-tap): require being closer than keyboard interact.
  // This makes tapping an NPC feel like you walk up to them before talking.
  if (kind === "chest") return 32 * 1.1;
  if (kind === "npc") return 28;
  // Heart pickup is via overlap, not explicit interact.
  return 0;
}


