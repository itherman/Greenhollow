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

    await clickTile(page, harness, ELDER_TILE);
    await waitForPlayerNearTile(page, ELDER_TILE);
    await clickTile(page, harness, ELDER_TILE);

    await page.waitForFunction(
      () => window.__GREENHOLLOW_TEST_HOOKS__?.getState()?.dialog?.open === true,
      undefined,
      { timeout: 10_000 },
    );

    await waitForDialogNode(page, "n1");
    await page.keyboard.press("KeyE");
    await waitForDialogNode(page, "n2");

    await page.keyboard.press("Digit1");
    await waitForDialogNode(page, "n3");
    await page.keyboard.press("KeyE");
    await waitForDialogNode(page, "n2");

    await page.keyboard.press("Digit2");
    await waitForDialogNode(page, "n4");
    await page.keyboard.press("KeyE");
    await waitForDialogNode(page, "n2");

    await page.keyboard.press("Digit3");
    await waitForDialogNode(page, "end");
    await page.keyboard.press("KeyE");

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
