import { expect, test, type JSHandle, type Page } from "@playwright/test";
import type { TestHarness, TestHarnessState } from "../../src/testing/testHarness";

const CHEST_TILE = { x: 12, y: 12 };
const SCREENSHOT_PATH = "playwright-artifacts/screenshots/arcane-keep-chest.png";

type HarnessHandle = JSHandle<TestHarness>;

async function getHarness(page: Page): Promise<HarnessHandle> {
  const handle = await page.waitForFunction(
    () => window.__GREENHOLLOW_TEST_HOOKS__ as TestHarness | undefined,
    { timeout: 20_000 },
  );
  return handle;
}

async function getHarnessState(harness: HarnessHandle): Promise<TestHarnessState | null> {
  return harness.evaluate((h) => h.getState());
}

async function waitForArea(page: Page, areaId: string) {
  await page.waitForFunction(
    (id) => window.__GREENHOLLOW_TEST_HOOKS__?.getState()?.areaId === id,
    areaId,
    { timeout: 20_000 },
  );
}

async function waitForPlayerReady(page: Page) {
  await page.waitForFunction(
    () => {
      const state = window.__GREENHOLLOW_TEST_HOOKS__?.getState();
      return !!state?.player;
    },
    undefined,
    { timeout: 20_000 },
  );
}

async function holdKey(page: Page, code: string, holdMs = 75) {
  await page.keyboard.down(code);
  await page.waitForTimeout(holdMs);
  await page.keyboard.up(code);
}

async function waitForDialogScript(page: Page, scriptId: string) {
  await page.waitForFunction(
    (id) => window.__GREENHOLLOW_TEST_HOOKS__?.getState()?.dialog?.scriptId === id,
    scriptId,
    { timeout: 15_000 },
  );
}

async function waitForDialogClosed(page: Page) {
  await page.waitForFunction(
    () => window.__GREENHOLLOW_TEST_HOOKS__?.getState()?.dialog?.open === false,
    undefined,
    { timeout: 10_000 },
  );
}

test.describe("Arcane Keep", () => {
  test("castle chest refills every visit", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /start/i }).click();
    await page.getByRole("button", { name: /continue as guest/i }).click();
    await waitForArea(page, "village");
    await waitForPlayerReady(page);

    const harness = await getHarness(page);
    await page.click("canvas");

    const jumped = await harness.evaluate((h) => h.restartInArea({ areaId: "arcane_keep", entry: "fromShadowForest" }));
    expect(jumped).toBe(true);
    await waitForArea(page, "arcane_keep");
    await waitForPlayerReady(page);

    // First visit: loot the chest.
    const firstTp = await harness.evaluate((h, tile) => h.teleportToTileCenter(tile), CHEST_TILE);
    expect(firstTp).toBe(true);
    await page.click("canvas");
    await page.waitForTimeout(150);
    const firstChest = await harness.evaluate((h, tile) => h.interactWithChest(tile), CHEST_TILE);
    expect(firstChest).toBe(true);
    await waitForDialogScript(page, "arcaneChest");
    await holdKey(page, "KeyE");
    await waitForDialogClosed(page);

    // Leave and return to verify the chest refills on a fresh load.
    const resetJump = await harness.evaluate((h) => h.restartInArea({ areaId: "shadow_forest", entry: "fromArcaneKeep" }));
    expect(resetJump).toBe(true);
    await waitForArea(page, "shadow_forest");

    const secondJump = await harness.evaluate((h) => h.restartInArea({ areaId: "arcane_keep", entry: "fromShadowForest" }));
    expect(secondJump).toBe(true);
    await waitForArea(page, "arcane_keep");
    await waitForPlayerReady(page);
    const secondTp = await harness.evaluate((h, tile) => h.teleportToTileCenter(tile), CHEST_TILE);
    expect(secondTp).toBe(true);
    await page.click("canvas");
    await page.waitForTimeout(150);
    const secondChest = await harness.evaluate((h, tile) => h.interactWithChest(tile), CHEST_TILE);
    expect(secondChest).toBe(true);
    await waitForDialogScript(page, "arcaneChest");
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
  });

  test("players can fire the bow inside the keep", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /start/i }).click();
    await page.getByRole("button", { name: /continue as guest/i }).click();
    await waitForArea(page, "village");
    await waitForPlayerReady(page);

    const harness = await getHarness(page);
    await page.click("canvas");

    const jumped = await harness.evaluate((h) => h.restartInArea({ areaId: "arcane_keep", entry: "fromShadowForest" }));
    expect(jumped).toBe(true);
    await waitForArea(page, "arcane_keep");
    await waitForPlayerReady(page);

    const prepared = await harness.evaluate((h) => h.prepareBow(5));
    expect(prepared).toBe(true);

    const equip = await harness.evaluate((h) => h.getEquipment());
    expect(equip?.heldItemId).toBe("bow");
    const arrowsBefore = await harness.evaluate((h) => h.getInventoryCount("arrows"));
    expect(arrowsBefore).toBeGreaterThan(0);

    const moved = await harness.evaluate((h) => h.teleportToTileCenter({ x: 8, y: 12 }));
    expect(moved).toBe(true);
    await page.click("canvas");
    const fired = await harness.evaluate((h) => h.shootBowOnce());
    expect(fired).toBe(true);
    await page.waitForTimeout(200);
    const arrowsAfter = await harness.evaluate((h) => h.getInventoryCount("arrows"));
    expect(arrowsAfter).toBeLessThan(arrowsBefore);
  });
});
