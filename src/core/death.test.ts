import { describe, expect, it } from "vitest";
import { computeDeathTransition } from "./death";

describe("death", () => {
  it("fires justDied exactly once when hp crosses to <= 0", () => {
    expect(computeDeathTransition({ hp: 1, wasDead: false })).toEqual({ dead: false, justDied: false });
    expect(computeDeathTransition({ hp: 0, wasDead: false })).toEqual({ dead: true, justDied: true });
    expect(computeDeathTransition({ hp: 0, wasDead: true })).toEqual({ dead: true, justDied: false });
  });
});


