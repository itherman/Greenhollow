import { expect, test, type JSHandle, type Page } from "@playwright/test";
import type { TestHarness } from "../../src/testing/testHarness";

type HarnessHandle = JSHandle<TestHarness>;

async function getHarness(page: Page): Promise<HarnessHandle> {
  const handle = await page.waitForFunction(
    () => window.__GREENHOLLOW_TEST_HOOKS__ as TestHarness | undefined,
    { timeout: 20_000 },
  );
  return handle;
}

async function holdKey(page: Page, code: string, holdMs = 75) {
  await page.keyboard.down(code);
  await page.waitForTimeout(holdMs);
  await page.keyboard.up(code);
}

test.describe("Boat travel dialog", () => {
  test("does not list the current area and keeps the boat at the dock waterline", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /start/i }).click();
    await page.getByRole("button", { name: /continue as guest/i }).click();

    const harness = await getHarness(page);
    const restarted = await harness.evaluate((h) => h.restartInArea({ areaId: "river_village", entry: "fromBoat" }));
    expect(restarted).toBe(true);

    await page.waitForFunction(
      () => window.__GREENHOLLOW_TEST_HOOKS__?.getState()?.areaId === "river_village",
      undefined,
      { timeout: 20_000 },
    );

    await page.click("canvas");

    const boatTiles = await harness.evaluate((h) => h.getBoatAndSailorTiles());
    expect(boatTiles?.boat?.tileIndex).toBe(6);
    expect(boatTiles?.sailor?.tileIndex).toBe(6);

    const teleported = await harness.evaluate((h, coords) => h.teleportToTileCenter(coords), { x: 5, y: 10 });
    expect(teleported).toBe(true);
    await holdKey(page, "KeyE");

    await page.waitForFunction(
      () => window.__GREENHOLLOW_TEST_HOOKS__?.getState()?.dialog?.open === true,
      undefined,
      { timeout: 10_000 },
    );

    const choices = await harness.evaluate((h) => h.getDialogChoiceTexts());
    expect(choices.some((text) => text.includes("River Village"))).toBe(false);
    expect(choices.length).toBe(3);
  });
});
