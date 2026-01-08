import { describe, expect, it } from "vitest";
import { buildTownPresencePayload, isSameTownPresence, parseTownPresencePayload } from "./presence";

describe("town presence helpers", () => {
  it("builds a payload from player world coords", () => {
    const payload = buildTownPresencePayload({
      playerX: 96,
      playerY: 65,
      facing: "left",
      tileSize: 32,
      nowMs: 12345,
    });

    expect(payload).toEqual({ x: 3, y: 2, facing: "left", updatedAtMs: 12345 });
  });

  it("compares presence payloads ignoring timestamps", () => {
    const a = { x: 4, y: 1, facing: "up", updatedAtMs: 10 } as const;
    const b = { x: 4, y: 1, facing: "up", updatedAtMs: 999 } as const;
    const c = { x: 4, y: 2, facing: "up", updatedAtMs: 10 } as const;

    expect(isSameTownPresence(a, b)).toBe(true);
    expect(isSameTownPresence(a, c)).toBe(false);
  });

  it("parses valid presence payloads", () => {
    const parsed = parseTownPresencePayload({ x: 1, y: 2, facing: "down", updatedAtMs: 55 });
    expect(parsed).toEqual({ x: 1, y: 2, facing: "down", updatedAtMs: 55 });
  });

  it("rejects invalid presence payloads", () => {
    expect(parseTownPresencePayload(null)).toBeNull();
    expect(parseTownPresencePayload({ x: "1", y: 2, facing: "down", updatedAtMs: 2 })).toBeNull();
    expect(parseTownPresencePayload({ x: 1, y: 2, facing: "none", updatedAtMs: 2 })).toBeNull();
    expect(parseTownPresencePayload({ x: 1, y: 2, facing: "up", updatedAtMs: "2" })).toBeNull();
  });
});
