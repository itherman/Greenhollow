import { describe, expect, it } from "vitest";
import { normalizeUsername, usernameToSyntheticEmail, validateUsername } from "./username";

describe("username", () => {
  it("normalizes by trimming and lowercasing", () => {
    expect(normalizeUsername("  AbC_123  ")).toBe("abc_123");
  });

  it("validates a good username", () => {
    const r = validateUsername("Knight_01");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.normalized).toBe("knight_01");
  });

  it("rejects too short", () => {
    const r = validateUsername("ab");
    expect(r).toEqual({ ok: false, reason: "too_short" });
  });

  it("rejects too long", () => {
    const r = validateUsername("a".repeat(21));
    expect(r).toEqual({ ok: false, reason: "too_long" });
  });

  it("rejects if it does not start with a letter", () => {
    const r = validateUsername("1abc");
    expect(r).toEqual({ ok: false, reason: "must_start_with_letter" });
  });

  it("rejects invalid characters", () => {
    expect(validateUsername("ab-c")).toEqual({ ok: false, reason: "invalid_characters" });
    expect(validateUsername("ab c")).toEqual({ ok: false, reason: "invalid_characters" });
    expect(validateUsername("ab.c")).toEqual({ ok: false, reason: "invalid_characters" });
  });

  it("maps normalized username to synthetic email", () => {
    expect(usernameToSyntheticEmail("knight_01")).toBe("knight_01@game.local");
  });
});


