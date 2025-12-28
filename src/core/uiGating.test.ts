import { describe, expect, it } from "vitest";
import { canToggleInventory } from "./uiGating";

describe("uiGating", () => {
  it("disallows inventory toggle while dialog is open", () => {
    expect(canToggleInventory(true)).toBe(false);
    expect(canToggleInventory(false)).toBe(true);
  });
});


