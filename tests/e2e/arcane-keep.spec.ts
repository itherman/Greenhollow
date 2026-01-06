import { expect, test, type JSHandle, type Page } from "@playwright/test";
import type { TestHarness, TestHarnessState } from "../../src/testing/testHarness";

const CHEST_TILE = { x: 11, y: 12 };
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

    const harness = await getHarness(page);
    await page.click("canvas");

    const jumped = await harness.evaluate((h) => h.restartInArea({ areaId: "arcane_keep", entry: "fromShadowForest" }));
    expect(jumped).toBe(true);
    await waitForArea(page, "arcane_keep");

    // First visit: loot the chest.
    const firstTp = await harness.evaluate((h, tile) => h.teleportToTileCenter(tile), CHEST_TILE);
    expect(firstTp).toBe(true);
    await page.click("canvas");
    await page.waitForTimeout(300);
    await page.waitForTimeout(100);
    await holdKey(page, "KeyE");
    await waitForDialogScript(page, "arcaneChest");
    await holdKey(page, "KeyE");
    await waitForDialogClosed(page);

    // Re-enter the area to verify the chest refills.
    const secondJump = await harness.evaluate((h) => h.restartInArea({ areaId: "arcane_keep", entry: "fromShadowForest" }));
    expect(secondJump).toBe(true);
    await waitForArea(page, "arcane_keep");
    const secondTp = await harness.evaluate((h, tile) => h.teleportToTileCenter(tile), CHEST_TILE);
    expect(secondTp).toBe(true);
    await page.click("canvas");
    await page.waitForTimeout(300);
    await page.waitForTimeout(100);
    await holdKey(page, "KeyE");
    await waitForDialogScript(page, "arcaneChest");
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
  });
});
