import { describe, expect, it } from "vitest";
import { pickNpcForDialog } from "./npcInteract";

describe("pickNpcForDialog", () => {
  it("does not allow a far tapped NPC to interact via a nearby NPC (scriptId mismatch bug)", () => {
    const elder = { x: 0, y: 0, npcDef: { dialogScriptId: "elder" } };
    const villagerFar = { x: 1000, y: 1000, npcDef: { dialogScriptId: "villager" } };
    const player = { x: 0, y: 0 };

    // Player is near elder, but user tapped villager far away.
    const picked = pickNpcForDialog({
      player,
      npcs: [elder, villagerFar],
      rangePx: 60,
      scriptId: "villager",
      tapTarget: { x: villagerFar.x, y: villagerFar.y },
    });

    // Must NOT pick elder (previous behavior would open immediately using elder body).
    expect(picked).toBeNull();
  });

  it("interacts once the player is in range of the tapped NPC", () => {
    const elder = { x: 0, y: 0, npcDef: { dialogScriptId: "elder" } };
    const villager = { x: 1000, y: 1000, npcDef: { dialogScriptId: "villager" } };
    const playerNearVillager = { x: 980, y: 980 };

    const picked = pickNpcForDialog({
      player: playerNearVillager,
      npcs: [elder, villager],
      rangePx: 60,
      scriptId: "villager",
      tapTarget: { x: villager.x, y: villager.y },
    });

    expect(picked).toBe(villager);
  });

  it("when no scriptId is specified, picks the nearest NPC to the player", () => {
    const elderFar = { x: 300, y: 300, npcDef: { dialogScriptId: "elder" } };
    const villagerNear = { x: 10, y: 10, npcDef: { dialogScriptId: "villager" } };
    const player = { x: 0, y: 0 };

    const picked = pickNpcForDialog({
      player,
      npcs: [elderFar, villagerNear],
      rangePx: 60,
    });

    expect(picked).toBe(villagerNear);
  });
});

