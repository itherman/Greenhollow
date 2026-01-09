import { describe, expect, it } from "vitest";
import { createEquipment } from "./equipment";
import { buildTownPresencePath, buildTownPresencePayload, isSameTownPresence, parseTownPresencePayload } from "./presence";

describe("town presence helpers", () => {
  it("builds a payload from player world coords", () => {
    const payload = buildTownPresencePayload({
      playerX: 96,
      playerY: 65,
      facing: "left",
      tileSize: 32,
      equipment: { ...createEquipment(), heldItemId: "sword", bodyArmorItemId: "leather_armor" },
      nowMs: 12345,
    });

    expect(payload).toEqual({
      x: 3,
      y: 2,
      facing: "left",
      updatedAtMs: 12345,
      heldItemId: "sword",
      headArmorItemId: null,
      bodyArmorItemId: "leather_armor",
      legArmorItemId: null,
    });
  });

  it("builds a town presence path", () => {
    expect(buildTownPresencePath("town", "user-1")).toBe("towns/town/presence/user-1");
  });

  it("compares presence payloads ignoring timestamps", () => {
    const a = { x: 4, y: 1, facing: "up", updatedAtMs: 10, heldItemId: "bow" } as const;
    const b = { x: 4, y: 1, facing: "up", updatedAtMs: 999, heldItemId: "bow" } as const;
    const c = { x: 4, y: 2, facing: "up", updatedAtMs: 10, heldItemId: "bow" } as const;
    const d = { x: 4, y: 1, facing: "up", updatedAtMs: 10, heldItemId: "sword" } as const;

    expect(isSameTownPresence(a, b)).toBe(true);
    expect(isSameTownPresence(a, c)).toBe(false);
    expect(isSameTownPresence(a, d)).toBe(false);
  });

  it("parses valid presence payloads", () => {
    const parsed = parseTownPresencePayload({
      x: 1,
      y: 2,
      facing: "down",
      updatedAtMs: 55,
      heldItemId: "bow",
      headArmorItemId: "mythril_helm",
      bodyArmorItemId: "iron_armor",
      legArmorItemId: "scout_boots",
    });
    expect(parsed).toEqual({
      x: 1,
      y: 2,
      facing: "down",
      updatedAtMs: 55,
      heldItemId: "bow",
      headArmorItemId: "mythril_helm",
      bodyArmorItemId: "iron_armor",
      legArmorItemId: "scout_boots",
    });
  });

  it("rejects invalid presence payloads", () => {
    expect(parseTownPresencePayload(null)).toBeNull();
    expect(parseTownPresencePayload({ x: "1", y: 2, facing: "down", updatedAtMs: 2 })).toBeNull();
    expect(parseTownPresencePayload({ x: 1, y: 2, facing: "none", updatedAtMs: 2 })).toBeNull();
    expect(parseTownPresencePayload({ x: 1, y: 2, facing: "up", updatedAtMs: "2" })).toBeNull();
    expect(parseTownPresencePayload({ x: 1, y: 2, facing: "up", updatedAtMs: 2, heldItemId: "banana" })).toBeNull();
  });
});
