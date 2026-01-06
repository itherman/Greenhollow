import { expect, test, type JSHandle, type Page } from "@playwright/test";
import type { TestHarness } from "../../src/testing/testHarness";

const SCREENSHOT_PATH = "playwright-artifacts/screenshots/troll-clearing-exit.png";
const CLEARING_EXIT_TILE = { x: 2, y: 13 };

type HarnessHandle = JSHandle<TestHarness>;

async function getHarness(page: Page): Promise<HarnessHandle> {
  const handle = await page.waitForFunction(
    () => window.__GREENHOLLOW_TEST_HOOKS__ as TestHarness | undefined,
    { timeout: 20_000 },
  );
  return handle;
}

test.describe("Troll clearing return path", () => {
  test("exit back to the bridge sits on the entry-side path", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /start/i }).click();
    await page.getByRole("button", { name: /continue as guest/i }).click();

    await page.waitForFunction(
      () => window.__GREENHOLLOW_TEST_HOOKS__?.getState()?.areaId === "village",
      undefined,
      { timeout: 20_000 },
    );

    const harness = await getHarness(page);
    await page.click("canvas");

    const restarted = await harness.evaluate((h) => h.restartInArea({ areaId: "troll_clearing", entry: "fromTrollBridge" }));
    expect(restarted).toBe(true);

    await page.waitForFunction(
      () => window.__GREENHOLLOW_TEST_HOOKS__?.getState()?.areaId === "troll_clearing",
      undefined,
      { timeout: 20_000 },
    );

    // Teleport onto the bottom-left return exit to ensure it links back to the bridge.
    await harness.evaluate((h, tile) => h.teleportToTileCenter(tile), { x: CLEARING_EXIT_TILE.x, y: CLEARING_EXIT_TILE.y - 1 });
    await harness.evaluate((h, tile) => h.teleportToTileCenter(tile), CLEARING_EXIT_TILE);

    await page.waitForFunction(
      () => window.__GREENHOLLOW_TEST_HOOKS__?.getState()?.areaId === "troll_bridge",
      undefined,
      { timeout: 10_000 },
    );

    const finalState = await harness.evaluate((h) => h.getState());
    expect(finalState?.areaId).toBe("troll_bridge");

    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
  });
});
