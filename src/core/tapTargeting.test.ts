import { describe, expect, it } from "vitest";
import { pickTapCandidate, type TapCandidate } from "./tapTargeting";

describe("tapTargeting", () => {
  it("returns none when nothing is within range", () => {
    const r = pickTapCandidate({
      tapX: 0,
      tapY: 0,
      candidates: [{ kind: "npc", x: 100, y: 0 }],
      maxDistancePx: 20,
    });
    expect(r.ok).toBe(false);
  });

  it("picks the nearest candidate within range", () => {
    const candidates: TapCandidate[] = [
      { kind: "npc", x: 10, y: 0, id: "a" },
      { kind: "chest", x: 15, y: 0 },
    ];
    const r = pickTapCandidate({ tapX: 0, tapY: 0, candidates, maxDistancePx: 30 });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected ok");
    expect(r.picked.id).toBe("a");
  });

  it("breaks ties by kind priority (items beat interactables)", () => {
    const candidates: TapCandidate[] = [
      { kind: "npc", x: 10, y: 0, id: "npc1" },
      { kind: "heart", x: 10, y: 0 },
    ];
    const r = pickTapCandidate({ tapX: 0, tapY: 0, candidates, maxDistancePx: 20 });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected ok");
    expect(r.picked.kind).toBe("heart");
  });

  it("treats bow like other items in priority", () => {
    const candidates: TapCandidate[] = [
      { kind: "chest", x: 5, y: 0 },
      { kind: "bow", x: 5, y: 0 },
    ];
    const r = pickTapCandidate({ tapX: 0, tapY: 0, candidates, maxDistancePx: 10 });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected ok");
    expect(r.picked.kind).toBe("bow");
  });
});


