import { describe, expect, it } from "vitest";
import { needsPouchUiRebuild, shouldAllowPlayerTapInventory } from "./pouchUi";

describe("pouch UI helpers", () => {
  it("requests rebuild when refs are missing or inactive", () => {
    expect(needsPouchUiRebuild(undefined, undefined)).toBe(true);
    expect(needsPouchUiRebuild({ active: true }, undefined)).toBe(true);
    expect(needsPouchUiRebuild(undefined, { active: true })).toBe(true);
    expect(needsPouchUiRebuild({ active: false }, { active: true })).toBe(true);
    expect(needsPouchUiRebuild({ active: true }, { active: false })).toBe(true);
  });

  it("does not rebuild when both refs are active", () => {
    expect(needsPouchUiRebuild({ active: true }, { active: true })).toBe(false);
  });

  it("disallows player self-tap inventory toggle", () => {
    expect(shouldAllowPlayerTapInventory()).toBe(false);
  });
});


