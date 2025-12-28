import { describe, expect, it } from "vitest";
import { decodePlayerState, encodePlayerStateV1 } from "./playerStateCodec";
import { createInventory } from "./inventory";
import { createEquipment } from "./equipment";

describe("playerStateCodec", () => {
  it("round-trips a valid v1 state", () => {
    const st = encodePlayerStateV1({
      username: "alice",
      inventory: createInventory(20),
      equipment: createEquipment(),
      flags: { "door.house.hallway.unlocked": true },
      progress: { areaId: "village", entry: "start", playerX: 100, playerY: 200, hp: 10, maxHp: 20 },
      updatedAtMs: 123,
    });
    const dec = decodePlayerState(st);
    expect(dec.ok).toBe(true);
    if (!dec.ok) throw new Error("expected ok");
    expect(dec.state.v).toBe(1);
    expect(dec.state.username).toBe("alice");
    expect(dec.state.progress.hp).toBe(10);
  });

  it("rejects invalid inputs", () => {
    expect(decodePlayerState(null).ok).toBe(false);
    expect(decodePlayerState({ v: 2 }).ok).toBe(false);
    expect(
      decodePlayerState({
        v: 1,
        username: "",
        inventory: {},
        equipment: {},
        flags: {},
        progress: {},
        updatedAtMs: 0,
      }).ok,
    ).toBe(false);
  });
});


