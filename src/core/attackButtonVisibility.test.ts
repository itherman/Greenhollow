import { describe, expect, it } from "vitest";
import { shouldShowAttackButton } from "./attackButtonVisibility";

describe("attackButtonVisibility", () => {
  it("requires a sword", () => {
    expect(
      shouldShowAttackButton({
        screenW: 812,
        screenH: 375,
        hasTouch: true,
        enemyNearby: true,
        hasWeapon: false,
      }),
    ).toBe(false);
  });

  it("requires an enemy nearby", () => {
    expect(
      shouldShowAttackButton({
        screenW: 812,
        screenH: 375,
        hasTouch: true,
        enemyNearby: false,
        hasWeapon: true,
      }),
    ).toBe(false);
  });

  it("shows on touch-sized viewports when sword + enemy nearby", () => {
    expect(
      shouldShowAttackButton({
        screenW: 812,
        screenH: 375,
        hasTouch: true,
        enemyNearby: true,
        hasWeapon: true,
      }),
    ).toBe(true);
  });
});


