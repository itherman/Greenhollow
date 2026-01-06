import { expect, test, type JSHandle, type Page } from "@playwright/test";
import type { TestHarness, TestHarnessState } from "../../src/testing/testHarness";

const ELDER_TILE = { x: 13, y: 8 };
const SCREENSHOT_PATH = "playwright-artifacts/screenshots/wizard-dialog.png";

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

async function clickTile(
  page: Page,
  harness: HarnessHandle,
  tile: { x: number; y: number },
) {
  const screenPoint = await harness.evaluate((h, coords) => h.tileCenterToScreen(coords), tile);
  expect(screenPoint).not.toBeNull();
  await page.mouse.click(screenPoint!.x, screenPoint!.y);
}

async function waitForPlayerNearTile(page: Page, tile: { x: number; y: number }) {
  await page.waitForFunction(
    (coords) => {
      const state = window.__GREENHOLLOW_TEST_HOOKS__?.getState();
      if (!state?.player) return false;
      const targetX = (coords.x + 0.5) * 32;
      const targetY = (coords.y + 0.5) * 32;
      const dx = state.player.x - targetX;
      const dy = state.player.y - targetY;
      return Math.sqrt(dx * dx + dy * dy) < 20;
    },
    tile,
    { timeout: 20_000 },
  );
}

async function waitForDialogNode(page: Page, nodeId: string) {
  await page.waitForFunction(
    (id) => window.__GREENHOLLOW_TEST_HOOKS__?.getState()?.dialog?.nodeId === id,
    nodeId,
    { timeout: 10_000 },
  );
}

async function holdKey(page: Page, code: string, holdMs = 75) {
  // Phaser's `JustDown(...)` is frame-based; a fast synthetic "press" can be missed
  // if keydown+keyup happen between frames. Hold the key briefly to guarantee capture.
  await page.keyboard.down(code);
  await page.waitForTimeout(holdMs);
  await page.keyboard.up(code);
}

test.describe("Wizard dialog regression", () => {
  test("guest can talk to the elder using all dialog options", async ({ page }) => {
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

    // Movement/click-to-walk is intentionally not tested here (too flaky across browsers).
    // This regression test focuses on the dialog script/options.
    const teleported = await harness.evaluate((h, coords) => h.teleportToTileCenter(coords), ELDER_TILE);
    expect(teleported).toBe(true);
    // Open dialog via interact key (more reliable than pointer input in WebKit).
    await holdKey(page, "KeyE");

    await page.waitForFunction(
      () => window.__GREENHOLLOW_TEST_HOOKS__?.getState()?.dialog?.open === true,
      undefined,
      { timeout: 10_000 },
    );

    await waitForDialogNode(page, "n1");
    await holdKey(page, "KeyE");
    await waitForDialogNode(page, "n2");

    await holdKey(page, "Digit1");
    await waitForDialogNode(page, "n3");
    await holdKey(page, "KeyE");
    await waitForDialogNode(page, "n2");

    await holdKey(page, "Digit2");
    await waitForDialogNode(page, "n4");
    await holdKey(page, "KeyE");
    await waitForDialogNode(page, "n2");

    await holdKey(page, "Digit3");
    await waitForDialogNode(page, "end");
    await holdKey(page, "KeyE");

    await page.waitForFunction(
      () => window.__GREENHOLLOW_TEST_HOOKS__?.getState()?.dialog?.open === false,
      undefined,
      { timeout: 10_000 },
    );

    const finalState = await getHarnessState(harness);
    expect(finalState?.dialog?.open ?? false).toBe(false);
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
  });
});
